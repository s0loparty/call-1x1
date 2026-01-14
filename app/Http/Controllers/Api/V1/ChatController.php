<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ChatMessageDeleted;
use App\Events\ChatMessageSent;
use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\Room;
use App\Services\ChatService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ChatController extends Controller
{
    public function __construct(private readonly ChatService $chatService)
    {
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Room $room): JsonResponse
    {
        // We can authorize this action using a policy if needed
        // For now, we assume if the user can join the room, they can see the chat.
        $messages = $this->chatService->getMessages($room);

        return response()->json($messages);
    }

    /**
     * Store a newly created resource in storage.
     * @throws \Throwable
     */
    public function store(Request $request, Room $room): JsonResponse
    {
        $validated = $request->validate([
            'content' => ['required', 'string', 'max:1000'],
        ]);

        $message = $this->chatService->sendMessage(
            room: $room,
            user: $request->user(),
            content: $validated['content']
        );

        broadcast(new ChatMessageSent($message))->toOthers();

        return response()->json($message, 201);
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
            return response()->json(['error' => 'Forbidden'], 403);
        }

        broadcast(new ChatMessageDeleted($messageId, $roomId))->toOthers();

        return response()->json(null, 204);
    }
}