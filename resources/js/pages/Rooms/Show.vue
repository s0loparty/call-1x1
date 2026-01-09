<script setup lang="ts">
import InputError from '@/components/InputError.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useLiveKitRoom } from '@/composables/useLiveKitRoom';
import RoomGroupLayout from '@/layouts/RoomGroupLayout.vue';
import * as rooms from '@/routes/rooms';
import type { BreadcrumbItem, Room, User } from '@/types';
import { Head, Link } from '@inertiajs/vue3';
import {
	CircleAlertIcon,
	Mic,
	MicOff,
	PhoneOff,
	Video,
	VideoOff,
} from 'lucide-vue-next';
import { onMounted, onUnmounted, ref, watch } from 'vue';

type Step = 'lobby' | 'password' | 'connecting' | 'connected' | 'error';

interface Props {
	room: Room & { user: User };
	errors: Record<string, string>;
}

const props = defineProps<Props>();

const {
	participants,
	localParticipant,
	localVideoTrack,
	isMicMuted,
	isCameraOff,
	connecting,
	errorMessage,
	remoteTrackMutedStatus,
	audioDevices,
	videoDevices,
	selectedAudioDeviceId,
	selectedVideoDeviceId,
	lobbyVideoTrack,
	isLobbyInitialized,
	remoteParticipantUpdateCounter,
	connect,
	disconnect,
	toggleMicrophone,
	toggleCamera,
	initLobby,
	setSelectedAudioDeviceId,
	setSelectedVideoDeviceId,
} = useLiveKitRoom();

const localVideoElement = ref<HTMLVideoElement | null>(null);
const lobbyVideoElement = ref<HTMLVideoElement | null>(null);
const password = ref('');
const step = ref<Step>('lobby');

// Watcher for the main video call track
watch(
	[localVideoTrack, localVideoElement],
	([newTrack, videoEl], [oldTrack]) => {
		if (oldTrack && videoEl) {
			oldTrack.detach(videoEl);
		}
		if (newTrack && videoEl) {
			newTrack.attach(videoEl);
		}
	},
);

// Watcher for the lobby preview track
watch(
	[lobbyVideoTrack, lobbyVideoElement],
	([newTrack, videoEl], [oldTrack]) => {
		if (oldTrack && videoEl) {
			oldTrack.detach(videoEl);
		}
		if (newTrack && videoEl) {
			newTrack.attach(videoEl);
		}
	},
);

watch(connecting, (isConnecting) => {
	if (isConnecting) {
		step.value = 'connecting';
	}
});

watch(errorMessage, (newError) => {
	if (newError) {
		step.value = 'error';
	}
});

watch(localParticipant, (newParticipant) => {
	if (newParticipant) {
		step.value = 'connected';
	}
});

async function handleJoin() {
	if (props.room.is_private) {
		step.value = 'password';
	} else {
		await connect(props.room);
	}
}

async function submitPassword() {
	await connect(props.room, password.value);
}

onMounted(async () => {
	await initLobby();
	if (props.errors && props.errors.password) {
		step.value = 'password';
	}
});

onUnmounted(() => {
	disconnect();
});

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Комнаты',
		href: rooms.index().url,
	},
	{
		title: props.room.name,
		href: rooms.show(props.room.slug).url,
	},
];
</script>

<template>
	<Head :title="props.room.name" />

	<RoomGroupLayout :breadcrumbs="breadcrumbs">
		<div class="fixed inset-0 z-10 bg-black/80 backdrop-blur-xs">
			<!-- Lobby Step -->
			<div v-if="step === 'lobby'" class="lobby-container">
				<Card class="w-[90%] gap-4 md:max-w-lg">
					<CardHeader class="text-lg font-bold">
						Настройки перед входом
					</CardHeader>
					<CardContent class="space-y-5">
						<Alert>
							<CircleAlertIcon />
							<AlertTitle> Подключение к комнате </AlertTitle>
							<AlertDescription>
								При подключение к комнате, ваша камера по умолчанию будет
								отключена
							</AlertDescription>
						</Alert>

						<div class="video-preview">
							<video
								ref="lobbyVideoElement"
								autoplay
								muted
								playsinline
								class="h-full w-full object-cover"
							></video>
							<div v-if="!lobbyVideoTrack" class="no-video-overlay">
								<VideoOff class="h-12 w-12 text-gray-400" />
								<p class="mt-2 px-4 text-center text-gray-400">
									Камера не выбрана или недоступна
								</p>
							</div>
						</div>
						<div v-if="isLobbyInitialized" class="device-selectors">
							<div class="device-select">
								<label for="mic-select">Микрофон</label>
								<Select
									v-model="selectedAudioDeviceId"
									id="mic-select"
									@change="
										setSelectedAudioDeviceId(
											($event.target as HTMLSelectElement).value,
										)
									"
									:disabled="!audioDevices.length"
								>
									<SelectTrigger class="w-max-sm w-full">
										<SelectValue placeholder="Выбрать микрофон" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem
											v-for="device in audioDevices"
											:key="device.deviceId"
											:value="device.deviceId"
										>
											{{ device.label }}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div class="device-select">
								<label for="cam-select">Камера</label>
								<Select
									v-model="selectedVideoDeviceId"
									id="cam-select"
									@change="
										setSelectedVideoDeviceId(
											($event.target as HTMLSelectElement).value,
										)
									"
									:disabled="!audioDevices.length"
								>
									<SelectTrigger class="w-max-sm w-full">
										<SelectValue placeholder="Выбрать камеру" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem
											v-for="device in videoDevices"
											:key="device.deviceId"
											:value="device.deviceId"
										>
											{{ device.label }}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div v-else class="text-center text-gray-400">
							Загрузка устройств...
						</div>

						<div class="space-y-2">
							<Button
								@click="handleJoin"
								class="w-full"
								:disabled="!isLobbyInitialized"
							>
								Присоединиться
							</Button>
							<Button
								class="w-full"
								variant="secondary"
								:as="Link"
								:href="rooms.index().url"
							>
								Отмена
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<!-- Password Step -->
			<div v-else-if="step === 'password'" class="password-prompt">
				<form
					@submit.prevent="submitPassword"
					class="w-full max-w-sm space-y-4 rounded-lg bg-card p-6 shadow-lg"
				>
					<h2 class="text-center text-xl font-bold">Введите пароль комнаты</h2>
					<Input
						id="room-password"
						type="password"
						v-model="password"
						placeholder="Пароль"
						class="input-style"
					/>
					<InputError :message="props.errors.password" class="mt-2" />
					<Button type="submit" class="w-full">Войти</Button>
				</form>
			</div>

			<!-- Connecting Step -->
			<div v-else-if="step === 'connecting'" class="flex-center-container">
				<p>Подключение к комнате...</p>
			</div>

			<!-- Error Step -->
			<div v-else-if="step === 'error'" class="flex-center-container">
				<div class="text-center text-red-500">
					<p class="mb-4">{{ errorMessage }}</p>
					<Button
						@click="
							step = props.room.is_private ? 'password' : 'lobby';
							errorMessage = '';
						"
					>
						Попробовать снова
					</Button>
				</div>
			</div>

			<!-- Connected Step (Main Room UI) -->
			<div v-else-if="step === 'connected'" class="video-grid-container">
				<div class="video-grid">
					<!-- Local Participant -->
					<div v-if="localParticipant" class="participant-tile">
						<video
							ref="localVideoElement"
							autoplay
							muted
							playsinline
							class="video-element"
						></video>
						<div class="participant-name-badge">Вы</div>
						<div class="video-off-overlay" v-if="isCameraOff">
							<span class="text-white">Камера выключена</span>
						</div>
					</div>

					<!-- Remote Participants -->
					<div
						v-for="participant in participants"
						:key="`${participant.identity}-${remoteParticipantUpdateCounter}`"
						class="participant-tile"
					>
						<template
							v-for="publication in Array.from(
								participant.trackPublications.values(),
							).filter((pub) => pub.kind === 'video')"
							:key="publication.trackSid"
						>
							<video
								v-if="
									publication.isSubscribed &&
									publication.videoTrack &&
									!remoteTrackMutedStatus?.[participant.identity]?.[
										publication.trackSid
									]
								"
								:ref="
									(el) => {
										if (el)
											publication.videoTrack?.attach(el as HTMLVideoElement);
									}
								"
								autoplay
								playsinline
								class="video-element"
							></video>
							<div v-else class="video-off-overlay">
								<span class="text-white">Камера выключена</span>
							</div>
						</template>
						<div class="participant-name-badge">
							{{ participant.name || participant.identity }}
						</div>
						<!-- Audio for remote participant -->
						<template
							v-for="publication in Array.from(
								participant.trackPublications.values(),
							).filter((pub) => pub.kind === 'audio')"
							:key="publication.trackSid"
						>
							<audio
								v-if="
									publication.isSubscribed &&
									publication.audioTrack &&
									!publication.isMuted
								"
								:ref="
									(el) => {
										if (el)
											publication.audioTrack?.attach(el as HTMLAudioElement);
									}
								"
								autoplay
							></audio>
						</template>
					</div>
				</div>

				<!-- Controls -->
				<div class="controls-overlay">
					<Button
						@click="toggleMicrophone"
						variant="secondary"
						size="icon"
						class="rounded-full"
					>
						<Mic v-if="!isMicMuted" class="h-6 w-6" />
						<MicOff v-else class="h-6 w-6 text-red-500" />
					</Button>
					<Button
						@click="toggleCamera"
						variant="secondary"
						size="icon"
						class="rounded-full"
					>
						<Video v-if="!isCameraOff" class="h-6 w-6" />
						<VideoOff v-else class="h-6 w-6 text-red-500" />
					</Button>
					<Button
						@click="disconnect"
						variant="destructive"
						size="icon"
						class="rounded-full"
					>
						<PhoneOff class="h-6 w-6" />
					</Button>
				</div>
			</div>
		</div>
	</RoomGroupLayout>
</template>

<style scoped>
.full-screen-container {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #1a202c; /* Equivalent to bg-gray-900 */
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
}

.lobby-container,
.password-prompt,
.flex-center-container {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.lobby-content {
	background-color: #2d3748; /* bg-gray-800 */
	padding: 2rem;
	border-radius: 0.5rem;
	width: 100%;
	max-width: 500px;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.video-preview {
	position: relative;
	width: 100%;
	aspect-ratio: 16 / 9;
	background-color: #111827; /* bg-gray-900 */
	border-radius: 0.5rem;
	overflow: hidden;
}

.no-video-overlay {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.device-selectors {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.device-select {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.input-style {
	background-color: #4a5568; /* bg-gray-700 */
	border: 1px solid #718096; /* bg-gray-600 */
	color: white;
	border-radius: 0.375rem;
	padding: 0.5rem 0.75rem;
	width: 100%;
}

.video-grid-container {
	width: 100%;
	height: 100%;
	position: relative;
}

.video-grid {
	width: 100%;
	height: max-content;
	max-height: 100dvh;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: 0.5rem;
	padding: 0.5rem;
}

.participant-tile {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	border-radius: 0.5rem;
	background-color: #2d3748; /* bg-gray-800 */
	max-height: 500px;
	min-height: 300px;
}

.video-element {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.participant-name-badge {
	color: white;
	position: absolute;
	bottom: 0.5rem;
	left: 0.5rem;
	background-color: rgba(0, 0, 0, 0.5);
	padding: 0.25rem 0.5rem;
	border-radius: 0.375rem;
	font-size: 0.875rem;
}

.video-off-overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #111827; /* bg-gray-900 */
}

.controls-overlay {
	position: absolute;
	bottom: 1rem;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	gap: 1rem;
	background-color: rgba(0, 0, 0, 0.7);
	padding: 0.75rem;
	border-radius: 9999px;
}
</style>
