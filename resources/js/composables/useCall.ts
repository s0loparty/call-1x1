import { signal as routeSignal } from '@/routes/call';
import { useEcho } from '@laravel/echo-vue';
import axios from 'axios';
import { readonly, ref, Ref } from 'vue';
import { toast } from 'vue-sonner';

// --- Types ---

export type CallState =
    | 'idle'
    | 'outgoing'
    | 'incoming'
    | 'active'
    | 'terminating';

export type CallType = 'audio' | 'video';

interface SdpPayload {
    type: RTCSdpType;
    sdp: string; // This is Base64 encoded
}

interface CandidatePayload {
    candidate: RTCIceCandidateInit;
}

interface SignalingData {
    type: string;
    from_user_id: number;
    callType?: CallType;
    payload?: SdpPayload | CandidatePayload | null;
}

export interface IncomingCall {
    from_user_id: number;
    callType: CallType;
    payload: SdpPayload;
}

// --- Constants ---

const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

if (import.meta.env.VITE_TURN_URL) {
    iceServers.push({
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_PASSWORD,
    });
}

const ICE_SERVERS: RTCConfiguration = {
    iceServers: iceServers,
};

// --- Module-level state (Singleton Pattern) ---
const callState: Ref<CallState> = ref('idle');
const callType: Ref<CallType | null> = ref(null);
const peerConnection: Ref<RTCPeerConnection | null> = ref(null);
const localStream: Ref<MediaStream | null> = ref(null);
const remoteStream: Ref<MediaStream | null> = ref(null);
const remoteStreamTrigger = ref(0);
const incomingCall: Ref<IncomingCall | null> = ref(null);
const isMuted = ref(false);
const isVideoEnabled = ref(true);
const otherUserId: Ref<number | null> = ref(null);
const iceCandidateQueue: Ref<RTCIceCandidate[]> = ref([]);

// --- Private Functions ---

function _setCallState(state: CallState) {
    console.log(`[Call] State change: ${callState.value} -> ${state}`);
    callState.value = state;
}

async function sendSignal(data: SignalingData, toUserId: number) {
    console.log('[Call] Sending signal:', data.type, 'to', toUserId);
    try {
        await axios.post(routeSignal().url, { ...data, to_user_id: toUserId });
    } catch (error) {
        console.error('[Call] Failed to send signal:', error);
    }
}

function _createPeerConnection(authUserId: number, stream: MediaStream) {
    console.log(
        '[Call] Creating RTCPeerConnection with ICE servers:',
        ICE_SERVERS.iceServers,
    );
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
        if (event.candidate && otherUserId.value) {
            sendSignal(
                {
                    type: 'call:ice-candidate',
                    from_user_id: authUserId,
                    payload: { candidate: event.candidate.toJSON() },
                },
                otherUserId.value,
            );
        }
    };

    pc.ontrack = (event) => {
        console.log('[Call] Remote track received:', event.track);
        remoteStream.value = event.streams[0];
        remoteStreamTrigger.value++;
    };

    pc.onconnectionstatechange = () => {
        if (!pc) return;
        console.log(`[Call] Connection state changed: ${pc.connectionState}`);
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
            hangUp(authUserId);
        }
    };

    // Revert to the simpler, more reliable way of adding tracks
    stream.getTracks().forEach((track) => {
        console.log('[Call] Adding local track to PC:', track);
        pc.addTrack(track, stream);
    });

    console.log('[Call DEBUG] Senders after adding tracks:', pc.getSenders());

    peerConnection.value = pc;
}

async function _startLocalStream(video: boolean): Promise<MediaStream> {
    console.log(`[Call] Requesting local media stream (video: ${video})`);

    // If a stream already exists, check if it's the correct type.
    // If not, stop it before creating a new one.
    if (localStream.value) {
        const hasVideo = localStream.value.getVideoTracks().length > 0;
        if (hasVideo !== video) {
            console.log(
                '[Call] Stream type mismatch. Stopping existing stream.',
            );
            _stopLocalStream();
        } else {
            console.log('[Call] Local stream already exists and matches type.');
            return localStream.value;
        }
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: video,
        });

        localStream.value = stream;
        // When a new stream is started, ensure video is marked as enabled
        isVideoEnabled.value = video;
        return stream;
    } catch (error) {
        console.error('[Call] Error getting user media:', error);

        if (error instanceof DOMException) {
            switch (error.name) {
                case 'NotFoundError':
                    toast.error(
                        video
                            ? 'Камера или микрофон не обнаружены.'
                            : 'Микрофон не обнаружен.',
                        {
                            description:
                                'Пожалуйста, убедитесь, что ваши устройства подключены, и повторите попытку.',
                            duration: 8000,
                        },
                    );
                    break;
                case 'NotAllowedError':
                    toast.error('Доступ запрещен', {
                        description:
                            'Вы запретили доступ к камере или микрофону. Пожалуйста, разрешите доступ в настройках вашего браузера.',
                        duration: 8000,
                    });
                    break;
                default:
                    toast.error('Ошибка доступа к медиафайлам', {
                        description: `Произошла непредвиденная ошибка: ${error.message}`,
                        duration: 8000,
                    });
                    break;
            }
        } else {
            toast.error('Ошибка доступа к медиафайлам', {
                description:
                    'При попытке доступа к вашей камере или микрофону произошла неизвестная ошибка.',
                duration: 8000,
            });
        }

        _setCallState('idle');
        throw error;
    }
}

function _closePeerConnection() {
    if (peerConnection.value) {
        console.log('[Call] Closing RTCPeerConnection');
        peerConnection.value.close();
        peerConnection.value = null;
    }
}

function _stopLocalStream() {
    if (localStream.value) {
        console.log('[Call] Stopping local media stream');
        localStream.value.getTracks().forEach((track) => track.stop());
        localStream.value = null;
    }
}

function hangUp(authUserId: number) {
    if (callState.value === 'idle') return;
    _setCallState('terminating');

    if (otherUserId.value) {
        sendSignal(
            { type: 'call:end', from_user_id: authUserId },
            otherUserId.value,
        );
    }

    _closePeerConnection();
    _stopLocalStream();

    remoteStream.value = null;
    incomingCall.value = null;
    otherUserId.value = null;
    iceCandidateQueue.value = [];
    callType.value = null;
    isMuted.value = false;
    isVideoEnabled.value = true;

    _setCallState('idle');
}

async function processIceCandidateQueue() {
    if (!peerConnection.value) return;
    while (iceCandidateQueue.value.length > 0) {
        const candidate = iceCandidateQueue.value.shift();
        if (candidate) {
            try {
                await peerConnection.value.addIceCandidate(candidate);
                console.log('[Call] Processed queued ICE candidate.');
            } catch (error) {
                console.error(
                    '[Call] Error processing queued ICE candidate:',
                    error,
                );
            }
        }
    }
}

// --- The Composable ---

let isListenerInitialized = false;

export function useCall(authUserId: number) {
    // --- Signaling Handlers ---
    // These need authUserId to send 'busy' signals, so they are defined inside the composable
    function handleIncomingOffer(data: SignalingData) {
        if (callState.value !== 'idle') {
            sendSignal(
                { type: 'call:busy', from_user_id: authUserId },
                data.from_user_id,
            );
            return;
        }

        const payload = data.payload as SdpPayload;
        const type = data.callType || 'audio'; // Default to audio for backward compatibility

        if (!payload?.sdp) {
            console.error(
                '[Call] Invalid SDP payload received in offer',
                payload,
            );
            return;
        }

        otherUserId.value = data.from_user_id;
        callType.value = type;
        incomingCall.value = {
            from_user_id: data.from_user_id,
            callType: type,
            payload: payload,
        };
        _setCallState('incoming');
    }

    async function handleAnswer(data: SignalingData) {
        if (!peerConnection.value || !data.payload) return;
        console.log('[Call] Received answer');

        const payload = data.payload as SdpPayload;
        if (!payload?.sdp) {
            console.error(
                '[Call] Invalid SDP payload received in answer',
                payload,
            );
            hangUp(authUserId);
            return;
        }

        try {
            const sdp = atob(payload.sdp);
            const description: RTCSessionDescriptionInit = {
                type: 'answer',
                sdp: sdp,
            };
            await peerConnection.value.setRemoteDescription(description);
            await processIceCandidateQueue();
            _setCallState('active');
        } catch (error) {
            console.error('[Call] Error handling answer:', error, payload);
            hangUp(authUserId);
        }
    }

    async function handleIceCandidate(data: SignalingData) {
        if (!data.payload) return;
        const payload = data.payload as CandidatePayload;
        if (!payload.candidate) return;

        const candidate = new RTCIceCandidate(payload.candidate);
        if (peerConnection.value?.remoteDescription) {
            try {
                await peerConnection.value.addIceCandidate(candidate);
            } catch (error) {
                console.error('[Call] Error adding ICE candidate:', error);
            }
        } else {
            console.log('[Call] Queuing ICE candidate.');
            iceCandidateQueue.value.push(candidate);
        }
    }

    function handleReject() {
        console.log('[Call] Call rejected or busy');
        hangUp(authUserId);
    }

    function handleEnd() {
        console.log('[Call] Call ended by remote user');
        hangUp(authUserId);
    }

    // Initialize Echo listener only once.
    if (!isListenerInitialized) {
        console.log(
            `[Call] Initializing listener on App.Models.User.${authUserId}`,
        );
        useEcho(
            `App.Models.User.${authUserId}`,
            '.call.signal',
            (data: SignalingData) => {
                console.log('[Call] Signal received:', data.type);
                if (data.from_user_id === authUserId) {
                    console.warn('[Call] Ignoring signal from self.');
                    return;
                }

                switch (data.type) {
                    case 'call:offer':
                        handleIncomingOffer(data);
                        break;
                    case 'call:answer':
                        handleAnswer(data);
                        break;
                    case 'call:ice-candidate':
                        handleIceCandidate(data);
                        break;
                    case 'call:reject':
                    case 'call:busy':
                        handleReject();
                        break;
                    case 'call:end':
                        handleEnd();
                        break;
                }
            },
        );
        isListenerInitialized = true;
    }

    async function initiateCall(calleeId: number, type: CallType) {
        if (callState.value !== 'idle') {
            console.warn('[Call] Cannot initiate call, already in a call.');
            return;
        }

        try {
            // First, try to get the media stream. If this fails, it will throw an error
            // and the function will exit before any state changes, preventing UI flicker.
            const stream = await _startLocalStream(type === 'video');
            if (!stream.getTracks().length) {
                throw new Error(
                    'No local tracks available to create an offer.',
                );
            }

            // --- Only change state after we have the media stream ---
            _setCallState('outgoing');
            otherUserId.value = calleeId;
            callType.value = type;

            _createPeerConnection(authUserId, stream);
            if (!peerConnection.value)
                throw new Error('Peer connection not created');

            const offer = await peerConnection.value.createOffer();
            await peerConnection.value.setLocalDescription(offer);

            await sendSignal(
                {
                    type: 'call:offer',
                    from_user_id: authUserId,
                    callType: type,
                    payload: { type: offer.type, sdp: btoa(offer.sdp ?? '') },
                },
                calleeId,
            );
        } catch (error) {
            // The error is already handled and logged in _startLocalStream.
            // We just need to ensure we don't proceed with the call.
            console.error('[Call] Failed to initiate call:', error);
            // Clean up any state that might have been partially set, though with the new order, this is less likely.
            if (callState.value !== 'idle') {
                hangUp(authUserId);
            }
        }
    }

    async function acceptCall() {
        if (
            callState.value !== 'incoming' ||
            !otherUserId.value ||
            !incomingCall.value?.payload.sdp
        ) {
            console.warn('[Call] Cannot accept call in current state.');
            return;
        }

        const offerPayload = incomingCall.value.payload;
        const type = callType.value;

        try {
            const stream = await _startLocalStream(type === 'video');
            _createPeerConnection(authUserId, stream);
            if (!peerConnection.value)
                throw new Error('Peer connection not created');

            console.log(
                '[Call] Setting remote description with received offer.',
            );
            const sdp = atob(offerPayload.sdp);
            const description: RTCSessionDescriptionInit = {
                type: offerPayload.type,
                sdp: sdp,
            };

            if (!description.sdp || !description.sdp.startsWith('v=0')) {
                console.error(
                    '[Call] Invalid SDP after Base64 decode',
                    description,
                );
                hangUp(authUserId);
                return;
            }

            await peerConnection.value.setRemoteDescription(description);

            await processIceCandidateQueue();

            const answer = await peerConnection.value.createAnswer();
            await peerConnection.value.setLocalDescription(answer);

            _setCallState('active');

            await sendSignal(
                {
                    type: 'call:answer',
                    from_user_id: authUserId,
                    payload: { type: answer.type, sdp: btoa(answer.sdp ?? '') },
                },
                otherUserId.value,
            );
        } catch (error) {
            console.error('[Call] Failed to accept call:', error, offerPayload);
            hangUp(authUserId);
        }
    }

    function rejectCall() {
        if (callState.value !== 'incoming' || !otherUserId.value) return;

        sendSignal(
            { type: 'call:reject', from_user_id: authUserId },
            otherUserId.value,
        );
        hangUp(authUserId);
    }

    function toggleMute() {
        if (!localStream.value) return;
        localStream.value.getAudioTracks().forEach((track) => {
            track.enabled = !track.enabled;
            isMuted.value = !track.enabled;
        });
    }

    function toggleVideo() {
        if (!localStream.value) return;
        localStream.value.getVideoTracks().forEach((track) => {
            track.enabled = !track.enabled;
            isVideoEnabled.value = !track.enabled;
        });
    }

    return {
        // State is reactive and shared across the app due to being module-level
        callState: readonly(callState),
        callType: readonly(callType),
        localStream,
        remoteStream,
        remoteStreamTrigger: readonly(remoteStreamTrigger),
        incomingCall: readonly(incomingCall),
        otherUserId: readonly(otherUserId),
        isMuted: readonly(isMuted),
        isVideoEnabled: readonly(isVideoEnabled),

        // Actions now correctly use the enclosed 'authUserId'
        initiateCall,
        acceptCall,
        rejectCall,
        hangUp: () => hangUp(authUserId),
        toggleMute,
        toggleVideo,
    };
}
