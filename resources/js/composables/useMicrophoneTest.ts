import type { Ref } from 'vue';
import { onUnmounted, ref } from 'vue';

export function useMicrophoneTest() {
	const isTesting = ref(false);
	const audioContext: Ref<AudioContext | null> = ref(null);
	const analyser: Ref<AnalyserNode | null> = ref(null);
	const sourceNode: Ref<MediaStreamAudioSourceNode | null> = ref(null);
	const dataArray = ref<Uint8Array<ArrayBuffer> | null>(null);
	const microphoneVolume = ref(0);

	let animationFrameId: number = 0;

	const draw = () => {
		if (!isTesting.value || !analyser.value || !dataArray.value) return;

		animationFrameId = requestAnimationFrame(draw);
		analyser.value.getByteFrequencyData(dataArray.value);

		const sum = dataArray.value.reduce((a, b) => a + b, 0);
		const avg = sum / dataArray.value.length;

		microphoneVolume.value = Math.round((avg / 255) * 100);
	};

	const startTest = (stream: MediaStream) => {
		if (isTesting.value || !stream) return;

		audioContext.value = new AudioContext();
		analyser.value = audioContext.value.createAnalyser();
		analyser.value.fftSize = 256;

		sourceNode.value = audioContext.value.createMediaStreamSource(stream);

		// 🔊 чтобы юзер СЛЫШАЛ себя
		const gainNode = audioContext.value.createGain();
		gainNode.gain.value = 1;

		sourceNode.value.connect(analyser.value);
		analyser.value.connect(gainNode);
		gainNode.connect(audioContext.value.destination);

		const bufferLength = analyser.value.frequencyBinCount;
		dataArray.value = new Uint8Array(bufferLength);
		isTesting.value = true;
		draw();
	};

	const stopTest = () => {
		isTesting.value = false;

		cancelAnimationFrame(animationFrameId);

		sourceNode.value?.disconnect();
		analyser.value?.disconnect();

		audioContext.value?.close();

		sourceNode.value = null;
		analyser.value = null;
		audioContext.value = null;
		dataArray.value = null;

		microphoneVolume.value = 0;
	};

	onUnmounted(() => {
		stopTest();
	});

	return {
		isTesting,
		microphoneVolume,
		startTest,
		stopTest,
	};
}
