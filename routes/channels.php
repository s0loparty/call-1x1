<?php

use App\Models\Room;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('presence-online', function ($user) {
    // Anyone can join the online channel as long as they are authenticated.
    // The user's information will be broadcasted to other members of the channel.
    return $user;
});

Broadcast::channel('rooms.{roomId}', function (User $user, int $roomId) {
    $room = Room::find($roomId);

    if (! $room) {
        return false;
    }

    // Allow access if the room is public
    if ($room->is_private === false) {
        return true;
    }

    // Allow access if the user is the owner of the private room
    return (int) $user->id === (int) $room->user_id;
});
