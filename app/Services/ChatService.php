<?php

namespace App\Services;

use App\Models\ChatMessage;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ChatService
{
	private const MAX_MESSAGES = 500;

	/**
	 * Получает последние сообщения для комнаты и сортирует их в хронологическом порядке.
	 *
	 * @param  Room  $room
	 * @return array
	 */
	public function getMessages(Room $room): array
	{
		// Загружаем последние 500 сообщений, включая информацию об авторе,
		// и затем сортируем их по возрастанию даты создания для правильного отображения в чате.
		return $room
			->chatMessages()
			->with('user')
			->orderBy('created_at', 'asc')
			->limit(500)
			->get()
			->toArray();
	}

	/**
	 * Сохраняет новое сообщение в чате и запускает очистку старых сообщений.
	 *
	 * @param  Room  $room
	 * @param  User  $user
	 * @param  string  $content
	 * @return ChatMessage
	 * @throws \Throwable
	 */
	public function sendMessage(Room $room, User $user, string $content): ChatMessage
	{
		$message = DB::transaction(function () use ($room, $user, $content) {
			$message = $room->chatMessages()->create([
				'user_id' => $user->id,
				'content' => $content,
			]);

			$this->pruneChatHistory($room);

			return $message;
		});

		// Загружаем автора сообщения для отправки на фронтенд
		$message->load('user');

		return $message;
	}

	/**
	 * Удаляет сообщение, если у пользователя есть на это права (он создатель комнаты).
	 *
	 * @param  User  $user
	 * @param  ChatMessage  $message
	 * @return bool
	 */
	public function deleteMessage(User $user, ChatMessage $message): bool
	{
		if ($message->room->user_id !== $user->id) {
			return false;
		}

		return $message->delete();
	}

	/**
	 * Удаляет самые старые сообщения, если их количество в чате превышает лимит.
	 *
	 * @param  Room  $room
	 * @return void
	 */
	private function pruneChatHistory(Room $room): void
	{
		$messageCount = $room->chatMessages()->count();

		if ($messageCount > self::MAX_MESSAGES) {
			$messagesToDelete = $room->chatMessages()
				->orderBy('created_at', 'asc')
				->limit($messageCount - self::MAX_MESSAGES)
				->pluck('id');

			ChatMessage::destroy($messagesToDelete);
		}
	}
}
