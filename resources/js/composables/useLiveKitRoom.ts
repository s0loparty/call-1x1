import * as roomRoutes from '@/routes/rooms';
import type { Room } from '@/types';
import { router } from '@inertiajs/vue3';
import axios from 'axios';
import type { VideoCaptureOptions } from 'livekit-client';
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
import { markRaw, onUnmounted, readonly, ref, Ref } from 'vue';
import { toast } from 'vue-sonner';
import userConnectedSound from '../../assets/room_user_connected.mp3';
import userDisconnectedSound from '../../assets/room_user_disconnected.mp3';

function playSound(soundUrl: string) {
	const audio = new Audio(soundUrl);
	audio.play().catch((e) => console.error('Failed to play sound:', e));
}

// --- Module-level state (Singleton Pattern) ---
const livekitRoom: Ref<LivekitRoom | null> = ref(null);
const participants: Ref<RemoteParticipant[]> = ref([]);
const localParticipant: Ref<LocalParticipant | null> = ref(null);
const localVideoTrack: Ref<LocalVideoTrack | null> = ref(null);
const isMicMuted = ref(true);
const isCameraOff = ref(true);
const isScreenSharing = ref(false); // New state for screen sharing
const connecting = ref(true);
const errorMessage = ref('');
const remoteTrackMutedStatus: Ref<Record<string, Record<string, boolean>>> =
	ref({});
const audioDevices = ref<MediaDeviceInfo[]>([]);
const videoDevices = ref<MediaDeviceInfo[]>([]);
const selectedAudioDeviceId: Ref<string | undefined> = ref();
const selectedVideoDeviceId: Ref<string | undefined> = ref();
const lobbyVideoTrack = ref<LocalVideoTrack | null>(null);
const isLobbyInitialized = ref(false);
const remoteParticipantUpdateCounter = ref(0);

let deviceListenerInitialized = false;
if (typeof window !== 'undefined' && !deviceListenerInitialized) {
	navigator.mediaDevices.addEventListener('devicechange', async () => {
		const devices = await navigator.mediaDevices.enumerateDevices();
		audioDevices.value = devices.filter((d) => d.kind === 'audioinput');
		videoDevices.value = devices.filter((d) => d.kind === 'videoinput');
	});
	deviceListenerInitialized = true;
}

// --- The Composable ---
export function useLiveKitRoom() {
	async function _cleanupRoom() {
		if (livekitRoom.value) {
			await livekitRoom.value.disconnect();
		}
		livekitRoom.value = null;
		participants.value = [];
		localParticipant.value = null;
		localVideoTrack.value = null;
		isMicMuted.value = true;
		isCameraOff.value = true;
		isScreenSharing.value = false;
		remoteTrackMutedStatus.value = {};
		remoteParticipantUpdateCounter.value = 0;
	}

	async function _cleanupAll() {
		await _cleanupRoom();

		audioDevices.value = [];
		videoDevices.value = [];
		selectedAudioDeviceId.value = undefined;
		selectedVideoDeviceId.value = undefined;
		isLobbyInitialized.value = false;

		if (lobbyVideoTrack.value) {
			lobbyVideoTrack.value.stop();
			lobbyVideoTrack.value = null;
		}
	}

	// --- LiveKit Event Handlers ---
	function handleParticipantConnected(participant: RemoteParticipant) {
		console.log(`[LiveKit] Participant connected: ${participant.identity}`);
		participants.value.push(markRaw(participant));
		playSound(userConnectedSound);

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
		playSound(userDisconnectedSound);
	}

	function handleDisconnected() {
		console.log('[LiveKit] Disconnected from room.');
		toast.info('Вы отключились', {
			description: 'Вы покинули комнату или потеряли соединение.',
			duration: 8000,
		});
		_cleanupRoom();
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
		if (publication.kind === Track.Kind.Video) {
			if (publication.source === Track.Source.Camera) {
				localVideoTrack.value = markRaw(publication.track as LocalVideoTrack);
				isCameraOff.value = false;
			} else if (publication.source === Track.Source.ScreenShare) {
				isScreenSharing.value = true;
			}
		}
		if (publication.kind === Track.Kind.Audio) {
			isMicMuted.value = publication.isMuted;
		}
	}

	function handleLocalTrackUnpublished(publication: TrackPublication) {
		if (publication.kind === Track.Kind.Video) {
			if (publication.source === Track.Source.Camera) {
				localVideoTrack.value = null;
				isCameraOff.value = true;
			} else if (publication.source === Track.Source.ScreenShare) {
				isScreenSharing.value = false;
			}
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
		_track: RemoteTrack,
		publication: RemoteTrackPublication,
		participant: RemoteParticipant,
	) {
		console.log(
			`[LiveKit] Track subscribed: ${publication.trackSid} for participant ${participant.identity}`,
		);
		remoteParticipantUpdateCounter.value++;
	}

	async function updateLobbyVideoTrack(deviceId?: string) {
		if (lobbyVideoTrack.value) {
			lobbyVideoTrack.value.stop();
		}

		try {
			const options: VideoCaptureOptions = {};

			if (deviceId && deviceId !== '') {
				options.deviceId = deviceId;
			}

			const track = await createLocalVideoTrack(options);
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
			let hasAudioPermission = false;
			let hasVideoPermission = false;

			try {
				const audioStream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});
				audioStream.getTracks().forEach((t) => t.stop());
				hasAudioPermission = true;
			} catch {
				toast.error('Микрофон недоступен или доступ запрещён', {
					duration: 8000,
				});
			}

			try {
				const videoStream = await navigator.mediaDevices.getUserMedia({
					video: true,
				});
				videoStream.getTracks().forEach((t) => t.stop());
				hasVideoPermission = true;
			} catch {
				toast.error('Камера недоступна или доступ запрещён', {
					duration: 8000,
				});
			}

			const devices = await navigator.mediaDevices.enumerateDevices();
			console.log('devices', devices);

			audioDevices.value = devices.filter(
				(d) => d.kind === 'audioinput' && d.deviceId.length,
			);
			videoDevices.value = devices.filter(
				(d) => d.kind === 'videoinput' && d.deviceId.length,
			);

			if (hasAudioPermission && audioDevices.value.length > 0) {
				const device = audioDevices.value[0];
				if (device && device.deviceId.length > 0) {
					selectedAudioDeviceId.value = device.deviceId;
				} else {
					selectedAudioDeviceId.value = undefined;
				}
			} else {
				selectedAudioDeviceId.value = undefined;
			}

			if (hasVideoPermission && videoDevices.value.length > 0) {
				const device = videoDevices.value[0];

				if (device && device.deviceId.length > 0) {
					selectedVideoDeviceId.value = device?.deviceId;
					await updateLobbyVideoTrack(device?.deviceId);
				} else {
					selectedVideoDeviceId.value = undefined;
				}
			} else {
				selectedVideoDeviceId.value = undefined;
			}

			if (!hasAudioPermission && !hasVideoPermission) {
				toast.error(
					'Камера и микрофон недоступны. Вы можете войти в комнату только для просмотра.',
					{ duration: 8000 },
				);
			}
		} finally {
			isLobbyInitialized.value = true;
		}
	}

	async function setupLocalMedia() {
		if (!localParticipant.value) return;

		if (selectedVideoDeviceId.value) {
			await localParticipant.value.setCameraEnabled(false, {
				deviceId: selectedVideoDeviceId.value,
			});
		} else {
			await localParticipant.value.setCameraEnabled(false);
		}

		if (selectedAudioDeviceId.value) {
			await localParticipant.value.setMicrophoneEnabled(true, {
				deviceId: selectedAudioDeviceId.value,
			});
		} else {
			await localParticipant.value.setMicrophoneEnabled(false);
		}
	}

	async function connect(roomData: Room, password = '') {
		// Stop lobby track before connecting
		if (lobbyVideoTrack.value) {
			lobbyVideoTrack.value.stop();
			lobbyVideoTrack.value = null;
		}

		await _cleanupRoom();

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

			// Construct WebSocket URL safely
			let host = livekit_host;
			if (!host.startsWith('http://') && !host.startsWith('https://')) {
				host = `https://${host}`;
			}
			const url = new URL(host);
			const wsUrl = `${url.protocol === 'https:' ? 'wss' : 'ws'}://${url.host}${
				url.pathname
			}`;

			console.log('livekit room url', url);
			console.log('livekit room  wsUrl', wsUrl);

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
			_cleanupRoom();
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

	async function toggleScreenShare() {
		if (!localParticipant.value) return;

		const enabled = localParticipant.value.isScreenShareEnabled;
		if (enabled) {
			await localParticipant.value.setScreenShareEnabled(false);
		} else {
			const { ScreenSharePresets } = await import('livekit-client');
			await localParticipant.value.setScreenShareEnabled(true, {
				resolution: ScreenSharePresets.h1080fps30,
			});
		}
		isScreenSharing.value = localParticipant.value.isScreenShareEnabled;
	}

	async function disconnect() {
		await _cleanupAll();
	}

	onUnmounted(() => {
		if (lobbyVideoTrack.value) {
			lobbyVideoTrack.value.stop();
			lobbyVideoTrack.value = null;
		}
	});

	return {
		// State
		participants: readonly(participants),
		localParticipant: readonly(localParticipant),
		localVideoTrack: readonly(localVideoTrack),
		isMicMuted,
		isCameraOff,
		isScreenSharing, // new
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
		toggleScreenShare, // new
		initLobby,
		setSelectedAudioDeviceId,
		setSelectedVideoDeviceId,
	};
}
