<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\IncomingCall;
use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CallController extends Controller
{
    /**
     * Initiate a call to a user.
     */
    public function store(Request $request, User $user)
    {
        $caller = $request->user();

        // Prevent calling yourself
        if ($caller->id === $user->id) {
            return response()->json(['error' => 'You cannot call yourself.'], 422);
        }

        // Create a new private room for the call
        $room = Room::create([
            'user_id' => $caller->id,
            'name' => 'Call between ' . $caller->name . ' and ' . $user->name,
            'is_private' => true,
        ]);

        // Dispatch an event to the user being called
        broadcast(new IncomingCall($room, $caller, $user))->toOthers();

        // Return the new room details to the caller
        return response()->json($room, 201);
    }
}