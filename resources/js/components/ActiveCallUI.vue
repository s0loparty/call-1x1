<script setup lang="ts">
import { Button } from '@/components/ui/button';
import type { CallState } from '@/composables/useCall';
import { Mic, MicOff, PhoneOff } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
    callState: CallState;
    remoteStream: MediaStream | null;
    otherUserId: number | null;
    isMuted: boolean;
}>();

const emit = defineEmits(['hang-up', 'toggle-mute']);

const audioRef = ref<HTMLAudioElement | null>(null);
const showUI = computed(() =>
    ['outgoing', 'active', 'terminating'].includes(props.callState),
);

watch(
    () => props.remoteStream,
    (stream) => {
        if (audioRef.value && stream) {
            console.log(
                '[CallUI] WATCH FIRED. Remote stream attached.',
                stream,
            );
            audioRef.value.srcObject = stream;
            audioRef.value.muted = false;
            audioRef.value.volume = 1;
            audioRef.value
                .play()
                .catch((e) => console.error('[CallUI] Audio play failed:', e));
        } else if (audioRef.value) {
            audioRef.value.srcObject = null;
            console.log('[CallUI] WATCH FIRED. Remote stream detached.');
        }
    },
    { immediate: true },
);
</script>

<template>
    <div
        v-show="showUI"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
        <div
            class="w-full max-w-sm rounded-xl border bg-card p-6 text-center text-card-foreground shadow-lg"
        >
            <h2 class="text-2xl font-bold">
                {{ callState === 'outgoing' ? 'Calling...' : 'In Call' }}
            </h2>
            <p class="mt-2 text-muted-foreground">
                With user ID: {{ otherUserId }}
            </p>

            <!-- Audio element to play the remote stream -->
            <audio ref="audioRef" autoplay playsinline />

            <div class="mt-8 flex justify-center gap-4">
                <Button
                    @click="emit('toggle-mute')"
                    variant="outline"
                    size="lg"
                    class="aspect-square h-16 w-16 rounded-full p-4"
                >
                    <Mic v-if="!isMuted" class="h-8 w-8" />
                    <MicOff v-else class="h-8 w-8" />
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
                class="mt-4 text-muted-foreground"
            >
                Ending call...
            </p>
        </div>
    </div>
</template>
