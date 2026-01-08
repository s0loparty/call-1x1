<script setup lang="ts">
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/AppLayout.vue';
import {
	create as roomCreate,
	index as roomList,
	show as roomShow,
} from '@/routes/rooms';
import type { BreadcrumbItem, Room } from '@/types';
import { Head, Link } from '@inertiajs/vue3';
import { PlusCircle } from 'lucide-vue-next';

interface Props {
	publicRooms: Room[];
	userRooms: Room[];
}

defineProps<Props>();

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Комнаты',
		href: roomList().url,
	},
];
</script>

<template>
	<Head title="Комнаты" />

	<AppLayout :breadcrumbs="breadcrumbs">
		<div class="p-4">
			<div class="mb-6 flex items-center justify-between">
				<h1 class="text-3xl font-bold">Видеоконференции</h1>
				<Link :href="roomCreate().url">
					<Button>
						<PlusCircle class="mr-2 h-4 w-4" />
						Создать новую комнату
					</Button>
				</Link>
			</div>

			<!-- Public Rooms -->
			<section class="mb-8">
				<h2 class="mb-4 text-2xl font-semibold">Публичные комнаты</h2>
				<div
					v-if="publicRooms.length"
					class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
				>
					<div
						v-for="room in publicRooms"
						:key="room.id"
						class="rounded-lg border p-4 shadow-sm"
					>
						<h3 class="text-lg font-bold">{{ room.name }}</h3>
						<p class="text-sm text-muted-foreground">
							Создана: {{ room.user?.name || 'Неизвестно' }}
						</p>
						<Link :href="roomShow(room.slug).url">
							<Button size="sm" class="mt-3">Присоединиться</Button>
						</Link>
					</div>
				</div>
				<p v-else class="text-muted-foreground">Публичных комнат пока нет.</p>
			</section>

			<!-- Your Private Rooms -->
			<section>
				<h2 class="mb-4 text-2xl font-semibold">Ваши приватные комнаты</h2>
				<div
					v-if="userRooms.length"
					class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
				>
					<div
						v-for="room in userRooms"
						:key="room.id"
						class="rounded-lg border p-4 shadow-sm"
					>
						<h3 class="text-lg font-bold">{{ room.name }}</h3>
						<p class="text-sm text-muted-foreground">Приватная</p>
						<Link :href="roomShow(room.slug).url">
							<Button size="sm" class="mt-3">Присоединиться</Button>
						</Link>
					</div>
				</div>
				<p v-else class="text-muted-foreground">
					У вас пока нет приватных комнат.
				</p>
			</section>
		</div>
	</AppLayout>
</template>
