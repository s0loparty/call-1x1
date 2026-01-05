import { readonly, ref, type Ref } from 'vue'
import { useEcho } from '@laravel/echo-vue'
import axios from 'axios'
import { signal as routeSignal } from '@/routes/call'

// --- Types ---

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'active' | 'terminating'

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
  payload?: SdpPayload | CandidatePayload | null;
}

export interface IncomingCall {
    from_user_id: number;
    payload: SdpPayload;
}


// --- Constants ---

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

// --- Module-level state (Singleton Pattern) ---
const callState: Ref<CallState> = ref('idle')
const peerConnection: Ref<RTCPeerConnection | null> = ref(null)
const localStream: Ref<MediaStream | null> = ref(null)
const remoteStream: Ref<MediaStream | null> = ref(null)
const incomingCall: Ref<IncomingCall | null> = ref(null)
const isMuted = ref(false)
const otherUserId: Ref<number | null> = ref(null)
const iceCandidateQueue: Ref<RTCIceCandidate[]> = ref([])

// --- Private Functions ---

function _setCallState(state: CallState) {
  console.log(`[Call] State change: ${callState.value} -> ${state}`)
  callState.value = state
}

async function sendSignal(data: SignalingData, toUserId: number) {
  console.log('[Call] Sending signal:', data.type, 'to', toUserId)
  try {
    await axios.post(routeSignal().url, { ...data, to_user_id: toUserId })
  }
  catch (error) {
    console.error('[Call] Failed to send signal:', error)
  }
}

function _createPeerConnection(authUserId: number) {
  console.log('[Call] Creating RTCPeerConnection')
  const pc = new RTCPeerConnection(ICE_SERVERS)

  pc.onicecandidate = (event) => {
    if (event.candidate && otherUserId.value) {
      sendSignal({
        type: 'call:ice-candidate',
        from_user_id: authUserId,
        payload: { candidate: event.candidate.toJSON() },
      }, otherUserId.value)
    }
  }

  pc.ontrack = (event) => {
    console.log('[Call] Remote track received')
    remoteStream.value = event.streams[0]
  }

  pc.onconnectionstatechange = () => {
    if (!pc) return;
    console.log(`[Call] Connection state changed: ${pc.connectionState}`)
    if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        hangUp(authUserId)
    }
  }

  if (localStream.value) {
    localStream.value.getTracks().forEach(track => {
        console.log('[Call] Adding local track to PC');
        pc.addTrack(track, localStream.value!)
    })
  }

  peerConnection.value = pc
}

async function _startLocalStream() {
    console.log('[Call] Requesting local media stream')
    if (localStream.value) {
        console.log('[Call] Local stream already exists.');
        return;
    };
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        localStream.value = stream
    } catch (error) {
        console.error('[Call] Error getting user media:', error)
        _setCallState('idle')
        throw error
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
        localStream.value.getTracks().forEach(track => track.stop());
        localStream.value = null;
    }
}


function hangUp(authUserId: number) {
  if (callState.value === 'idle') return
  _setCallState('terminating')

  if (otherUserId.value) {
    sendSignal({ type: 'call:end', from_user_id: authUserId }, otherUserId.value)
  }
  
  _closePeerConnection()
  _stopLocalStream()
  
  remoteStream.value = null
  incomingCall.value = null
  otherUserId.value = null
  iceCandidateQueue.value = []


  _setCallState('idle')
}

async function processIceCandidateQueue() {
    if (!peerConnection.value) return;
    while(iceCandidateQueue.value.length > 0) {
        const candidate = iceCandidateQueue.value.shift();
        if (candidate) {
            try {
                await peerConnection.value.addIceCandidate(candidate);
                console.log('[Call] Processed queued ICE candidate.');
            } catch (error) {
                console.error('[Call] Error processing queued ICE candidate:', error);
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
            sendSignal({ type: 'call:busy', from_user_id: authUserId }, data.from_user_id)
            return
        }

        const payload = data.payload as SdpPayload;
        if (!payload?.sdp) {
            console.error('[Call] Invalid SDP payload received in offer', payload)
            return
        }

        otherUserId.value = data.from_user_id
        incomingCall.value = { 
            from_user_id: data.from_user_id,
            payload: payload,
        }
        _setCallState('incoming')
    }


    async function handleAnswer(data: SignalingData) {
        if (!peerConnection.value || !data.payload) return
        console.log('[Call] Received answer')

        const payload = data.payload as SdpPayload;
        if (!payload?.sdp) {
            console.error('[Call] Invalid SDP payload received in answer', payload);
            hangUp(authUserId);
            return;
        }

        try {
            const sdp = atob(payload.sdp);
            const description: RTCSessionDescriptionInit = { type: 'answer', sdp: sdp };
            await peerConnection.value.setRemoteDescription(description)
            await processIceCandidateQueue();
            _setCallState('active');
        } catch (error) {
            console.error('[Call] Error handling answer:', error, payload)
            hangUp(authUserId);
        }
    }

    async function handleIceCandidate(data: SignalingData) {
        if (!data.payload) return
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
        console.log('[Call] Call rejected or busy')
        hangUp(authUserId)
    }

    function handleEnd() {
        console.log('[Call] Call ended by remote user')
        hangUp(authUserId)
    }

    // Initialize Echo listener only once.
    if (!isListenerInitialized) {
        console.log(`[Call] Initializing listener on App.Models.User.${authUserId}`)
        useEcho(`App.Models.User.${authUserId}`, '.call.signal', (data: SignalingData) => {
            console.log('[Call] Signal received:', data.type)
            if (data.from_user_id === authUserId) {
                console.warn('[Call] Ignoring signal from self.');
                return;
            }

            switch (data.type) {
                case 'call:offer':
                    handleIncomingOffer(data)
                    break
                case 'call:answer':
                    handleAnswer(data)
                    break
                case 'call:ice-candidate':
                    handleIceCandidate(data)
                    break
                case 'call:reject':
                case 'call:busy':
                    handleReject()
                    break
                case 'call:end':
                    handleEnd()
                    break
            }
        });
        isListenerInitialized = true;
    }


    async function initiateCall(calleeId: number) {
        if (callState.value !== 'idle') {
            console.warn('[Call] Cannot initiate call, already in a call.')
            return
        }
        
        try {
            _setCallState('outgoing');
            otherUserId.value = calleeId;
            
            await _startLocalStream()
            if (!localStream.value?.getTracks().length) {
                throw new Error('No local tracks available to create an offer.');
            }

            _createPeerConnection(authUserId);
            if (!peerConnection.value) throw new Error('Peer connection not created');

            const offer = await peerConnection.value.createOffer();
            await peerConnection.value.setLocalDescription(offer);

            await sendSignal({
                type: 'call:offer',
                from_user_id: authUserId,
                payload: { type: offer.type, sdp: btoa(offer.sdp ?? '') },
            }, calleeId);
        } catch (error) {
            console.error('[Call] Failed to initiate call:', error)
            hangUp(authUserId)
        }
    }

    async function acceptCall() {
        if (callState.value !== 'incoming' || !otherUserId.value || !incomingCall.value?.payload.sdp) {
            console.warn('[Call] Cannot accept call in current state.')
            return
        }
        
        const offerPayload = incomingCall.value.payload;
        
        try {
            await _startLocalStream()
            _createPeerConnection(authUserId);
            if (!peerConnection.value) throw new Error('Peer connection not created');
            
            console.log('[Call] Setting remote description with received offer.');
            const sdp = atob(offerPayload.sdp);
            const description: RTCSessionDescriptionInit = { type: offerPayload.type, sdp: sdp };
            
            if (!description.sdp || !description.sdp.startsWith('v=0')) {
                console.error('[Call] Invalid SDP after Base64 decode', description);
                hangUp(authUserId);
                return;
            }

            await peerConnection.value.setRemoteDescription(description);

            await processIceCandidateQueue();

            const answer = await peerConnection.value.createAnswer();
            await peerConnection.value.setLocalDescription(answer);

            _setCallState('active');

            await sendSignal({
                type: 'call:answer',
                from_user_id: authUserId,
                payload: { type: answer.type, sdp: btoa(answer.sdp ?? '') },
            }, otherUserId.value)

        } catch (error) {
            console.error('[Call] Failed to accept call:', error, offerPayload)
            hangUp(authUserId)
        }
    }

    function rejectCall() {
        if (callState.value !== 'incoming' || !otherUserId.value) return
        
        sendSignal({ type: 'call:reject', from_user_id: authUserId }, otherUserId.value)
        hangUp(authUserId)
    }
    
    function toggleMute() {
        if (!localStream.value) return
        localStream.value.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled
            isMuted.value = !track.enabled
        })
    }

    return {
        // State is reactive and shared across the app due to being module-level
        callState: readonly(callState),
        localStream,
        remoteStream,
        incomingCall: readonly(incomingCall),
        otherUserId: readonly(otherUserId),
        isMuted: readonly(isMuted),

        // Actions now correctly use the enclosed 'authUserId'
        initiateCall,
        acceptCall,
        rejectCall,
        hangUp: () => hangUp(authUserId),
        toggleMute,
    }
}