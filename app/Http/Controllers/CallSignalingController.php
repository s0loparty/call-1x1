<?php

namespace App\Http\Controllers;

use App\Events\SignalingMessageReceived;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class CallSignalingController extends Controller
{
    public function signal(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'string'],
            'to_user_id' => ['required', 'integer', 'exists:users,id'],
            'callType' => ['nullable', 'string', Rule::in(['audio', 'video'])],
            'payload' => ['nullable', 'array'],
        ]);

        $fromUserId = $request->user()->id;

        // Ensure a user cannot send a signal to themselves
        if ($fromUserId === (int) $data['to_user_id']) {
            return response()->json(['error' => 'Cannot signal yourself.'], 422);
        }
        
        Log::info('Signaling message sent', [
            'from_user_id' => $fromUserId,
            'to_user_id' => $data['to_user_id'],
            'type' => $data['type'],
            'callType' => $data['callType'] ?? null,
        ]);

        SignalingMessageReceived::dispatch(
            $data['type'],
            $fromUserId,
            (int) $data['to_user_id'],
            $data['callType'] ?? 'audio',
            $data['payload'] ?? null
        );

        return response()->json(['status' => 'success']);
    }
}
