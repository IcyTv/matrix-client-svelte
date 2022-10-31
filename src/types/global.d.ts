declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		emoji: {
			insertEmoji: (emoji: { char: string; name: string }) => ReturnType;
		};
	}
}

export {};
