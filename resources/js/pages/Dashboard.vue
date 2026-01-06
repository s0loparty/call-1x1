<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue'
import { useCall } from '@/composables/useCall'
import { Head, usePage } from '@inertiajs/vue3'
import type { BreadcrumbItem, User } from '@/types'
import { dashboard } from '@/routes'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Phone, Video } from 'lucide-vue-next'
import ActiveCallUI from '@/components/ActiveCallUI.vue'
import IncomingCallDialog from '@/components/IncomingCallDialog.vue'
import ActiveVideoCallUI from '@/components/ActiveVideoCallUI.vue'
import IncomingVideoCallDialog from '@/components/IncomingVideoCallDialog.vue'
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
    callType,
    localStream,
    remoteStream,
    otherUserId,
    isMuted,
    isVideoEnabled,
    incomingCall,
    initiateCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute,
    toggleVideo,
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

                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                             <Button
                                :disabled="callState !== 'idle'"
                                size="sm"
                                variant="outline"
                            >
                                <Phone class="w-4 h-4 mr-2" />
                                Call
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem @click="initiateCall(user.id, 'audio')">
                                <Phone class="w-4 h-4 mr-2" />
                                Audio Call
                            </DropdownMenuItem>
                            <DropdownMenuItem @click="initiateCall(user.id, 'video')">
                                <Video class="w-4 h-4 mr-2" />
                                Video Call
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>
            </div>
             <div v-if="!props.users.length" class="text-center text-muted-foreground mt-8">
                No other users available to call.
            </div>
        </div>

        <!-- Call UI Components -->
        <ActiveVideoCallUI
            v-if="callType === 'video'"
            :call-state="callState"
            :local-stream="localStream"
            :remote-stream="remoteStream"
            :other-user-id="otherUserId"
            :is-muted="isMuted"
            :is-video-enabled="isVideoEnabled"
            @hang-up="hangUp"
            @toggle-mute="toggleMute"
            @toggle-video="toggleVideo"
        />
        <IncomingVideoCallDialog
            v-if="callType === 'video'"
            :call-state="callState"
            :incoming-call="incomingCall"
            @accept="acceptCall"
            @reject="rejectCall"
        />

        <!-- Audio Call Components -->
        <ActiveCallUI
            v-if="callType !== 'video'"
            :call-state="callState"
            :remote-stream="remoteStream"
            :other-user-id="otherUserId"
            :is-muted="isMuted"
            @hang-up="hangUp"
            @toggle-mute="toggleMute"
        />
        <IncomingCallDialog
            v-if="callType !== 'video'"
            :call-state="callState"
            :incoming-call="incomingCall"
            @accept="acceptCall"
            @reject="rejectCall"
        />

        <Toaster />

    </AppLayout>
</template>
