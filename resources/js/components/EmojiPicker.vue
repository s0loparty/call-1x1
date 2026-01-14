<script setup lang="ts">
import 'emoji-mart-vue-fast/css/emoji-mart.css';
import data from 'emoji-mart-vue-fast/data/apple.json';
// @ts-expect-error нет типов
import { EmojiIndex, Picker } from 'emoji-mart-vue-fast/src';

const EMOJI_CUSTOM_LIST = [
	{
		name: 'Боль',
		short_names: ['bol'],
		keywords: ['bol'],
		custom: true,
		imageUrl: '/emoji/bol.png',
	},
	{
		name: 'aaaa',
		short_names: ['aaaa'],
		keywords: ['aaaa'],
		custom: true,
		imageUrl: '/emoji/aaaa.gif',
	},
	{
		name: 'Frog Dance',
		short_names: ['dancefrog'],
		keywords: ['dance', 'happy', 'frog'],
		custom: true,
		imageUrl: '/emoji/frog-dance.gif',
	},
	{
		name: 'Bro',
		short_names: ['bro'],
		keywords: ['bro', 'friend'],
		custom: true,
		imageUrl: '/emoji/bro.gif',
	},
	{
		name: 'Cool Dog',
		short_names: ['cooldog'],
		keywords: ['dog', 'cool'],
		custom: true,
		imageUrl: '/emoji/cool-dog.gif',
	},
	{
		name: 'Crazy Dog',
		short_names: ['crazydog'],
		keywords: ['dog', 'crazy'],
		custom: true,
		imageUrl: '/emoji/crazy-dog.png',
	},
	{
		name: 'Geniy',
		short_names: ['geniy'],
		keywords: ['geniy', 'brain'],
		custom: true,
		imageUrl: '/emoji/geniy.jpg',
	},
	{
		name: 'Kappa',
		short_names: ['kappa'],
		keywords: ['lol', 'kappa', 'kek'],
		custom: true,
		imageUrl: '/emoji/kappa.png',
	},
	{
		name: 'Lol',
		short_names: ['lol'],
		keywords: ['lol', 'kek'],
		custom: true,
		imageUrl: '/emoji/lol.jpg',
	},
	{
		name: 'Lol2',
		short_names: ['lol2'],
		keywords: ['lol', 'kek'],
		custom: true,
		imageUrl: '/emoji/lol2.png',
	},
	{
		name: 'Press F',
		short_names: ['pressf'],
		keywords: ['press', 'respect'],
		custom: true,
		imageUrl: '/emoji/press-f.webp',
	},
];

export interface TEmojiPicker {
	id: string;
	name: string;
	native?: string;
	colons: string;
	unified: string;
	short_names: string[];
	skin?: number;
	custom?: boolean;
	imageUrl?: boolean;
	emoticons?: boolean;
}

const emits = defineEmits<{ (e: 'select', emoji: TEmojiPicker): void }>();

const emojiIndex = new EmojiIndex(data, {
	custom: EMOJI_CUSTOM_LIST,
	exclude: ['flags'],
});
</script>

<template>
	<Picker
		class="scrollbar-hide"
		:data="emojiIndex"
		title="Выбери эмоцию"
		emoji="point_up"
		:showPreview="false"
		:showSkinTones="false"
		color="#615fff"
		@select="emits('select', $event)"
	/>
</template>

<style>
:root {
	--color-brand: #2b2b2b;
	--color-brand-secondary: #333333;
}
body .emoji-mart {
	background: var(--color-brand);
	border-color: var(--color-brand-secondary);
	box-shadow: 0 0 4px #212121;
	color: var(--color-brand-light);
	overflow: hidden;
}
body .emoji-mart-anchor {
	outline: none;
}
body .emoji-mart-anchor:focus {
	background: var(--color-brand-secondary);
}
body .emoji-mart-category-label h3 {
	background-color: var(--color-brand-secondary);
	margin-top: 6px;
	border-radius: 4px;
	font-size: 14px;
	color: white;
}
body .emoji-mart-category .emoji-mart-emoji:hover:before,
body .emoji-mart-emoji-selected:before {
	background-color: var(--color-brand-secondary);
}
body .emoji-mart-search input {
	border-color: var(--color-brand-secondary);
	border-radius: 4px;
	font-size: 14px;
	padding: 8px;
	color: white;
}
body .emoji-mart-scroll {
	scrollbar-width: none;
	-ms-overflow-style: none;
	padding: 0 12px 12px 12px;
}
body .emoji-mart-scroll::-webkit-scrollbar {
	display: none;
	scrollbar-width: none;
}
body .emoji-mart-bar {
	border: 0 solid var(--color-brand-secondary);
	box-shadow: 0 0 20px 5px var(--color-brand-secondary);
}
</style>
