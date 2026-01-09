<script setup lang="ts">
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/AppLayout.vue';
import {
	create as roomCreate,
	destroy as roomDestroy,
	edit as roomEdit,
	index as roomList,
	show as roomShow,
} from '@/routes/rooms';
import type { BreadcrumbItem, Room } from '@/types';
import { Head, Link, router } from '@inertiajs/vue3';
import { Pencil, PlusCircle, Trash2 } from 'lucide-vue-next';

interface Props {
	publicRooms: Room[];
	userRooms: Room[];
}

defineProps<Props>();

function deleteRoom(room: Room) {
	if (confirm(`Вы уверены, что хотите удалить комнату "${room.name}"?`)) {
		router.delete(roomDestroy(room.slug).url, {
			preserveScroll: true,
		});
	}
}

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
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
				<h1 class="text-3xl font-bold">Видеоконференции</h1>
				<Link :href="roomCreate().url">
					<Button>
						<PlusCircle class="mr-2 h-4 w-4" />
						Создать комнату
					</Button>
				</Link>
			</div>

			<!-- Your Rooms -->
			<section class="mb-8">
				<h2 class="mb-4 text-2xl font-semibold">Ваши комнаты</h2>
				<div
					v-if="userRooms.length"
					class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
				>
					<div
						v-for="room in userRooms"
						:key="room.id"
						class="flex flex-col justify-between rounded-lg border p-4 shadow-sm"
					>
						<div>
							<h3 class="text-lg font-bold">{{ room.name }}</h3>
							<p class="text-sm text-muted-foreground">
								{{ room.is_private ? 'Приватная' : 'Публичная' }}
							</p>
						</div>
						<div class="mt-4 flex flex-wrap justify-between gap-2">
							<Link :href="roomShow(room.slug).url">
								<Button size="sm" class="w-full">Присоединиться</Button>
							</Link>
							<div class="flex items-center gap-2">
								<Link :href="roomEdit(room.slug).url">
									<Button size="sm" variant="outline">
										<Pencil class="h-4 w-4" />
									</Button>
								</Link>
								<Button
									@click="deleteRoom(room)"
									size="sm"
									variant="destructive"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				</div>
				<p v-else class="text-muted-foreground">У вас пока нет комнат.</p>
			</section>

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
		</div>
	</AppLayout>
</template>
