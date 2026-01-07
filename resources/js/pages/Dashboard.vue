<script setup lang="ts">
import ActiveCallUI from '@/components/ActiveCallUI.vue';
import ActiveVideoCallUI from '@/components/ActiveVideoCallUI.vue';
import IncomingCallDialog from '@/components/IncomingCallDialog.vue';
import IncomingVideoCallDialog from '@/components/IncomingVideoCallDialog.vue';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toaster } from '@/components/ui/sonner';
import { useCall } from '@/composables/useCall';
import AppLayout from '@/layouts/AppLayout.vue';
import { dashboard } from '@/routes';
import type { BreadcrumbItem, User } from '@/types';
import { Head, usePage } from '@inertiajs/vue3';
import { Phone, Video } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import DialTone from '../../assets/gudki.mp3';

interface Props {
    users: User[];
}
const props = defineProps<Props>();

const page = usePage();
const authUser = page.props.auth.user as User;

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
} = useCall(authUser.id);

const dialToneAudio = ref<HTMLAudioElement | null>(null);

// Create a Map for efficient user lookup by ID
const usersById = computed(() =>
    new Map(props.users.map((user) => [user.id, user])),
);

const otherUserName = computed(() => {
    if (!otherUserId.value) return 'Unknown User';
    return usersById.value.get(otherUserId.value)?.name ?? `User ID: ${otherUserId.value}`;
});

const incomingCallerName = computed(() => {
    if (!incomingCall.value) return 'Unknown Caller';
    const callerId = incomingCall.value.from_user_id;
    return usersById.value.get(callerId)?.name ?? `User ID: ${callerId}`;
});


watch(callState, (newState, oldState) => {
    if (!dialToneAudio.value) return;

    if (newState === 'outgoing') {
        dialToneAudio.value
            .play()
            .catch((e) => console.error('Dial tone playback failed:', e));
    } else if (oldState === 'outgoing') {
        dialToneAudio.value.pause();
        dialToneAudio.value.currentTime = 0;
    }
});

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
            <h1 class="mb-4 text-2xl font-bold">Users</h1>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div
                    v-for="user in props.users"
                    :key="user.id"
                    class="flex items-center justify-between rounded-lg border p-4"
                >
                    <div>
                        <p class="font-semibold">{{ user.name }}</p>
                        <p class="text-sm text-muted-foreground">
                            {{ user.email }}
                        </p>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <Button
                                :disabled="callState !== 'idle'"
                                size="sm"
                                variant="outline"
                            >
                                <Phone class="mr-2 h-4 w-4" />
                                Call
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem
                                @click="initiateCall(user.id, 'audio')"
                            >
                                <Phone class="mr-2 h-4 w-4" />
                                Audio Call
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                @click="initiateCall(user.id, 'video')"
                            >
                                <Video class="mr-2 h-4 w-4" />
                                Video Call
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div
                v-if="!props.users.length"
                class="mt-8 text-center text-muted-foreground"
            >
                No other users available to call.
            </div>
        </div>

        <!-- Call UI Components -->
        <ActiveVideoCallUI
            v-if="callType === 'video'"
            :call-state="callState"
            :local-stream="localStream"
            :remote-stream="remoteStream"
            :other-user-name="otherUserName"
            :is-muted="isMuted"
            :is-video-enabled="isVideoEnabled"
            @hang-up="hangUp"
            @toggle-mute="toggleMute"
            @toggle-video="toggleVideo"
        />
        <IncomingVideoCallDialog
            v-if="callType === 'video'"
            :call-state="callState"
            :caller-name="incomingCallerName"
            @accept="acceptCall"
            @reject="rejectCall"
        />

        <!-- Audio Call Components -->
        <ActiveCallUI
            v-if="callType !== 'video'"
            :call-state="callState"
            :remote-stream="remoteStream"
            :other-user-name="otherUserName"
            :is-muted="isMuted"
            @hang-up="hangUp"
            @toggle-mute="toggleMute"
        />
        <IncomingCallDialog
            v-if="callType !== 'video'"
            :call-state="callState"
            :caller-name="incomingCallerName"
            @accept="acceptCall"
            @reject="rejectCall"
        />

        <Toaster />

        <!-- Audio element for dial tone -->
        <audio
            ref="dialToneAudio"
            :src="DialTone"
            loop
            preload="auto"
            volume="0.1"
        ></audio>
    </AppLayout>
</template>
