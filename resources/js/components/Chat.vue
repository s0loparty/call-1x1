<script setup lang="ts">
import { destroy as routeChatDestroy } from '@/routes/chat';
import { store as routeChatStore } from '@/routes/rooms/chat';
import { Room, User } from '@/types';
import { ChatMessage } from '@/types/chat';
import { usePage } from '@inertiajs/vue3';
import { useEcho } from '@laravel/echo-vue';
import axios from 'axios';
import { LoaderIcon, SendIcon, TrashIcon } from 'lucide-vue-next';
import { computed, nextTick, onMounted, ref } from 'vue';
import { Button } from './ui/button';
import { Input } from './ui/input';

// PROPS
const props = defineProps<{
	room: Room;
	initialMessages: ChatMessage[];
}>();

// REFS
const messages = ref(props.initialMessages);
const newMessage = ref('');
const chatContainer = ref<HTMLElement | null>(null);
const isSending = ref(false);
const isDeleting = ref(false);

// COMPUTED
const page = usePage();
const currentUser = computed(() => page.props.auth.user as User);
const isRoomOwner = computed(() => currentUser.value.id === props.room.user_id);

// FUNCTIONS
const scrollToBottom = () => {
	nextTick(() => {
		if (chatContainer.value) {
			chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
		}
	});
};

const sendMessage = async () => {
	if (newMessage.value.trim() === '') {
		return;
	}

	isSending.value = true;

	try {
		await axios.post(
			routeChatStore({ room: props.room.id, content: newMessage.value }).url,
			{
				content: newMessage.value,
			},
		);
		newMessage.value = '';
		// The UI will be updated via the websocket broadcast, not here.
	} catch (error) {
		console.error('Error sending message:', error);
		// You could add user-facing error handling here.
	} finally {
		isSending.value = false;
	}
};

const deleteMessage = async (messageId: number) => {
	if (!confirm('Are you sure you want to delete this message?')) {
		return;
	}

	isDeleting.value = true;

	try {
		await axios.delete(routeChatDestroy({ message: messageId }).url);
		// The UI will be updated via the websocket broadcast.
	} catch (error) {
		console.error('Error deleting message:', error);
		// You could add user-facing error handling here.
	} finally {
		isDeleting.value = false;
	}
};

// ECHo LISTENERS
useEcho(
	`rooms.${props.room.id}`,
	'.chat.message.sent',
	(e: { message: any }) => {
		messages.value.push(e.message);
		scrollToBottom();
	},
);

useEcho(
	`rooms.${props.room.id}`,
	'.chat.message.deleted',
	(e: { message_id: number }) => {
		const index = messages.value.findIndex((m) => m.id === e.message_id);
		if (index !== -1) {
			messages.value.splice(index, 1);
		}
	},
);

// LIFECYCLE
onMounted(() => {
	scrollToBottom();
});
</script>

<template>
	<div class="flex h-full flex-col rounded-md bg-neutral-800">
		<div class="border-b border-neutral-700 p-4">
			<h2 class="text-xl font-bold text-white">Room Chat</h2>
		</div>

		<div ref="chatContainer" class="flex-1 overflow-y-auto p-4">
			<div
				v-if="messages.length === 0"
				class="flex h-full items-center justify-center"
			>
				<p class="text-gray-500">сообщений нет</p>
			</div>
			<div v-else class="space-y-4">
				<div v-for="message in messages" :key="message.id" class="group">
					<div
						class="flex items-start"
						:class="{ 'justify-end': message.user.id === currentUser.id }"
					>
						<div
							class="relative flex flex-col"
							:class="{ 'items-end': message.user.id === currentUser.id }"
						>
							<div
								class="max-w-xs rounded-md px-3 py-1.5 lg:max-w-md"
								:class="{
									'bg-indigo-500 text-white':
										message.user.id === currentUser.id,
									'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200':
										message.user.id !== currentUser.id,
								}"
							>
								<p
									class="text-sm font-bold"
									v-if="message.user.id !== currentUser.id"
								>
									{{ message.user.name }}
								</p>
								<p class="text-sm">{{ message.content }}</p>
							</div>
							<span class="text-xs text-gray-500">
								{{ new Date(message.created_at).toLocaleTimeString() }}
							</span>

							<Button
								v-if="isRoomOwner"
								@click="deleteMessage(message.id)"
								class="absolute top-2 size-4 p-3 opacity-0 group-hover:opacity-100"
								variant="destructive"
								:class="[
									message.user.id === currentUser.id ? '-left-8' : '-right-8',
								]"
								:disbled="isDeleting"
							>
								<LoaderIcon v-if="isDeleting" class="size-3" />
								<TrashIcon v-else class="size-3" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="border-t border-neutral-700 p-4">
			<form @submit.prevent="sendMessage">
				<div class="flex items-center gap-x-2">
					<Input
						v-model.trim="newMessage"
						placeholder="Текст сообщения"
						:disabled="!currentUser"
						class="border-neutral-700"
					/>
					<Button
						:disabled="isSending || !currentUser"
						type="submit"
						size="icon"
					>
						<LoaderIcon v-if="isSending" class="animate-spin" />
						<SendIcon v-else />
					</Button>
				</div>
			</form>
		</div>
	</div>
</template>
