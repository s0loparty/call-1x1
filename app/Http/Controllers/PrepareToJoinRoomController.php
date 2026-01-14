<?php

namespace App\Http\Controllers;

use App\Models\Room;
use Illuminate\Http\Request;

class PrepareToJoinRoomController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request, Room $room)
    {
        session(['prepared_to_join_room_'.$room->id => true]);

        return response()->json(['status' => 'Session key set.']);
    }
}
