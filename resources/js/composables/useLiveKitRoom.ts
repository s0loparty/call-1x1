import * as roomRoutes from '@/routes/rooms';
import type { Room } from '@/types';
import { router } from '@inertiajs/vue3';
import axios from 'axios';
import {
	createLocalVideoTrack,
	Room as LivekitRoom,
	LocalParticipant,
	LocalVideoTrack,
	Participant,
	RemoteParticipant,
	RemoteTrack,
	RemoteTrackPublication,
	RoomEvent,
	Track,
	TrackPublication,
} from 'livekit-client';
import { markRaw, readonly, ref, Ref } from 'vue';
import { toast } from 'vue-sonner';

// --- Module-level state (Singleton Pattern) ---
const livekitRoom: Ref<LivekitRoom | null> = ref(null);
const participants: Ref<RemoteParticipant[]> = ref([]);
const localParticipant: Ref<LocalParticipant | null> = ref(null);
const localVideoTrack: Ref<LocalVideoTrack | null> = ref(null);
const isMicMuted = ref(true);
const isCameraOff = ref(true);
const connecting = ref(true);
const errorMessage = ref('');
const remoteTrackMutedStatus: Ref<Record<string, Record<string, boolean>>> =
	ref({});
const audioDevices = ref<MediaDeviceInfo[]>([]);
const videoDevices = ref<MediaDeviceInfo[]>([]);
const selectedAudioDeviceId = ref<string>('');
const selectedVideoDeviceId = ref<string>('');
const lobbyVideoTrack = ref<LocalVideoTrack | null>(null);
const isLobbyInitialized = ref(false);
const remoteParticipantUpdateCounter = ref(0);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let isListenerInitialized = false;

// --- The Composable ---
export function useLiveKitRoom() {
	async function _cleanup() {
		if (livekitRoom.value) {
			await livekitRoom.value.disconnect();
		}
		livekitRoom.value = null;
		participants.value = [];
		localParticipant.value = null;
		localVideoTrack.value = null;
		isMicMuted.value = true;
		isCameraOff.value = true;
		connecting.value = true;
		errorMessage.value = '';
		remoteTrackMutedStatus.value = {};
		audioDevices.value = [];
		videoDevices.value = [];
		selectedAudioDeviceId.value = '';
		selectedVideoDeviceId.value = '';
		if (lobbyVideoTrack.value) {
			lobbyVideoTrack.value.stop();
			lobbyVideoTrack.value = null;
		}
		isLobbyInitialized.value = false;
		remoteParticipantUpdateCounter.value = 0;
		isListenerInitialized = false;
	}

	// --- LiveKit Event Handlers ---
	function handleParticipantConnected(participant: RemoteParticipant) {
		console.log(`[LiveKit] Participant connected: ${participant.identity}`);
		participants.value.push(markRaw(participant));

		// Initialize remoteTrackMutedStatus for newly connected participant
		if (!remoteTrackMutedStatus.value[participant.identity]) {
			remoteTrackMutedStatus.value[participant.identity] = {};
		}
		participant.trackPublications.forEach((publication) => {
			if (
				publication.kind === Track.Kind.Video ||
				publication.kind === Track.Kind.Audio
			) {
				remoteTrackMutedStatus.value[participant.identity][
					publication.trackSid
				] = publication.isMuted;
			}
		});
	}

	function handleParticipantDisconnected(participant: RemoteParticipant) {
		console.log(`[LiveKit] Participant disconnected: ${participant.identity}`);
		participants.value = participants.value.filter(
			(p) => p.identity !== participant.identity,
		);
	}

	function handleDisconnected() {
		console.log('[LiveKit] Disconnected from room.');
		toast.info('Вы отключились', {
			description: 'Вы покинули комнату или потеряли соединение.',
			duration: 8000,
		});
		_cleanup();
		router.visit(roomRoutes.index().url);
	}

	function handleMediaDevicesError(error: Error) {
		console.error('[LiveKit] Media device error:', error);
		if (error.name === 'NotAllowedError') {
			toast.error('Доступ к медиа запрещен', {
				description:
					'Пожалуйста, разрешите доступ к камере и микрофону в настройках вашего браузера.',
				duration: 8000,
			});
		} else {
			toast.error('Ошибка медиа-устройства', {
				description: 'Возникла проблема с вашей камерой или микрофоном.',
				duration: 8000,
			});
		}
	}

	function handleLocalTrackPublished(publication: TrackPublication) {
		if (publication.kind === Track.Kind.Video && publication.track) {
			localVideoTrack.value = markRaw(publication.track as LocalVideoTrack);
			isCameraOff.value = false;
		}
		if (publication.kind === Track.Kind.Audio) {
			isMicMuted.value = publication.isMuted;
		}
	}

	function handleLocalTrackUnpublished(publication: TrackPublication) {
		if (publication.kind === Track.Kind.Video) {
			localVideoTrack.value = null;
			isCameraOff.value = true;
		}
		if (publication.kind === Track.Kind.Audio) {
			isMicMuted.value = true;
		}
	}

	function handleTrackMuted(
		publication: TrackPublication,
		participant: Participant,
	) {
		if (
			participant instanceof RemoteParticipant &&
			remoteTrackMutedStatus.value[participant.identity]
		) {
			remoteTrackMutedStatus.value[participant.identity][publication.trackSid] =
				true;
		}
	}

	function handleTrackUnmuted(
		publication: TrackPublication,
		participant: Participant,
	) {
		if (
			participant instanceof RemoteParticipant &&
			remoteTrackMutedStatus.value[participant.identity]
		) {
			remoteTrackMutedStatus.value[participant.identity][publication.trackSid] =
				false;
		}
	}

	function handleRemoteTrackPublished(
		publication: TrackPublication,
		participant: RemoteParticipant,
	) {
		if (!remoteTrackMutedStatus.value[participant.identity]) {
			remoteTrackMutedStatus.value[participant.identity] = {};
		}
		if (
			publication.kind === Track.Kind.Video ||
			publication.kind === Track.Kind.Audio
		) {
			remoteTrackMutedStatus.value[participant.identity][publication.trackSid] =
				publication.isMuted;
		}
	}

	function handleTrackSubscribed(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		track: RemoteTrack,
		publication: RemoteTrackPublication,
		participant: RemoteParticipant,
	) {
		console.log(
			`[LiveKit] Track subscribed: ${publication.trackSid} for participant ${participant.identity}`,
		);
		remoteParticipantUpdateCounter.value++;
	}

	async function updateLobbyVideoTrack(deviceId: string) {
		if (lobbyVideoTrack.value) {
			lobbyVideoTrack.value.stop();
		}
		try {
			const track = await createLocalVideoTrack({
				deviceId,
			});
			lobbyVideoTrack.value = markRaw(track);
		} catch (e) {
			console.error('Failed to create lobby video track', e);
			const error = e as Error;
			if (
				error.name === 'NotAllowedError' ||
				error.name === 'PermissionDeniedError'
			) {
				toast.error('Доступ к камере запрещен', {
					description:
						'Пожалуйста, разрешите доступ в настройках вашего браузера.',
					duration: 8000,
				});
			} else {
				toast.error('Ошибка камеры', {
					description: 'Не удалось получить доступ к выбранной камере.',
					duration: 8000,
				});
			}
		}
	}

	function setSelectedAudioDeviceId(deviceId: string) {
		selectedAudioDeviceId.value = deviceId;
	}

	function setSelectedVideoDeviceId(deviceId: string) {
		selectedVideoDeviceId.value = deviceId;
		updateLobbyVideoTrack(deviceId);
	}

	async function initLobby() {
		// Cleanup previous state in case we are re-initializing
		if (lobbyVideoTrack.value) {
			lobbyVideoTrack.value.stop();
		}
		isLobbyInitialized.value = false;

		try {
			// Request permissions to get device labels
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: true,
			});
			// Stop tracks immediately, we only needed them for permission
			stream.getTracks().forEach((track) => track.stop());

			const devices = await navigator.mediaDevices.enumerateDevices();
			audioDevices.value = devices.filter((d) => d.kind === 'audioinput');
			videoDevices.value = devices.filter((d) => d.kind === 'videoinput');

			if (audioDevices.value.length > 0) {
				selectedAudioDeviceId.value = audioDevices.value[0].deviceId;
			}
			if (videoDevices.value.length > 0) {
				const deviceId = videoDevices.value[0].deviceId;
				selectedVideoDeviceId.value = deviceId;
				await updateLobbyVideoTrack(deviceId);
			}
		} catch (e) {
			console.error('Failed to initialize lobby', e);
			const error = e as Error;

			if (
				error.name === 'NotAllowedError' ||
				error.name === 'PermissionDeniedError'
			) {
				toast.error('Доступ к медиа запрещен', {
					description:
						'Пожалуйста, разрешите доступ к камере и микрофону в настройках вашего браузера.',
					duration: 8000,
				});
			} else {
				toast.error('Медиа-устройства не найдены', {
					description:
						'Не удалось найти камеру или микрофон на вашем устройстве.',
					duration: 8000,
				});
			}
		} finally {
			isLobbyInitialized.value = true;
		}
	}

	async function setupLocalMedia() {
		if (!localParticipant.value) return;

		try {
			// Publish selected devices
			if (selectedVideoDeviceId.value) {
				await localParticipant.value.setCameraEnabled(true, {
					deviceId: selectedVideoDeviceId.value,
				});
			}
			if (selectedAudioDeviceId.value) {
				await localParticipant.value.setMicrophoneEnabled(false, {
					deviceId: selectedAudioDeviceId.value,
				});
			}
		} catch (error) {
			// This will now mostly catch permission errors, as we've already checked for device existence.
			console.error(
				'[LiveKit] Failed to get media devices (likely permission error).',
				error,
			);
			if (error instanceof Error) {
				handleMediaDevicesError(error);
			}
			isCameraOff.value = true;
			isMicMuted.value = true;
		}
	}

	async function connect(roomData: Room, password = '') {
		// Stop lobby track before connecting
		if (lobbyVideoTrack.value) {
			lobbyVideoTrack.value.stop();
			lobbyVideoTrack.value = null;
		}

		await _cleanup();

		connecting.value = true;
		errorMessage.value = '';

		try {
			const tokenResponse = await axios.post(
				roomRoutes.join(roomData.slug).url,
				roomData.is_private ? { password } : {},
			);

			const { token, livekit_host } = tokenResponse.data;

			if (!token || !livekit_host) {
				throw new Error('Не удалось получить токен LiveKit или хост.');
			}

			const url = new URL(livekit_host);
			const wsUrl = `${url.protocol === 'https:' ? 'wss' : 'ws'}://${url.host}`;

			const room = markRaw(new LivekitRoom());

			room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
			room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
			room.on(RoomEvent.Disconnected, handleDisconnected);
			room.on(RoomEvent.MediaDevicesError, handleMediaDevicesError);
			room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
			room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
			room.on(RoomEvent.TrackMuted, handleTrackMuted);
			room.on(RoomEvent.TrackUnmuted, handleTrackUnmuted);
			room.on(RoomEvent.TrackPublished, handleRemoteTrackPublished);
			room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

			await room.connect(wsUrl, token);
			console.log(`[LiveKit] Connected to room: ${room.name}`);
			livekitRoom.value = room;
			localParticipant.value = markRaw(room.localParticipant);

			// Initialize remoteTrackMutedStatus for already connected participants
			room.remoteParticipants.forEach((participant) => {
				if (!remoteTrackMutedStatus.value[participant.identity]) {
					remoteTrackMutedStatus.value[participant.identity] = {};
				}
				participant.trackPublications.forEach((publication) => {
					if (
						publication.kind === Track.Kind.Video ||
						publication.kind === Track.Kind.Audio
					) {
						remoteTrackMutedStatus.value[participant.identity][
							publication.trackSid
						] = publication.isMuted;
					}
				});
			});

			await setupLocalMedia();

			participants.value = Array.from(room.remoteParticipants.values()).map(
				(p) => markRaw(p),
			);
		} catch (e: any) {
			console.error('[LiveKit] Connection failed:', e);
			if (e.response && e.response.status === 403) {
				errorMessage.value = 'Неверный пароль или доступ запрещен.';
				toast.error('Доступ запрещен', {
					description: errorMessage.value,
					duration: 8000,
				});
			} else {
				errorMessage.value = `Ошибка подключения: ${e.message || e.toString()}`;
				toast.error('Ошибка', {
					description: errorMessage.value,
					duration: 8000,
				});
			}
			_cleanup();
		} finally {
			connecting.value = false;
		}
	}

	async function toggleMicrophone() {
		if (!localParticipant.value) return;
		const enabled = localParticipant.value.isMicrophoneEnabled;
		await localParticipant.value.setMicrophoneEnabled(!enabled);
		isMicMuted.value = !localParticipant.value.isMicrophoneEnabled;
	}

	async function toggleCamera() {
		if (!localParticipant.value) return;
		const enabled = localParticipant.value.isCameraEnabled;
		await localParticipant.value.setCameraEnabled(!enabled);
		isCameraOff.value = !localParticipant.value.isCameraEnabled;
	}

	async function disconnect() {
		await _cleanup();
	}

	return {
		// State
		participants: readonly(participants),
		localParticipant: readonly(localParticipant),
		localVideoTrack: readonly(localVideoTrack),
		isMicMuted,
		isCameraOff,
		connecting: readonly(connecting),
		errorMessage: readonly(errorMessage),
		remoteTrackMutedStatus: readonly(remoteTrackMutedStatus),
		audioDevices: readonly(audioDevices),
		videoDevices: readonly(videoDevices),
		selectedAudioDeviceId,
		selectedVideoDeviceId,
		lobbyVideoTrack: readonly(lobbyVideoTrack),
		isLobbyInitialized: readonly(isLobbyInitialized),
		remoteParticipantUpdateCounter: readonly(remoteParticipantUpdateCounter),

		// Actions
		connect,
		disconnect,
		toggleMicrophone,
		toggleCamera,
		initLobby,
		setSelectedAudioDeviceId,
		setSelectedVideoDeviceId,
	};
}
