<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { CallState } from '@/composables/useCall';
import { Phone, PhoneOff } from 'lucide-vue-next';
import { computed, onUnmounted, ref, watch } from 'vue';
import CallMusic from '../../assets/call.mp3';

const props = defineProps<{
    callState: CallState;
    callerName: string | null;
}>();

const emit = defineEmits(['accept', 'reject']);

const showDialog = computed(() => props.callState === 'incoming');
const ringtoneAudio = ref<HTMLAudioElement | null>(null);

watch(
    showDialog,
    (isShowing) => {
        if (ringtoneAudio.value) {
            if (isShowing) {
                ringtoneAudio.value
                    .play()
                    .catch((e) =>
                        console.error('Ringtone playback failed:', e),
                    );
            } else {
                ringtoneAudio.value.pause();
                ringtoneAudio.value.currentTime = 0;
            }
        }
    },
    { immediate: true },
);

onUnmounted(() => {
    if (ringtoneAudio.value) {
        ringtoneAudio.value.pause();
        ringtoneAudio.value.currentTime = 0;
    }
});
</script>

<template>
    <Dialog :open="showDialog">
        <DialogContent class="sm:max-w-[425px]" :show-close-button="false">
            <DialogHeader>
                <DialogTitle class="text-center text-2xl"
                    >Входящий звонок</DialogTitle
                >
                <DialogDescription class="text-center">
                    Вам поступил входящий вызов от
                    {{ callerName }}
                </DialogDescription>
            </DialogHeader>

            <DialogFooter
                class="flex flex-row justify-center gap-4 pt-4 sm:justify-center"
            >
                <Button
                    @click="emit('reject')"
                    variant="destructive"
                    size="lg"
                    class="aspect-square h-12 w-12 rounded-full p-4"
                >
                    <PhoneOff class="h-8 w-8" />
                    <span class="sr-only">Отклонить</span>
                </Button>
                <Button
                    @click="emit('accept')"
                    variant="default"
                    size="lg"
                    class="aspect-square h-12 w-12 rounded-full bg-green-500 p-4 hover:bg-green-600"
                >
                    <Phone class="h-8 w-8" />
                    <span class="sr-only">Принять</span>
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <!-- Ringtone audio element -->
    <audio
        v-if="CallMusic"
        ref="ringtoneAudio"
        :src="CallMusic"
        loop
        preload="auto"
        volume="0.2"
    ></audio>
</template>
