<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue'
import { useCall } from '@/composables/useCall'
import { Head, usePage } from '@inertiajs/vue3'
import type { BreadcrumbItem, User } from '@/types'
import { dashboard } from '@/routes'
import { Button } from '@/components/ui/button'
import { Phone } from 'lucide-vue-next'
import ActiveCallUI from '@/components/ActiveCallUI.vue'
import IncomingCallDialog from '@/components/IncomingCallDialog.vue'
import { Toaster } from '@/components/ui/sonner'


interface Props {
    users: User[];
}
const props = defineProps<Props>()

const page = usePage()
const authUser = page.props.auth.user as User

// Dashboard is the master component that initializes and controls the call service
const { 
    callState, 
    remoteStream,
    otherUserId,
    isMuted,
    incomingCall,
    initiateCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute,
} = useCall(authUser.id)


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
            <h1 class="text-2xl font-bold mb-4">Users</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                    v-for="user in props.users"
                    :key="user.id"
                    class="p-4 border rounded-lg flex items-center justify-between"
                >
                    <div>
                        <p class="font-semibold">{{ user.name }}</p>
                        <p class="text-sm text-muted-foreground">{{ user.email }}</p>
                    </div>
                    <Button
                        @click="initiateCall(user.id)"
                        :disabled="callState !== 'idle'"
                        size="sm"
                        variant="outline"
                    >
                        <Phone class="w-4 h-4 mr-2" />
                        Call
                    </Button>
                </div>
            </div>
             <div v-if="!props.users.length" class="text-center text-muted-foreground mt-8">
                No other users available to call.
            </div>
        </div>

        <!-- Call UI Components -->
        <ActiveCallUI 
            :call-state="callState"
            :remote-stream="remoteStream"
            :other-user-id="otherUserId"
            :is-muted="isMuted"
            @hang-up="hangUp"
            @toggle-mute="toggleMute"
        />
        <IncomingCallDialog 
            :call-state="callState"
            :incoming-call="incomingCall"
            @accept="acceptCall"
            @reject="rejectCall"
        />
        <Toaster />

    </AppLayout>
</template>
