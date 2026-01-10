import { User } from '.';

export interface ChatMessage {
	id: number;
	content: string;
	created_at: string;
	user: User;
}
