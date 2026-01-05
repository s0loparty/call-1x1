<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Phone, PhoneOff } from 'lucide-vue-next'
import type { CallState, IncomingCall } from '@/composables/useCall'

const props = defineProps<{
    callState: CallState;
    incomingCall: IncomingCall | null;
}>()

const emit = defineEmits(['accept', 'reject'])

const showDialog = computed(() => props.callState === 'incoming')

</script>

<template>
  <Dialog :open="showDialog">
    <DialogContent class="sm:max-w-[425px]" :show-close-button="false">
      <DialogHeader>
        <DialogTitle class="text-center text-2xl">Incoming Call</DialogTitle>
        <DialogDescription class="text-center">
          You have an incoming call from user ID: {{ incomingCall?.from_user_id }}
        </DialogDescription>
      </DialogHeader>
      
      <DialogFooter class="sm:justify-center gap-4 pt-4">
        <Button @click="emit('reject')" variant="destructive" size="lg" class="rounded-full aspect-square p-4 w-16 h-16">
          <PhoneOff class="w-8 h-8" />
          <span class="sr-only">Reject</span>
        </Button>
        <Button @click="emit('accept')" variant="default" size="lg" class="rounded-full aspect-square p-4 w-16 h-16 bg-green-500 hover:bg-green-600">
           <Phone class="w-8 h-8" />
           <span class="sr-only">Accept</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
