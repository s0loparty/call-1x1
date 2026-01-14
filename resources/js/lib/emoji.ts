// Note: This list is based on the files found in the emoji directory.
// If new emojis are added, this list needs to be updated.
export const customEmojis = [
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
		name: 'Frog Dance',
		short_names: ['dancefrog'],
		keywords: ['dance', 'happy', 'frog'],
		custom: true,
		imageUrl: '/emoji/frog-dance.gif',
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

export const EMOJI_MAP = customEmojis.reduce((acc, emoji) => {
    emoji.short_names.forEach(shortName => {
        acc[shortName] = emoji.imageUrl;
    });
    return acc;
}, {} as Record<string, string>);


export const renderMessage = (text: string) => {
	const parts = text.split(/(:[a-z0-9_+-]+:)/gi);

	return parts.filter(Boolean).map((part) => {
		const match = part.match(/^:([a-z0-9_+-]+):$/i);
		if (!match) {
			return { type: 'text', value: part };
		}

		const key = match[1];
		if (EMOJI_MAP[key]) {
			return { type: 'emoji', src: EMOJI_MAP[key], alt: key };
		}

		return { type: 'text', value: part };
	});
};
