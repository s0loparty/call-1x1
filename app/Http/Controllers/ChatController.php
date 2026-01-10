<?php

namespace App\Http\Controllers;

use App\Events\ChatMessageDeleted;
use App\Events\ChatMessageSent;
use App\Http\Requests\StoreChatMessageRequest;
use App\Models\ChatMessage;
use App\Models\Room;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(private readonly ChatService $chatService)
    {
    }

    /**
     * Store a newly created resource in storage.
     * @throws \Throwable
     */
    public function store(StoreChatMessageRequest $request, Room $room): JsonResponse
    {
        $message = $this->chatService->sendMessage(
            room: $room,
            user: $request->user(),
            content: $request->validated('content')
        );

        broadcast(new ChatMessageSent($message))->toOthers();

        return response()->json(['status' => 'Message sent.']);
    }


    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, ChatMessage $message): JsonResponse
    {
        $roomId = $message->room_id;
        $messageId = $message->id;

        $deleted = $this->chatService->deleteMessage($request->user(), $message);

        if (! $deleted) {
            return response()->json(['status' => 'Forbidden'], 403);
        }

        broadcast(new ChatMessageDeleted($messageId, $roomId))->toOthers();

        return response()->json(['status' => 'Message deleted.']);
    }
}
