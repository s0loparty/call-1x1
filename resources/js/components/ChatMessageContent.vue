<script setup lang="ts">
import { computed } from 'vue';
import { renderMessage } from '@/lib/emoji';

const props = defineProps<{
    content: string;
}>();

const messageParts = computed(() => renderMessage(props.content));
</script>

<template>
    <p class="text-sm break-words">
        <template v-for="(part, index) in messageParts" :key="index">
            <span v-if="part.type === 'text'">{{ part.value }}</span>
            <img
                v-else-if="part.type === 'emoji'"
                :src="part.src"
                :alt="part.alt"
                class="inline-block h-5 w-5 align-text-bottom"
            />
        </template>
    </p>
</template>
