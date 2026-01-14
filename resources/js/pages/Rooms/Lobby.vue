<script setup lang="ts">
import prepareToJoin from '@/actions/App/Http/Controllers/PrepareToJoinRoomController';
import { live as liveRoute } from '@/actions/App/Http/Controllers/RoomController';
import validateRoomPassword from '@/actions/App/Http/Controllers/RoomPasswordController';
import * as rooms from '@/routes/rooms';
import type { BreadcrumbItem, Room, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import axios from 'axios';
import { computed, onMounted, ref, watch } from 'vue';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import RoomGroupLayout from '@/layouts/RoomGroupLayout.vue';

import { useDeviceManager } from '@/composables/useDeviceManager';
import { useMicrophoneTest } from '@/composables/useMicrophoneTest';

import { Mic, Video, VideoOff, Volume2 } from 'lucide-vue-next';

type LobbyStep = 'password' | 'deviceSetup';

interface Props {
	room: Room & { user: User };
}
const props = defineProps<Props>();

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Комнаты', href: rooms.index().url },
	{ title: props.room.name, href: rooms.show(props.room.slug).url },
	{ title: 'Лобби', href: rooms.lobby(props.room.slug).url },
];

const page = usePage();
const currentUser = computed(() => page.props.auth.user as User);

const currentStep = ref<LobbyStep>('deviceSetup');
const password = ref('');
const passwordError = ref('');
const isAuthenticating = ref(false);
const isJoining = ref(false);
const isTestMicrophoneEnabled = ref(false);

const {
	cameras,
	microphones,
	selectedCameraId,
	selectedMicrophoneId,
	cameraStream,
	microphoneStream,
	cameraPermission,
	microphonePermission,
	requestCameraPermission,
	requestMicrophonePermission,
	getCameraStream,
	getMicrophoneStream,
	stopStream,
} = useDeviceManager();

const { isTesting, startTest, stopTest, microphoneVolume } =
	useMicrophoneTest();

const lobbyVideoElement = ref<HTMLVideoElement | null>(null);
const isCameraEnabled = ref(false);
const isMicrophoneEnabled = ref(false);

// --- Computed properties ---
const canJoin = computed(
	() =>
		isMicrophoneEnabled.value &&
		microphonePermission.value === 'granted' &&
		!isJoining.value,
);

// --- Watchers ---
watch(cameraStream, (newStream) => {
	if (lobbyVideoElement.value) {
		if (newStream) {
			lobbyVideoElement.value.srcObject = newStream;
		} else {
			lobbyVideoElement.value.srcObject = null;
		}
	}
});

watch(isCameraEnabled, async (enabled) => {
	if (enabled) {
		if (cameraPermission.value !== 'granted') {
			const granted = await requestCameraPermission();
			if (!granted) {
				isCameraEnabled.value = false;
				return;
			}
		}
		await getCameraStream();
	} else {
		stopStream(cameraStream);
	}
});

watch(isMicrophoneEnabled, async (enabled) => {
	if (enabled) {
		if (microphonePermission.value !== 'granted') {
			const granted = await requestMicrophonePermission();
			if (!granted) {
				isMicrophoneEnabled.value = false;
				return;
			}
		}
		await getMicrophoneStream();
	} else {
		stopStream(microphoneStream);
		if (isTesting.value) {
			stopTest();
		}
	}
});

watch(isTestMicrophoneEnabled, (testing) => {
	if (testing && microphoneStream.value) {
		startTest(microphoneStream.value);
	} else {
		stopTest();
	}
});

// --- Methods ---
const submitPassword = async () => {
	passwordError.value = '';
	isAuthenticating.value = true;
	try {
		await axios.post(validateRoomPassword(props.room.slug).url, {
			password: password.value,
		});
		currentStep.value = 'deviceSetup';
	} catch (e: any) {
		if (e.response && e.response.status === 403) {
			passwordError.value = 'Неверный пароль.';
		} else {
			passwordError.value = 'Произошла ошибка при проверке пароля.';
		}
	} finally {
		isAuthenticating.value = false;
	}
};

const handleJoin = async () => {
	if (currentStep.value !== 'deviceSetup') {
		return;
	}
	isJoining.value = true;

	try {
		await axios.post(prepareToJoin(props.room.slug).url);

		if (selectedCameraId.value) {
			localStorage.setItem('selectedCameraId', selectedCameraId.value);
		}
		if (selectedMicrophoneId.value) {
			localStorage.setItem('selectedMicrophoneId', selectedMicrophoneId.value);
		}

		stopStream(cameraStream);
		stopStream(microphoneStream);
		if (isTesting.value) stopTest();

		router.get(liveRoute(props.room.slug).url);
	} catch (e) {
		console.error('Failed to prepare to join room', e);
		isJoining.value = false;
	}
};

onMounted(() => {
	if (props.room.is_private && props.room.user_id !== currentUser.value.id) {
		currentStep.value = 'password';
	} else {
		currentStep.value = 'deviceSetup';
	}
});
</script>

<template>
	<Head :title="`Лобби - ${props.room.name}`" />

	<RoomGroupLayout :breadcrumbs="breadcrumbs">
		<div
			class="fixed inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm"
		>
			<Card class="w-[95%] max-w-4xl">
				<CardHeader>
					<CardTitle>Лобби комнаты "{{ props.room.name }}"</CardTitle>
					<CardDescription
						>Настройте камеру и микрофон перед входом.</CardDescription
					>
				</CardHeader>

				<!-- Step 2: Device Setup -->
				<CardContent
					v-if="currentStep === 'deviceSetup'"
					class="grid grid-cols-1 gap-6 md:grid-cols-2"
				>
					<!-- Left Side: Camera Preview & Controls -->
					<div class="space-y-4">
						<div
							class="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-black"
						>
							<video
								ref="lobbyVideoElement"
								autoplay
								muted
								playsinline
								class="h-full w-full object-cover"
							></video>
							<div
								v-if="!isCameraEnabled || !cameraStream"
								class="absolute text-center text-gray-400"
							>
								<VideoOff class="mx-auto h-16 w-16" />
								<p>Камера выключена</p>
							</div>
						</div>

						<div
							class="flex items-center justify-between rounded-md bg-gray-100 p-2 dark:bg-gray-800"
						>
							<Label
								for="camera-switch"
								class="flex items-center gap-2 text-lg"
							>
								<Video class="h-6 w-6" />
								<span>Камера</span>
							</Label>
							<Switch id="camera-switch" v-model="isCameraEnabled" />
						</div>

						<div v-if="isCameraEnabled" class="space-y-2">
							<Label for="camera-select">Выбор камеры</Label>
							<Select
								v-model="selectedCameraId"
								:disabled="cameras.length === 0"
							>
								<SelectTrigger id="camera-select" class="w-full">
									<SelectValue placeholder="Выберите камеру" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem
										v-for="camera in cameras"
										:key="camera.deviceId"
										:value="camera.deviceId"
									>
										{{ camera.label }}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<!-- Right Side: Mic Preview & Controls -->
					<div class="space-y-4">
						<div class="rounded-md bg-gray-100 p-2 dark:bg-gray-800">
							<div class="flex items-center justify-between">
								<Label for="mic-switch" class="flex items-center gap-2 text-lg">
									<Mic class="h-6 w-6" />
									<span>Микрофон</span>
								</Label>
								<Switch id="mic-switch" v-model="isMicrophoneEnabled" />
							</div>
							<div
								v-if="isMicrophoneEnabled && microphonePermission === 'granted'"
								class="mt-4 space-y-3"
							>
								<Label for="mic-select">Выбор микрофона</Label>
								<Select
									v-model="selectedMicrophoneId"
									:disabled="microphones.length === 0"
								>
									<SelectTrigger id="mic-select" class="w-full bg-white">
										<SelectValue placeholder="Выберите микрофон" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem
											v-for="mic in microphones"
											:key="mic.deviceId"
											:value="mic.deviceId"
										>
											{{ mic.label }}
										</SelectItem>
									</SelectContent>
								</Select>

								<div class="space-y-2 pt-4">
									<div class="flex items-center justify-between">
										<Label
											for="mic-test-switch"
											class="flex items-center gap-2"
										>
											<Volume2 class="h-5 w-5" />
											<span>Проверить микрофон</span>
										</Label>
										<Switch
											id="mic-test-switch"
											v-model="isTestMicrophoneEnabled"
										/>
									</div>
									<div v-if="isTestMicrophoneEnabled" class="space-y-2 pt-2">
										<Progress v-model="microphoneVolume" class="h-3 w-full" />
										<p class="text-center text-xs text-gray-500">
											Уровень громкости
										</p>
										<Alert variant="default" class="bg-white p-2 text-sm">
											<AlertDescription>
												Вы должны слышать свой голос. Рекомендуется использовать
												наушники, чтобы избежать эха.
											</AlertDescription>
										</Alert>
									</div>
								</div>
							</div>
							<div
								v-if="isMicrophoneEnabled && microphonePermission === 'denied'"
								class="mt-4 text-sm text-red-500"
							>
								Вы заблокировали доступ к микрофону. Разрешите его в настройках
								браузера.
							</div>
						</div>

						<div class="flex flex-col items-center gap-4 pt-8">
							<Button
								@click="handleJoin"
								size="lg"
								class="w-full"
								:disabled="!canJoin"
							>
								Присоединиться к комнате
							</Button>
							<Button variant="ghost" :as="Link" :href="rooms.index().url">
								Выйти
							</Button>
						</div>
					</div>
				</CardContent>

				<!-- Step 1: Password Form -->
				<CardContent
					v-else-if="currentStep === 'password'"
					class="flex flex-col items-center justify-center space-y-6 p-10"
				>
					<p class="text-lg font-semibold text-gray-800 dark:text-gray-200">
						Эта комната приватная. Введите пароль для входа.
					</p>
					<form
						@submit.prevent="submitPassword"
						class="w-full max-w-sm space-y-4"
					>
						<Input
							id="room-password"
							type="password"
							v-model="password"
							placeholder="Пароль"
							:disabled="isAuthenticating"
							class="text-base"
						/>
						<p v-if="passwordError" class="text-sm text-red-500">
							{{ passwordError }}
						</p>
						<Button
							type="submit"
							class="w-full"
							:disabled="isAuthenticating || !password.length"
						>
							<svg
								v-if="isAuthenticating"
								class="mr-3 -ml-1 h-5 w-5 animate-spin"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Продолжить
						</Button>
						<Button
							variant="ghost"
							:as="Link"
							:href="rooms.index().url"
							class="mt-2 w-full"
						>
							Отмена
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	</RoomGroupLayout>
</template>
