<?php

namespace App\Http\Controllers;

use App\Events\UserStatusChanged;
use App\Services\OnlineStatusService;
use Illuminate\Http\Request;

class UserStatusController extends Controller
{
    protected OnlineStatusService $onlineStatusService;

    public function __construct(OnlineStatusService $onlineStatusService)
    {
        $this->onlineStatusService = $onlineStatusService;
    }

    public function goOnline(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $this->onlineStatusService->setUserOnline($user->id);
            broadcast(new UserStatusChanged($user->id, 'online'))->toOthers();
        }

        return response()->noContent();
    }

    public function goOffline(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $this->onlineStatusService->setUserOffline($user->id);
            broadcast(new UserStatusChanged($user->id, 'offline'))->toOthers();
        }

        return response()->noContent();
    }
}
