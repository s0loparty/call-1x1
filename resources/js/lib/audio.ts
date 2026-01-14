const playSound = (url: string) => {
	const audio = new Audio(url);
	audio.volume = 0.2;
	audio.play().catch((error) => {
		// Autoplay was prevented. This is common in browsers.
		// We can ignore this error as it's not critical.
		console.warn(`Could not play sound: ${url}`, error);
	});
};

export const playUserConnectedSound = () => {
	playSound('/sounds/room_user_connected.mp3');
};

export const playUserDisconnectedSound = () => {
	playSound('/sounds/room_user_disconnected.mp3');
};
