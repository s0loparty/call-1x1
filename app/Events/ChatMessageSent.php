<?php

namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatMessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Создает новый экземпляр события.
     *
     * @param ChatMessage $message Сообщение, которое было отправлено.
     */
    public function __construct(public ChatMessage $message)
    {
        //
    }

    /**
     * Каналы, на которые должно транслироваться событие.
     *
     * @return array
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('rooms.'.$this->message->room_id),
        ];
    }

    /**
     * Имя транслируемого события.
     *
     * @return string
     */
    public function broadcastAs(): string
    {
        return 'chat.message.sent';
    }

    /**
     * Данные, которые будут транслироваться.
     *
     * @return array
     */
    public function broadcastWith(): array
    {
        // Мы отправляем только необходимые данные на фронтенд
        return [
            'message' => [
                'id' => $this->message->id,
                'content' => $this->message->content,
                'created_at' => $this->message->created_at->toIso8601String(),
                'user' => [
                    'id' => $this->message->user->id,
                    'name' => $this->message->user->name,
                ],
            ],
        ];
    }
}
