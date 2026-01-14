<script setup lang="ts">
import type { Participant, Track, TrackPublication } from 'livekit-client';
import { ParticipantEvent } from 'livekit-client';
import { MicOff } from 'lucide-vue-next';
import { onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
	participant: Participant;
	isSidebar?: boolean;
	isScreenShared?: boolean;
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const audioEl = ref<HTMLAudioElement | null>(null);

const isMuted = ref(!props.participant.isMicrophoneEnabled);
const isVideoOff = ref(true);

const handleTrackAttachment = (pub: TrackPublication) => {
	if (pub.track && pub.kind === 'video') {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		videoEl.value && pub.track.attach(videoEl.value);
	}
	if (pub.track && pub.kind === 'audio') {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		audioEl.value && pub.track.attach(audioEl.value);
	}
};

const handleTrackDetachment = (pub: TrackPublication) => {
	if (pub.track) {
		pub.track.detach();
	}
};

onMounted(() => {
	// --- Event Listeners ---
	const onTrackMuted = (pub: TrackPublication) => {
		if (pub.kind === 'audio') isMuted.value = true;
		if (pub.kind === 'video') isVideoOff.value = true;
	};
	const onTrackUnmuted = (pub: TrackPublication) => {
		if (pub.kind === 'audio') isMuted.value = false;
		if (pub.kind === 'video') isVideoOff.value = false;
	};
	const onTrackPublished = (pub: TrackPublication) => {
		handleTrackAttachment(pub);
		if (pub.kind === 'video') isVideoOff.value = false;
	};
	const onTrackUnpublished = (pub: TrackPublication) => {
		if (pub.kind === 'video') {
			isVideoOff.value = true;
			handleTrackDetachment(pub);
		}
	};
	const onTrackSubscribed = (_track: Track, pub: TrackPublication) => {
		handleTrackAttachment(pub);
		if (pub.kind === 'video') isVideoOff.value = false;
	};
	const onTrackUnsubscribed = (_track: Track, pub: TrackPublication) => {
		if (pub.kind === 'video') {
			isVideoOff.value = true;
			handleTrackDetachment(pub);
		}
	};

	// Attach listeners
	props.participant
		.on(ParticipantEvent.TrackMuted, onTrackMuted)
		.on(ParticipantEvent.TrackUnmuted, onTrackUnmuted)
		.on(ParticipantEvent.TrackPublished, onTrackPublished)
		.on(ParticipantEvent.TrackUnpublished, onTrackUnpublished)
		.on(ParticipantEvent.TrackSubscribed, onTrackSubscribed)
		.on(ParticipantEvent.TrackUnsubscribed, onTrackUnsubscribed);

	// Set initial state based on existing publications
	const videoPub = Array.from(
		props.participant.trackPublications.values(),
	).find((p) => p.kind === 'video');
	isVideoOff.value =
		!videoPub ||
		videoPub.isMuted ||
		(props.participant.isLocal ? false : !videoPub.isSubscribed);

	isMuted.value = !props.participant.isMicrophoneEnabled;

	// Attach existing tracks on mount
	props.participant.trackPublications.forEach((pub) => {
		if (pub.track) {
			handleTrackAttachment(pub);
		}
	});

	onUnmounted(() => {
		// Detach all listeners
		props.participant.removeAllListeners();
	});
});
</script>

<template>
	<div
		class="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-gray-800"
		:class="{ 'max-h-50': props.isSidebar }"
	>
		<video
			ref="videoEl"
			autoplay
			playsinline
			class="h-full w-full"
			:class="[props.isScreenShared ? 'object-contain' : 'object-cover']"
		></video>
		<audio
			ref="audioEl"
			autoplay
			playsinline
			:muted="participant.isLocal"
		></audio>

		<!-- Overlay for no video -->
		<div
			v-if="isVideoOff && !props.isScreenShared"
			class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50"
		>
			<div
				class="flex h-20 w-20 items-center justify-center rounded-full bg-gray-600 text-3xl font-bold"
			>
				{{ participant.name?.charAt(0).toUpperCase() }}
			</div>
			<p v-if="!props.isSidebar">{{ participant.name }}</p>
		</div>

		<!-- Name Badge -->
		<div
			class="absolute bottom-2 left-2 flex items-center gap-2 rounded-md bg-black/50 px-2 py-1 text-sm text-white"
		>
			<MicOff v-if="isMuted" class="h-4 w-4 text-red-500" />
			<span>{{
				participant.isLocal ? `Вы (${participant.name})` : participant.name
			}}</span>
		</div>
	</div>
</template>
