import type { Ref } from 'vue';
import { ref, watch } from 'vue';

export type PermissionState = 'prompt' | 'granted' | 'denied';

export function useDeviceManager() {
	// --- State ---
	const cameras = ref<MediaDeviceInfo[]>([]);
	const microphones = ref<MediaDeviceInfo[]>([]);
	const audioOutputs = ref<MediaDeviceInfo[]>([]);

	const selectedCameraId = ref<string | undefined>();
	const selectedMicrophoneId = ref<string | undefined>();
	const selectedAudioOutputId = ref<string | undefined>();

	const cameraStream = ref<MediaStream | null>(null);
	const microphoneStream = ref<MediaStream | null>(null);

	const cameraPermission = ref<PermissionState>('prompt');
	const microphonePermission = ref<PermissionState>('prompt');

	// --- Private Methods ---

	/**
	 * Enumerate all available media devices and populate state.
	 */
	const _enumerateDevices = async () => {
		try {
			const allDevices = await navigator.mediaDevices.enumerateDevices();
			cameras.value = allDevices.filter(
				(d) => d.kind === 'videoinput' && d.deviceId.length,
			);
			microphones.value = allDevices.filter(
				(d) => d.kind === 'audioinput' && d.deviceId.length,
			);
			audioOutputs.value = allDevices.filter(
				(d) => d.kind === 'audiooutput' && d.deviceId.length,
			);

			// Set default devices if not already set
			if (!selectedCameraId.value && cameras.value.length > 0) {
				selectedCameraId.value = cameras.value[0].deviceId;
			}
			if (!selectedMicrophoneId.value && microphones.value.length > 0) {
				selectedMicrophoneId.value = microphones.value[0].deviceId;
			}
			if (!selectedAudioOutputId.value && audioOutputs.value.length > 0) {
				selectedAudioOutputId.value = audioOutputs.value[0].deviceId;
			}
		} catch (e) {
			console.error('Failed to enumerate devices:', e);
		}
	};

	/**
	 * Get a stream for the currently selected camera.
	 */
	const _getCameraStream = async () => {
		if (cameraPermission.value !== 'granted') return;
		stopStream(cameraStream);
		try {
			cameraStream.value = await navigator.mediaDevices.getUserMedia({
				video: {
					deviceId: selectedCameraId.value
						? { exact: selectedCameraId.value }
						: undefined,
				},
			});
		        } catch (e) {
		            console.error('Failed to get camera stream:', e);
		            // Nullify the stream so the UI can react
		            cameraStream.value = null;
		
		            // IMPORTANT: Only set permission to 'denied' on a NotAllowedError.
		            // Other errors (like NotReadableError) are source issues, not permission issues.
		            if (e instanceof DOMException && e.name === 'NotAllowedError') {
		                cameraPermission.value = 'denied';
		            }
		            // For other errors, we keep the permission as 'granted' so the user can switch back.
		        }	};

	/**
	 * Get a stream for the currently selected microphone.
	 */
	const _getMicrophoneStream = async () => {
		if (microphonePermission.value !== 'granted') return;
		stopStream(microphoneStream);
		try {
			microphoneStream.value = await navigator.mediaDevices.getUserMedia({
				audio: {
					deviceId: selectedMicrophoneId.value
						? { exact: selectedMicrophoneId.value }
						: undefined,
				},
			});
		} catch (e) {
			console.error('Failed to get microphone stream:', e);
            microphoneStream.value = null;

            if (e instanceof DOMException && e.name === 'NotAllowedError') {
                microphonePermission.value = 'denied';
            }
		}
	};

	// --- Public API ---

	/**
	 * Request permission to use the camera.
	 * @returns {Promise<boolean>} - True if permission was granted.
	 */
	const requestCameraPermission = async (): Promise<boolean> => {
		try {
			// Request a dummy stream to trigger the permission prompt
			const stream = await navigator.mediaDevices.getUserMedia({ video: true });
			cameraPermission.value = 'granted';
			// Stop the dummy stream immediately
			stream.getTracks().forEach((track) => track.stop());
			await _enumerateDevices(); // Re-enumerate to get device labels
			return true;
		} catch (error) {
			console.error('Camera permission denied:', error);
			cameraPermission.value = 'denied';
			return false;
		}
	};

	/**
	 * Request permission to use the microphone.
	 * @returns {Promise<boolean>} - True if permission was granted.
	 */
	const requestMicrophonePermission = async (): Promise<boolean> => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			microphonePermission.value = 'granted';
			stream.getTracks().forEach((track) => track.stop());
			await _enumerateDevices();
			return true;
		} catch (error) {
			console.error('Microphone permission denied:', error);
			microphonePermission.value = 'denied';
			return false;
		}
	};

	/**
	 * Stops a specific MediaStream.
	 * @param {Ref<MediaStream | null>} streamRef - The stream to stop.
	 */
	const stopStream = (streamRef: Ref<MediaStream | null>) => {
		if (streamRef.value) {
			streamRef.value.getTracks().forEach((track) => track.stop());
			streamRef.value = null;
		}
	};

	/**
	 * Stop all active streams (camera and microphone).
	 */
	const stopAllStreams = () => {
		stopStream(cameraStream);
		stopStream(microphoneStream);
	};

	// --- Watchers ---
	watch(selectedCameraId, _getCameraStream);
	watch(selectedMicrophoneId, _getMicrophoneStream);

	// --- Initial Load ---
	_enumerateDevices(); // Initial enumeration for device counts, etc.

	return {
		// State
		cameras,
		microphones,
		audioOutputs,
		selectedCameraId,
		selectedMicrophoneId,
		selectedAudioOutputId,
		cameraStream,
		microphoneStream,
		cameraPermission,
		microphonePermission,

		// Methods
		requestCameraPermission,
		requestMicrophonePermission,
		stopStream,
		stopAllStreams,
		// Expose the private getters for direct use if needed, e.g., on first enable
		getCameraStream: _getCameraStream,
		getMicrophoneStream: _getMicrophoneStream,
	};
}
