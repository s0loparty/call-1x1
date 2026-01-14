import { playUserConnectedSound, playUserDisconnectedSound } from '@/lib/audio';
import {
	ConnectionState,
	LocalParticipant,
	LocalTrackPublication,
	Participant,
	RemoteParticipant,
	RemoteTrackPublication,
	Room,
	RoomEvent,
	Track,
	TrackPublication,
} from 'livekit-client';
import { onUnmounted, ref, shallowRef } from 'vue';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useLiveKit(token: string, host: string, _roomName: string) {
	const room = shallowRef<Room | null>(null);
	const localParticipant = shallowRef<LocalParticipant | null>(null);
	const remoteParticipants = ref<RemoteParticipant[]>([]);
	const isConnected = ref(false);
	const error = ref<Error | null>(null);
	const layoutReevaluator = ref(0);

	const screenShareParticipant = shallowRef<Participant | null>(null);
	const screenShareTrack = shallowRef<TrackPublication | null>(null);
	const screenShareAudioTrack = shallowRef<TrackPublication | null>(null);

	// --- State for controls ---
	const isCameraEnabled = ref(false);
	const isMicrophoneEnabled = ref(false);
	const isScreenShareEnabled = ref(false);

	const cleanup = () => {
		if (room.value) {
			room.value.disconnect();
			room.value.removeAllListeners();
		}
		room.value = null;
		localParticipant.value = null;
		remoteParticipants.value = [];
		isConnected.value = false;
	};

	const handleConnectionState = (state: ConnectionState) => {
		isConnected.value = state === ConnectionState.Connected;
		if (state === ConnectionState.Connected) {
			localParticipant.value = room.value!.localParticipant;
		}
	};

	const handleParticipantUpdate = () => {
		if (room.value) {
			remoteParticipants.value = [...room.value.remoteParticipants.values()];
			layoutReevaluator.value++;
		}
	};

	const handleParticipantConnected = () => {
		playUserConnectedSound();
		handleParticipantUpdate();
	};

	const handleParticipantDisconnected = () => {
		playUserDisconnectedSound();
		handleParticipantUpdate();
	};

	const connect = async () => {
		try {
			const roomInstance = new Room({
				audioCaptureDefaults: {
					deviceId: localStorage.getItem('selectedMicrophoneId') || undefined,
				},
				videoCaptureDefaults: {
					deviceId: localStorage.getItem('selectedCameraId') || undefined,
				},
			});

			room.value = roomInstance;

			room.value
				.on(RoomEvent.ConnectionStateChanged, handleConnectionState)
				.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
				.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
				.on(RoomEvent.TrackSubscribed, () => {
					handleParticipantUpdate();
					reevaluateScreenShare();
					console.log('TrackSubscribed');
				})
				.on(RoomEvent.TrackUnsubscribed, () => {
					handleParticipantUpdate();
					reevaluateScreenShare();
					console.log('TrackUnsubscribed');
				})
				.on(RoomEvent.TrackPublished, () => {
					handleParticipantUpdate();
					reevaluateScreenShare();
					console.log('TrackPublished');
				})
				.on(RoomEvent.TrackUnpublished, () => {
					handleParticipantUpdate();
					reevaluateScreenShare();
					console.log('TrackUnpublished');
				})
				.on(RoomEvent.LocalTrackPublished, (pub) => {
					console.log('LocalTrackPublished');

					handleParticipantUpdate();
					reevaluateScreenShare();
					if (pub.source === Track.Source.ScreenShare) {
						isScreenShareEnabled.value = true;
					}
				})
				.on(RoomEvent.LocalTrackUnpublished, (track) => {
					console.log('LocalTrackUnpublished');

					handleParticipantUpdate();
					reevaluateScreenShare();
					if (track.source === Track.Source.ScreenShare) {
						isScreenShareEnabled.value = false;
					}
				})
				.on(RoomEvent.LocalTrackSubscribed, () => {
					handleParticipantUpdate();
					reevaluateScreenShare();
					console.log('LocalTrackSubscribed');
				});

			const _host =
				!host.startsWith('http://') && !host.startsWith('https://')
					? `https://${host}`
					: host;
			const url = new URL(_host);
			const wsUrl = `${url.protocol === 'https:' ? 'wss' : 'ws'}://${url.host}${
				url.pathname
			}`;

			await room.value.connect(wsUrl, token, {
				autoSubscribe: true,
			});

			// Immediately populate with existing participants
			handleParticipantUpdate();
		} catch (e: any) {
			console.error('Failed to connect to LiveKit room:', e);
			error.value = e;
			cleanup();
		} finally {
			if (!room.value) return;

			room.value.localParticipant.on('localTrackPublished', () => {
				console.log('AAAAAAAAAAAAAAAAA');
			});
			room.value.localParticipant.on('localTrackUnpublished', () => {
				console.log('BBBBBBBBBBBBBBBB');
			});

			room.value.localParticipant.on('trackPublished', (publication) => {
				if (publication.track?.source === Track.Source.ScreenShare) {
					console.log('🖥 ScreenShare START');
				}
			});
			room.value.localParticipant.on('trackUnsubscribed', (track) => {
				debugger;
				if (track.source === Track.Source.ScreenShare) {
					console.log('🛑 ScreenShare STOP');
				}
			});
		}
	};

	const disconnect = () => {
		cleanup();
	};

	const toggleCamera = async () => {
		if (room.value) {
			const newSate = !isCameraEnabled.value;
			await room.value.localParticipant.setCameraEnabled(newSate);
			isCameraEnabled.value = newSate;
		}
	};

	const toggleMicrophone = async () => {
		if (room.value) {
			const newSate = !isMicrophoneEnabled.value;
			await room.value.localParticipant.setMicrophoneEnabled(newSate);
			isMicrophoneEnabled.value = newSate;
		}
	};

	const toggleScreenShare = async () => {
		if (!room.value) return;

		try {
			const nextState = isScreenShareEnabled.value ? false : true;
			await room.value.localParticipant.setScreenShareEnabled(nextState);
		} catch (e) {
			console.error('Screen share toggle failed', e);
		}
	};

	const reevaluateScreenShare = () => {
		if (!room.value || room.value.state !== ConnectionState.Connected) {
			screenShareParticipant.value = null;
			screenShareTrack.value = null;
			screenShareAudioTrack.value = null;
			isScreenShareEnabled.value = false;
			return;
		}

		// 1. сначала локальный
		let participant: Participant | null = null;
		let screenPub: LocalTrackPublication | RemoteTrackPublication | undefined =
			room.value.localParticipant.getTrackPublication(Track.Source.ScreenShare);

		let audioPub: LocalTrackPublication | RemoteTrackPublication | undefined =
			room.value.localParticipant.getTrackPublication(
				Track.Source.ScreenShareAudio,
			);

		if (screenPub?.isSubscribed) {
			participant = room.value.localParticipant;
		} else {
			// 2. ищем среди remote
			for (const p of room.value.remoteParticipants.values()) {
				const pub = p.getTrackPublication(Track.Source.ScreenShare);
				if (pub?.isSubscribed) {
					screenPub = pub;
					audioPub = p.getTrackPublication(Track.Source.ScreenShareAudio);
					participant = p;
					break;
				}
			}
		}

		screenShareParticipant.value = participant;
		screenShareTrack.value = screenPub ?? null;
		screenShareAudioTrack.value = audioPub ?? null;

		isScreenShareEnabled.value = !!screenPub;
	};

	onUnmounted(() => {
		disconnect();
	});

	return {
		room,
		localParticipant,
		remoteParticipants,
		isConnected,
		error,
		layoutReevaluator,
		isCameraEnabled,
		isMicrophoneEnabled,
		isScreenShareEnabled,
		connect,
		disconnect,
		toggleCamera,
		toggleMicrophone,
		toggleScreenShare,

		screenShareParticipant,
		screenShareTrack,
		screenShareAudioTrack,
	};
}
