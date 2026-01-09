<script setup lang="ts">
import ActiveCallUI from '@/components/ActiveCallUI.vue';
import ActiveVideoCallUI from '@/components/ActiveVideoCallUI.vue';
import IncomingCallDialog from '@/components/IncomingCallDialog.vue';
import IncomingVideoCallDialog from '@/components/IncomingVideoCallDialog.vue';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { useCall } from '@/composables/useCall';
import AppLayout from '@/layouts/AppLayout.vue';
import { dashboard } from '@/routes';
import type { BreadcrumbItem, User } from '@/types';
import { Head, usePage } from '@inertiajs/vue3';
import { useEchoPublic } from '@laravel/echo-vue';
import axios from 'axios';
import { Phone, Video } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import DialTone from '../../assets/gudki.mp3';

interface Props {
	users: User[];
	onlineUserIds: Record<number, boolean>;
}
const props = defineProps<Props>();

const page = usePage();
const authUser = page.props.auth.user as User;

// Dashboard is the master component that initializes and controls the call service
const {
	callState,
	callType,
	localStream,
	remoteStream,
	otherUserId,
	isMuted,
	isVideoEnabled,
	incomingCall,
	initiateCall,
	acceptCall,
	rejectCall,
	hangUp,
	toggleMute,
	toggleVideo,
} = useCall(authUser.id);

const dialToneAudio = ref<HTMLAudioElement | null>(null);
// Initialize online users from the server-sent prop
const onlineUserIds = ref(
	new Set<number>(Object.keys(props.onlineUserIds).map(Number)),
);

const isUserOnline = (userId: number) => onlineUserIds.value.has(userId);

// Create a Map for efficient user lookup by ID
const usersById = computed(
	() => new Map(props.users.map((user) => [user.id, user])),
);

const otherUserName = computed(() => {
	if (!otherUserId.value) return 'Unknown User';
	return (
		usersById.value.get(otherUserId.value)?.name ??
		`User ID: ${otherUserId.value}`
	);
});

const incomingCallerName = computed(() => {
	if (!incomingCall.value) return 'Unknown Caller';
	const callerId = incomingCall.value.from_user_id;
	return usersById.value.get(callerId)?.name ?? `User ID: ${callerId}`;
});

watch(callState, (newState, oldState) => {
	if (!dialToneAudio.value) return;

	if (newState === 'outgoing') {
		dialToneAudio.value
			.play()
			.catch((e) => console.error('Dial tone playback failed:', e));
	} else if (oldState === 'outgoing') {
		dialToneAudio.value.pause();
		dialToneAudio.value.currentTime = 0;
	}
});

// Listen for real-time status updates
useEchoPublic(
	'user-status',
	'UserStatusChanged',
	(event: { userId: number; status: 'online' | 'offline' }) => {
		console.log('User status changed:', event);
		if (event.status === 'online') {
			onlineUserIds.value.add(event.userId);
		} else {
			onlineUserIds.value.delete(event.userId);
		}
	},
);

const handleGoOffline = () => {
	axios.post('/users/offline');
};

onMounted(() => {
	axios.post('/users/online');
	window.addEventListener('beforeunload', handleGoOffline);
});

onUnmounted(() => {
	handleGoOffline();
	window.removeEventListener('beforeunload', handleGoOffline);
});

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Dashboard',
		href: dashboard().url,
	},
];
</script>

<template>
	<Head title="Dashboard" />

	<AppLayout :breadcrumbs="breadcrumbs">
		<div class="p-4">
			<h1 class="mb-4 text-2xl font-bold">Users</h1>
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<div
					v-for="user in props.users"
					:key="user.id"
					class="flex flex-col gap-4 rounded-lg border p-4"
				>
					<div class="flex items-center gap-3">
						<span class="relative flex h-3 w-3">
							<span
								v-if="isUserOnline(user.id)"
								class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
							></span>
							<span
								:class="{
									'bg-green-500': isUserOnline(user.id),
									'bg-gray-400': !isUserOnline(user.id),
								}"
								class="relative inline-flex h-3 w-3 rounded-full"
							></span>
						</span>
						<div>
							<p class="font-semibold">{{ user.name }}</p>
							<p class="text-sm text-muted-foreground">
								{{ user.email }}
							</p>
						</div>
					</div>

					<div class="flex flex-wrap gap-3">
						<Button
							:disabled="callState !== 'idle' || !isUserOnline(user.id)"
							size="sm"
							variant="outline"
							@click="initiateCall(user.id, 'audio')"
						>
							<Phone class="mr-2 h-4 w-4" />
							Аудиозвонок
						</Button>
						<Button
							:disabled="callState !== 'idle' || !isUserOnline(user.id)"
							size="sm"
							variant="outline"
							@click="initiateCall(user.id, 'video')"
						>
							<Video class="mr-2 h-4 w-4" />
							Видеозвонок
						</Button>
					</div>
				</div>
			</div>
			<div
				v-if="!props.users.length"
				class="mt-8 text-center text-muted-foreground"
			>
				Нет других доступных пользователей для звонка.
			</div>
		</div>

		<!-- Call UI Components -->
		<ActiveVideoCallUI
			v-if="callType === 'video'"
			:call-state="callState"
			:local-stream="localStream"
			:remote-stream="remoteStream"
			:other-user-name="otherUserName"
			:is-muted="isMuted"
			:is-video-enabled="isVideoEnabled"
			@hang-up="hangUp"
			@toggle-mute="toggleMute"
			@toggle-video="toggleVideo"
		/>
		<IncomingVideoCallDialog
			v-if="callType === 'video'"
			:call-state="callState"
			:caller-name="incomingCallerName"
			@accept="acceptCall"
			@reject="rejectCall"
		/>

		<!-- Audio Call Components -->
		<ActiveCallUI
			v-if="callType !== 'video'"
			:call-state="callState"
			:remote-stream="remoteStream"
			:other-user-name="otherUserName"
			:is-muted="isMuted"
			@hang-up="hangUp"
			@toggle-mute="toggleMute"
		/>
		<IncomingCallDialog
			v-if="callType !== 'video'"
			:call-state="callState"
			:caller-name="incomingCallerName"
			@accept="acceptCall"
			@reject="rejectCall"
		/>

		<Toaster expand />

		<!-- Audio element for dial tone -->
		<audio
			ref="dialToneAudio"
			:src="DialTone"
			loop
			preload="auto"
			volume="0.1"
		></audio>
	</AppLayout>
</template>
