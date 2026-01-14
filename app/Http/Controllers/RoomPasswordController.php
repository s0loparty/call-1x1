<?php

namespace App\Http\Controllers;

use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class RoomPasswordController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request, Room $room)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Only the room owner doesn't need to validate the password
        if ($room->user_id === $user->id) {
            return response()->json(['status' => 'Authorized'], 200);
        }

        if (! $room->is_private) {
            return response()->json(['status' => 'Not a private room'], 200);
        }

        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (! Hash::check($validated['password'], $room->password)) {
            return response()->json(['message' => 'Incorrect room password'], 403);
        }

        // Store a session key to bypass future password checks for this room
        session(['allowed_to_join_room_'.$room->id => true]);

        return response()->json(['status' => 'Authorized'], 200);
    }
}
