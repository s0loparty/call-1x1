<script setup lang="ts">
import InputError from '@/components/InputError.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import axios from 'axios';
import { Track } from 'livekit-client';
import {
	CircleAlertIcon,
	Copy,
	Fullscreen,
	Mic,
	MicOff,
	PhoneOff,
	ScreenShare,
	ScreenShareOff,
	UserPlus,
	Video,
	VideoOff,
} from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

type Step = 'lobby' | 'password' | 'connecting' | 'connected' | 'error';

interface Props {
	room: Room & { user: User };
	errors: Record<string, string>;
	auth: {
		user: User;
	};
}

const props = defineProps<Props>();

const {
	participants,
	localParticipant,
	localVideoTrack,
	isMicMuted,
	isCameraOff,
	isScreenSharing,
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
	toggleScreenShare,
	initLobby,
	setSelectedAudioDeviceId,
	setSelectedVideoDeviceId,
} = useLiveKitRoom();

const localVideoElement = ref<HTMLVideoElement | null>(null);
const lobbyVideoElement = ref<HTMLVideoElement | null>(null);
const password = ref('');
const step = ref<Step>('lobby');

// --- Invite Modal State ---
const isInviteModalOpen = ref(false);
const inviteLink = ref('');
const generatingLink = ref(false);
const copied = ref(false);

// --- Computed Properties for UI Layout ---
const allParticipants = computed(() =>
	[localParticipant.value, ...participants.value].filter(
		(p): p is NonNullable<typeof p> => p !== null,
	),
);

// const isSomeoneScreenSharing = computed(() =>
// 	allParticipants.value.some((p) => p.isScreenShareEnabled),
// );
const isSomeoneScreenSharing = computed(
	() => screenShareParticipants.value.length > 0,
);

// const screenShareParticipants = computed(() =>
// 	allParticipants.value.filter((p) => p.isScreenShareEnabled),
// );
const screenShareParticipants = computed(() =>
	allParticipants.value.filter((p) =>
		[...p.videoTrackPublications.values()].some(
			(pub) =>
				pub.source === Track.Source.ScreenShare &&
				pub.isSubscribed &&
				pub.videoTrack,
		),
	),
);

const cameraParticipants = computed(() => allParticipants.value);

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

function toggleFullscreen(event: MouseEvent) {
	const tile = (event.currentTarget as HTMLElement).closest(
		'.participant-tile, .participant-tile-sidebar',
	);
	if (!tile) return;

	if (!document.fullscreenElement) {
		tile.requestFullscreen().catch((err) => {
			console.error(
				`Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
			);
		});
	} else {
		document.exitFullscreen();
	}
}

async function generateAndShowInviteLink() {
	generatingLink.value = true;
	try {
		const response = await axios.post(rooms.invite(props.room.slug).url);
		inviteLink.value = response.data.invite_link;
		isInviteModalOpen.value = true;
	} catch (error) {
		console.error('Failed to generate invite link:', error);
		alert('Не удалось сгенерировать ссылку для приглашения.');
	} finally {
		generatingLink.value = false;
	}
}

function copyInviteLink() {
	if (inviteLink.value) {
		navigator.clipboard.writeText(inviteLink.value).then(() => {
			copied.value = true;
			setTimeout(() => (copied.value = false), 2000);
		});
	}
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
					<CardHeader class="gap-0 text-lg font-bold">
						Настройки перед входом
					</CardHeader>
					<CardContent class="space-y-5">
						<Alert>
							<CircleAlertIcon />
							<AlertTitle class="text-base"> Подключение к комнате </AlertTitle>
							<AlertDescription class="leading-5">
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
							<div class="grid gap-4 sm:grid-cols-2">
								<div class="device-select">
									<label for="mic-select">Микрофон</label>
									<Select
										v-if="audioDevices.length"
										v-model="selectedAudioDeviceId"
										id="mic-select"
										@change="
											setSelectedAudioDeviceId(
												($event.target as HTMLSelectElement).value,
											)
										"
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
									<p v-else class="-mt-2 text-sm leading-3.5 text-red-500">
										У вас нет микрофона или нет доступа к нему
									</p>
								</div>
								<div class="device-select">
									<label for="cam-select">Камера</label>
									<Select
										v-if="videoDevices.length"
										v-model="selectedVideoDeviceId"
										id="cam-select"
										@change="
											setSelectedVideoDeviceId(
												($event.target as HTMLSelectElement).value,
											)
										"
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
									<p v-else class="-mt-2 text-sm leading-3.5 text-red-500">
										У вас нет камеры или нет доступа к ней
									</p>
								</div>
							</div>
						</div>
						<div v-else class="text-center text-gray-400">
							Загрузка устройств...
						</div>

						<div class="grid grid-cols-2 gap-3">
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
				<!-- Zoom-like Layout for Screenshare -->
				<div
					v-if="isSomeoneScreenSharing"
					class="flex h-full w-full flex-col p-2 md:flex-row"
				>
					<!-- Main Stage (Screen share) -->
					<!-- MAIN STAGE -->
					<div class="grow">
						<div
							v-for="p in screenShareParticipants"
							:key="p.identity"
							class="participant-tile h-full w-full"
						>
							<template
								v-for="pub in [...p.videoTrackPublications.values()].filter(
									(pub) => pub.source === Track.Source.ScreenShare,
								)"
								:key="pub.trackSid"
							>
								<video
									v-if="pub.isSubscribed && pub.videoTrack"
									:ref="
										(el) => el && pub.videoTrack?.attach(el as HTMLMediaElement)
									"
									autoplay
									playsinline
									class="video-element-screenshare"
								/>
							</template>

							<div class="participant-name-badge">
								Демонстрация: {{ p.name || p.identity }}
							</div>
						</div>
					</div>

					<!-- Sidebar (Participant Cameras) -->
					<div
						class="flex h-48 w-full flex-row space-x-2 p-2 md:h-full md:w-64 md:flex-col md:space-y-2 md:space-x-0 md:p-0 md:pl-2"
					>
						<div class="h-full w-full shrink-0 overflow-y-auto md:h-auto">
							<div
								class="flex h-full flex-row gap-2 md:flex-col"
								:key="remoteParticipantUpdateCounter"
							>
								<!-- All participants -->
								<div
									v-for="p in cameraParticipants"
									:key="p.identity"
									class="participant-tile-sidebar"
								>
									<div class="tile-controls">
										<Button
											@click="toggleFullscreen"
											variant="ghost"
											size="icon"
											class="fullscreen-btn"
											title="На весь экран"
										>
											<Fullscreen class="h-5 w-5" />
										</Button>
									</div>

									<!-- Logic for local participant -->
									<template v-if="p.isLocal">
										<video
											v-if="localVideoTrack"
											:ref="
												(el) => {
													if (el)
														localVideoTrack?.attach(el as HTMLVideoElement);
													else localVideoTrack?.detach();
												}
											"
											autoplay
											muted
											playsinline
											class="video-element"
										></video>
										<div v-if="isCameraOff" class="video-off-overlay">
											<VideoOff class="h-8 w-8" />
										</div>
									</template>
									<!-- Logic for remote participants -->
									<template v-else>
										<!-- Find camera track -->
										<template
											v-for="pub in [
												...p.videoTrackPublications.values(),
											].filter((pub) => pub.source === Track.Source.Camera)"
											:key="pub.trackSid"
										>
											<video
												v-if="
													pub.isSubscribed &&
													pub.videoTrack &&
													!remoteTrackMutedStatus?.[p.identity]?.[pub.trackSid]
												"
												:ref="
													(el) => {
														if (el)
															pub.videoTrack?.attach(el as HTMLVideoElement);
														else pub.videoTrack?.detach();
													}
												"
												autoplay
												muted
												playsinline
												class="video-element"
											></video>
											<div class="video-off-overlay" v-else>
												<VideoOff class="h-8 w-8" />
											</div>
										</template>
										<!-- Show overlay if no camera track exists at all -->
										<div
											v-if="
												![...p.videoTrackPublications.values()].some(
													(pub) => pub.source === Track.Source.Camera,
												)
											"
											class="video-off-overlay"
										>
											<VideoOff class="h-8 w-8" />
										</div>
									</template>

									<div class="participant-name-badge">
										{{ p.isLocal ? `Вы (${p.name})` : p.name }}
									</div>

									<!-- Audio for remote participant -->
									<div v-if="!p.isLocal">
										<template
											v-for="publication in [
												...p.trackPublications.values(),
											].filter((pub) => pub.kind === 'audio')"
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
															publication.audioTrack?.attach(
																el as HTMLAudioElement,
															);
														else publication.audioTrack?.detach();
													}
												"
												autoplay
											></audio>
										</template>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Original Grid Layout -->
				<div v-else class="video-grid">
					<!-- Local Participant -->
					<div v-if="localParticipant" class="participant-tile">
						<div class="tile-controls">
							<Button
								@click="toggleFullscreen"
								variant="ghost"
								size="icon"
								class="fullscreen-btn"
								title="На весь экран"
							>
								<Fullscreen class="h-5 w-5" />
							</Button>
						</div>
						<video
							ref="localVideoElement"
							autoplay
							muted
							playsinline
							class="video-element"
						></video>
						<div class="participant-name-badge">
							Вы ({{ props.auth.user.name }})
						</div>
						<div class="video-off-overlay" v-if="isCameraOff">
							<span class="text-white">(Вы) Камера выключена</span>
						</div>
					</div>

					<!-- Remote Participants -->
					<div
						v-for="participant in participants"
						:key="`${participant.identity}-${remoteParticipantUpdateCounter}`"
						class="participant-tile"
						:class="{
							'is-screenshare': participant.isScreenShareEnabled,
						}"
					>
						<div class="tile-controls">
							<Button
								@click="toggleFullscreen"
								variant="ghost"
								size="icon"
								class="fullscreen-btn"
								title="На весь экран"
							>
								<Fullscreen class="h-5 w-5" />
							</Button>
						</div>
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
								:class="{
									'share-user': publication.source !== Track.Source.ScreenShare,
								}"
							></video>
							<div
								v-else-if="publication.source !== Track.Source.ScreenShare"
								class="video-off-overlay"
							>
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
						@click="toggleScreenShare"
						variant="secondary"
						size="icon"
						class="rounded-full"
					>
						<ScreenShare v-if="!isScreenSharing" class="h-6 w-6" />
						<ScreenShareOff v-else class="h-6 w-6 text-red-500" />
					</Button>
					<Button
						v-if="props.room.user_id === props.auth.user.id"
						@click="generateAndShowInviteLink"
						variant="secondary"
						size="icon"
						class="rounded-full"
						:disabled="generatingLink"
					>
						<UserPlus class="h-6 w-6" />
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

		<Dialog :open="isInviteModalOpen" @update:open="isInviteModalOpen = $event">
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Пригласить в комнату</DialogTitle>
					<DialogDescription>
						Отправьте эту ссылку другим пользователям, чтобы пригласить их в
						комнату. Ссылка действительна 24 часа.
					</DialogDescription>
				</DialogHeader>
				<div class="flex items-center space-x-2">
					<div class="grid flex-1 gap-2">
						<Label for="link" class="sr-only"> Link </Label>
						<Input id="link" :defaultValue="inviteLink" read-only />
					</div>
					<Button @click="copyInviteLink" size="sm" class="px-3">
						<span class="sr-only">Copy</span>
						<Copy class="h-4 w-4" />
					</Button>
				</div>
				<DialogFooter class="sm:justify-start">
					<p v-if="copied" class="text-sm text-green-500">
						Ссылка скопирована!
					</p>
				</DialogFooter>
			</DialogContent>
		</Dialog>
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
	overflow-y: auto;
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
	order: 2; /* Default order */
}

.participant-tile.is-screenshare {
	order: 1; /* Show first */
	min-height: 62dvh; /* Taller for screen share */
}
.participant-tile.is-screenshare .video-element {
	object-fit: contain;
}
.participant-tile.is-screenshare .video-element.share-user {
	position: absolute;
	bottom: 10px;
	right: 10px;
	display: block;
	width: 200px;
	height: auto;
	border: 2px solid #0000007d;
	border-radius: 4px;
	opacity: 0.7;
}

@media (min-width: 768px) {
	.participant-tile.is-screenshare {
		grid-column: span 5;
		grid-row: span 2;
	}
}

.video-element {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.video-element-screenshare {
	width: 100%;
	height: 100%;
	object-fit: contain; /* Use 'contain' for screen shares */
}

.participant-tile-sidebar {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	border-radius: 0.5rem;
	background-color: #2d3748; /* bg-gray-800 */
	aspect-ratio: 16 / 9;
	width: 100%;
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

.tile-controls {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	z-index: 10;
}

.fullscreen-btn {
	display: none; /* Hidden by default */
	color: white;
	background-color: rgba(0, 0, 0, 0.5);
}

.participant-tile:hover .fullscreen-btn,
.participant-tile-sidebar:hover .fullscreen-btn {
	display: inline-flex; /* Show on hover */
}
</style>
