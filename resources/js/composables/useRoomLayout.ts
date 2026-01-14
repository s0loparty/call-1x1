import {
	LocalParticipant,
	Participant,
	RemoteParticipant,
	Track,
} from 'livekit-client';
import type { Ref } from 'vue';
import { computed } from 'vue';

export function useRoomLayout(
	remoteParticipants: Ref<RemoteParticipant[]>,
	localParticipant: Ref<LocalParticipant | null>,
) {
	// Combine local and remote participants for easier layout logic
	const allParticipants = computed(() => {
		const all: Participant[] = [];
		if (localParticipant.value) {
			all.push(localParticipant.value);
		}
		all.push(...remoteParticipants.value);
		return all;
	});

	const screenShareParticipant = computed<Participant | null>(() => {
		return allParticipants.value.find((p) => p.isScreenShareEnabled) ?? null;
	});

	const galleryParticipants = computed<Participant[]>(() => {
		if (!screenShareParticipant.value) {
			return allParticipants.value;
		}
		return allParticipants.value.filter(
			(p) => p.identity !== screenShareParticipant.value!.identity,
		);
	});

	const getParticipantTracks = (participant: Participant) => {
		const tracks = Array.from(participant.trackPublications.values())
			.map((pub) => pub.track)
			.filter(Boolean);
		return {
			camera: tracks.find((t) => t?.source === Track.Source.Camera),
			microphone: tracks.find((t) => t?.source === Track.Source.Microphone),
			screenShare: tracks.find((t) => t?.source === Track.Source.ScreenShare),
			screenShareAudio: tracks.find(
				(t) => t?.source === Track.Source.ScreenShareAudio,
			),
		};
	};

	return {
		allParticipants,
		screenShareParticipant,
		galleryParticipants,
		getParticipantTracks,
	};
}
