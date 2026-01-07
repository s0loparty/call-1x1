<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class OnlineStatusService
{
    private const CACHE_KEY = 'online-users';

    /**
     * Get the set of online user IDs.
     *
     * @return array
     */
    public function getOnlineUserIds(): array
    {
        return Cache::get(self::CACHE_KEY, []);
    }

    /**
     * Mark a user as online.
     *
     * @param int $userId
     * @return void
     */
    public function setUserOnline(int $userId): void
    {
        $onlineUsers = $this->getOnlineUserIds();
        $onlineUsers[$userId] = true; // Use user ID as key for quick access
        Cache::put(self::CACHE_KEY, $onlineUsers);
    }

    /**
     * Mark a user as offline.
     *
     * @param int $userId
     * @return void
     */
    public function setUserOffline(int $userId): void
    {
        $onlineUsers = $this->getOnlineUserIds();
        unset($onlineUsers[$userId]);
        Cache::put(self::CACHE_KEY, $onlineUsers);
    }
}
