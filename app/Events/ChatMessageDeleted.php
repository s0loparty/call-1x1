<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatMessageDeleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Создает новый экземпляр события.
     *
     * @param int $messageId ID удаленного сообщения.
     * @param int $roomId    ID комнаты, в которой было удалено сообщение.
     */
    public function __construct(
        public int $messageId,
        public int $roomId
    ) {
    }

    /**
     * Каналы, на которые должно транслироваться событие.
     *
     * @return array
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('rooms.'.$this->roomId),
        ];
    }

    /**
     * Имя транслируемого события.
     *
     * @return string
     */
    public function broadcastAs(): string
    {
        return 'chat.message.deleted';
    }

    /**
     * Данные, которые будут транслироваться.
     *
     * @return array
     */
    public function broadcastWith(): array
    {
        return [
            'message_id' => $this->messageId,
        ];
    }
}
