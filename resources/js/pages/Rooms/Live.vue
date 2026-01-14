<script setup lang="ts">
import * as rooms from '@/routes/rooms';
import type { Room, User } from '@/types';
import type { ChatMessage } from '@/types/chat';
import { Head, router } from '@inertiajs/vue3';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

// Composables
import { useLiveKit } from '@/composables/useLiveKit';
import { useRoomLayout } from '@/composables/useRoomLayout';

// Components
import Chat from '@/components/Chat.vue';
import ParticipantTile from '@/components/ParticipantTile.vue';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Fullscreen,
	MessageSquare,
	Mic,
	MicOff,
	Minimize,
	PhoneOff,
	ScreenShare,
	ScreenShareOff,
	Video,
	VideoOff,
} from 'lucide-vue-next';

interface Props {
	room: Room & { user: User };
	livekitToken: string;
	livekitHost: string;
	chatMessages: ChatMessage[];
}
const props = defineProps<Props>();

const isChatOpen = ref(false);
const mainViewRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

const {
	localParticipant,
	remoteParticipants,
	isConnected,
	error,
	isCameraEnabled,
	isMicrophoneEnabled,
	isScreenShareEnabled,
	connect,
	disconnect,
	toggleCamera,
	toggleMicrophone,
	toggleScreenShare,
	...oth
} = useLiveKit(
	props.livekitToken,
	props.livekitHost,
	props.room.livekit_room_name,
);

watch(
	() => oth,
	(v) => {
		console.log('oth', v);
	},
	{ deep: true },
);

const { screenShareParticipant, galleryParticipants, allParticipants } =
	useRoomLayout(remoteParticipants as any, localParticipant as any);

const participantsForAside = computed(() => {
	return screenShareParticipant.value
		? galleryParticipants.value
		: allParticipants.value;
});

const asideClasses = computed(() => {
	if (screenShareParticipant.value) {
		return 'hidden w-60 space-y-2 overflow-y-auto bg-gray-900 p-2 lg:block';
	}
	const count = allParticipants.value.length;
	return `grid flex-1 gap-4 p-4 grid-cols-1 ${
		count > 1 ? 'md:grid-cols-2' : ''
	} ${count > 4 ? 'lg:grid-cols-3' : ''} ${count > 9 ? 'xl:grid-cols-4' : ''}`;
});

const toggleFullscreen = () => {
	if (!mainViewRef.value) return;

	if (!document.fullscreenElement) {
		mainViewRef.value.requestFullscreen();
	} else {
		document.exitFullscreen();
	}
};

const onFullscreenChange = () => {
	isFullscreen.value = !!document.fullscreenElement;
};

onMounted(() => {
	connect();
	document.addEventListener('fullscreenchange', onFullscreenChange);
});

onUnmounted(() => {
	document.removeEventListener('fullscreenchange', onFullscreenChange);
});

const handleDisconnect = () => {
	disconnect();
	router.get(rooms.index().url);
};
</script>

<template>
	<Head :title="props.room.name" />
	<div class="fixed inset-0 flex flex-col bg-black text-white">
		<!-- Connecting / Error States -->
		<div v-if="!isConnected" class="flex flex-1 items-center justify-center">
			<div v-if="error" class="text-center">
				<h2 class="mb-4 text-2xl font-bold text-red-500">Ошибка подключения</h2>
				<p class="max-w-md">{{ error.message }}</p>
				<Button @click="connect" class="mt-4">Попробовать снова</Button>
			</div>
			<div v-else>
				<h2 class="animate-pulse text-2xl font-bold">
					Подключение к комнате...
				</h2>
			</div>
		</div>

		<!-- Main Connected UI -->
		<div v-else class="flex flex-1 overflow-hidden">
			<!-- Main View (for Screen Share ONLY) -->
			<main
				v-if="screenShareParticipant"
				ref="mainViewRef"
				class="group relative flex flex-1 items-center justify-center bg-gray-900/50 p-4"
			>
				<ParticipantTile
					:key="screenShareParticipant.identity"
					:participant="screenShareParticipant"
					is-screen-shared
				/>
				<div class="absolute top-4 right-4">
					<Button
						@click="toggleFullscreen"
						variant="secondary"
						size="icon"
						class="opacity-0 transition-opacity group-hover:opacity-100"
					>
						<Minimize v-if="isFullscreen" class="h-6 w-6" />
						<Fullscreen v-else class="h-6 w-6" />
					</Button>
				</div>
			</main>

			<!-- Participants Area (Sidebar or Full Grid) -->
			<aside :class="asideClasses">
				<ParticipantTile
					v-for="p in participantsForAside"
					:key="p.identity"
					:participant="p"
					:is-sidebar="!!screenShareParticipant"
				/>
			</aside>

			<!-- Controls -->
			<div
				class="absolute top-1/2 right-0 flex -translate-y-1/2 flex-col items-center gap-5 rounded-full bg-black/50 p-3"
			>
				<Button
					@click="toggleMicrophone"
					variant="secondary"
					size="icon"
					class="h-10 w-10 rounded-full md:h-12 md:w-12"
				>
					<Mic v-if="isMicrophoneEnabled" class="h-5 w-5 md:h-6 md:w-6" />
					<MicOff v-else class="h-5 w-5 text-red-500 md:h-6 md:w-6" />
				</Button>
				<Button
					@click="toggleCamera"
					variant="secondary"
					size="icon"
					class="h-10 w-10 rounded-full md:h-12 md:w-12"
				>
					<Video v-if="isCameraEnabled" class="h-5 w-5 md:h-6 md:w-6" />
					<VideoOff v-else class="h-5 w-5 text-red-500 md:h-6 md:w-6" />
				</Button>
				<Button
					@click="isChatOpen = true"
					variant="secondary"
					size="icon"
					class="h-10 w-10 rounded-full md:h-12 md:w-12"
				>
					<MessageSquare class="h-5 w-5 md:h-6 md:w-6" />
				</Button>
				<Button
					@click="toggleScreenShare"
					variant="secondary"
					size="icon"
					class="h-10 w-10 rounded-full md:h-12 md:w-12"
				>
					<ScreenShare
						v-if="!isScreenShareEnabled"
						class="h-5 w-5 md:h-6 md:w-6"
					/>
					<ScreenShareOff v-else class="h-5 w-5 text-red-500 md:h-6 md:w-6" />
				</Button>
				<Button
					@click="handleDisconnect"
					variant="destructive"
					size="icon"
					class="h-10 w-10 rounded-full md:h-12 md:w-12"
				>
					<PhoneOff class="h-5 w-5 md:h-6 md:w-6" />
				</Button>
			</div>
		</div>

		<!-- Chat Dialog -->
		<Dialog :open="isChatOpen" @update:open="isChatOpen = $event">
			<DialogContent
				class="flex h-[80vh] w-[90vw] max-w-md flex-col border-neutral-800 bg-neutral-800 p-0"
			>
				<DialogHeader class="border-b border-neutral-700 p-4">
					<DialogTitle class="text-white">Чат комнаты</DialogTitle>
				</DialogHeader>
				<div class="flex-1 overflow-hidden">
					<Chat :room="props.room" :initial-messages="props.chatMessages" />
				</div>
			</DialogContent>
		</Dialog>
	</div>
</template>
