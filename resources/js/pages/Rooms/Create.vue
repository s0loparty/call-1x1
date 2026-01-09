<script setup lang="ts">
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/AppLayout.vue';
import * as rooms from '@/routes/rooms';
import type { BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/vue3';
import { Lock } from 'lucide-vue-next';

const form = useForm({
	name: '',
	is_private: false,
	password: '',
});

const submit = () => {
	form.post(rooms.store().url);
};

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Комнаты',
		href: rooms.index().url,
	},
	{
		title: 'Создать',
		href: rooms.create().url,
	},
];
</script>

<template>
	<Head title="Создать комнату" />

	<AppLayout :breadcrumbs="breadcrumbs">
		<div class="mx-auto max-w-2xl p-4">
			<h1 class="mb-6 text-3xl font-bold">Создать новую видеоконференцию</h1>

			<form @submit.prevent="submit" class="space-y-6">
				<div>
					<Label for="name">Название комнаты</Label>
					<Input id="name" type="text" v-model="form.name" required autofocus />
					<InputError :message="form.errors.name" class="mt-2" />
				</div>

				<div class="flex items-center space-x-2">
					<Checkbox id="is_private" v-model="form.is_private" />
					<Label for="is_private">Приватная комната</Label>
					<Lock v-if="form.is_private" class="h-4 w-4 text-muted-foreground" />
				</div>
				<InputError :message="form.errors.is_private" class="mt-2" />

				<div v-if="form.is_private">
					<Label for="password">Пароль</Label>
					<Input id="password" type="password" v-model="form.password" />
					<InputError :message="form.errors.password" class="mt-2" />
				</div>

				<div class="flex items-center justify-end">
					<Button type="submit" :disabled="form.processing">Создать</Button>
				</div>
			</form>
		</div>
	</AppLayout>
</template>
