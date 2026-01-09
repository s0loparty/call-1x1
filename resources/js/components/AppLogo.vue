<script setup lang="ts">
import { HeadphonesIcon } from 'lucide-vue-next';
</script>

<template>
	<div
		class="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"
	>
		<HeadphonesIcon class="size-5" />
	</div>
	<div class="ml-1 grid flex-1 text-left text-sm">
		<span class="truncate font-semibold">CALL ME</span>
	</div>
</template>
