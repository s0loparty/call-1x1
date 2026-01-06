<script setup lang="ts">
import { Button } from '@/components/ui/button';
import type { CallState } from '@/composables/useCall';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
    callState: CallState;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    otherUserId: number | null;
    isMuted: boolean;
}>();

const emit = defineEmits(['hang-up', 'toggle-mute', 'toggle-video']);

const localVideoRef = ref<HTMLVideoElement | null>(null);
const remoteVideoRef = ref<HTMLVideoElement | null>(null);

const showUI = computed(() =>
    ['outgoing', 'active', 'terminating'].includes(props.callState),
);

// We assume video is enabled by default in a video call
const isVideoEnabled = ref(true); 

watch(
    () => props.localStream,
    (stream) => {
        if (localVideoRef.value && stream) {
            localVideoRef.value.srcObject = stream;
        } else if (localVideoRef.value) {
            localVideoRef.value.srcObject = null;
        }
    },
    { immediate: true },
);

watch(
    () => props.remoteStream,
    (stream) => {
        if (remoteVideoRef.value && stream) {
            remoteVideoRef.value.srcObject = stream;
        } else if (remoteVideoRef.value) {
            remoteVideoRef.value.srcObject = null;
        }
    },
    { immediate: true },
);

// Emit a toggle-video event, the parent/composable will handle the logic
function handleToggleVideo() {
    isVideoEnabled.value = !isVideoEnabled.value;
    emit('toggle-video');
}

</script>

<template>
    <div
        v-show="showUI"
        class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white"
    >
        <!-- Remote Video -->
        <video
            ref="remoteVideoRef"
            autoplay
            playsinline
            class="h-full w-full object-cover"
        />

        <!-- Local Video (Picture-in-Picture) -->
        <video
            ref="localVideoRef"
            autoplay
            playsinline
            muted
            class="absolute right-4 top-4 h-1/4 w-auto rounded-lg border-2 border-white shadow-md"
        />

        <!-- Call Info -->
        <div
            class="absolute left-1/2 top-8 -translate-x-1/2 rounded-lg bg-black/30 px-4 py-2"
        >
            <h2 class="text-xl font-bold">
                {{ callState === 'outgoing' ? 'Calling...' : 'In Call' }}
            </h2>
            <p class="text-center text-sm">
                With user ID: {{ otherUserId }}
            </p>
        </div>

        <!-- Controls -->
        <div
            class="absolute bottom-8 left-1/2 flex -translate-x-1/2 justify-center gap-4 rounded-full bg-black/30 p-4"
        >
            <Button
                @click="emit('toggle-mute')"
                variant="outline"
                size="lg"
                class="aspect-square h-16 w-16 rounded-full border-gray-500 bg-white/10 p-4 text-white hover:bg-white/20"
            >
                <Mic v-if="!isMuted" class="h-8 w-8" />
                <MicOff v-else class="h-8 w-8" />
            </Button>
            <Button
                @click="handleToggleVideo"
                variant="outline"
                size="lg"
                class="aspect-square h-16 w-16 rounded-full border-gray-500 bg-white/10 p-4 text-white hover:bg-white/20"
            >
                <Video v-if="isVideoEnabled" class="h-8 w-8" />
                <VideoOff v-else class="h-8 w-8" />
            </Button>
            <Button
                @click="emit('hang-up')"
                variant="destructive"
                size="lg"
                class="aspect-square h-16 w-16 rounded-full p-4"
            >
                <PhoneOff class="h-8 w-8" />
            </Button>
        </div>

        <p
            v-if="callState === 'terminating'"
            class="absolute bottom-32 left-1/2 -translate-x-1/2 text-lg"
        >
            Ending call...
        </p>
    </div>
</template>
