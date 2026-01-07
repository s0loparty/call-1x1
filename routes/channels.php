<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('presence-online', function ($user) {
    // Anyone can join the online channel as long as they are authenticated.
    // The user's information will be broadcasted to other members of the channel.
    return $user;
});
