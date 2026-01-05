<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Phone, Mic, MicOff, PhoneOff } from 'lucide-vue-next'
import type { CallState } from '@/composables/useCall' // It's better to import types

const props = defineProps<{
    callState: CallState;
    remoteStream: MediaStream | null;
    otherUserId: number | null;
    isMuted: boolean;
}>()

const emit = defineEmits(['hang-up', 'toggle-mute'])

const audioRef = ref<HTMLAudioElement | null>(null)
const showUI = computed(() => ['outgoing', 'active', 'terminating'].includes(props.callState))

watch(() => props.remoteStream, (stream) => {
  if (audioRef.value && stream) {
    audioRef.value.srcObject = stream
    audioRef.value.play().catch(e => console.error('Audio play failed:', e))
  } else if (audioRef.value) {
      audioRef.value.srcObject = null
  }
})
</script>

<template>
  <div
    v-if="showUI"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
  >
    <div class="rounded-xl border bg-card text-card-foreground shadow-lg p-6 w-full max-w-sm text-center">
      <h2 class="text-2xl font-bold">
        {{ callState === 'outgoing' ? 'Calling...' : 'In Call' }}
      </h2>
      <p class="text-muted-foreground mt-2">
        With user ID: {{ otherUserId }}
      </p>

      <!-- Audio element to play the remote stream -->
      <audio ref="audioRef" autoplay playsinline class="hidden" />

      <div class="mt-8 flex justify-center gap-4">
        <Button
          @click="emit('toggle-mute')"
          variant="outline"
          size="lg"
          class="rounded-full aspect-square p-4 w-16 h-16"
        >
          <Mic v-if="!isMuted" class="w-8 h-8" />
          <MicOff v-else class="w-8 h-8" />
        </Button>
        <Button
          @click="emit('hang-up')"
          variant="destructive"
          size="lg"
          class="rounded-full aspect-square p-4 w-16 h-16"
        >
          <PhoneOff class="w-8 h-8" />
        </Button>
      </div>

       <p v-if="callState === 'terminating'" class="mt-4 text-muted-foreground">
          Ending call...
       </p>
    </div>
  </div>
</template>
