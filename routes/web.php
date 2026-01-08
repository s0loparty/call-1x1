<?php

use App\Http\Controllers\UserStatusController;
use App\Models\User;
use App\Services\OnlineStatusService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function (OnlineStatusService $onlineStatusService) {
    // $users = User::where('id', '!=', auth()->id())->get();
    $users = User::where('id', '!=', Auth::user()->id)->get();
    return Inertia::render('Dashboard', [
        'users' => $users,
        'onlineUserIds' => $onlineStatusService->getOnlineUserIds(),
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('users', function () {
    return User::where('id', '!=', Auth::user()->id)->get();
})->middleware(['auth', 'verified'])->name('users');

Route::post('call/signal', [\App\Http\Controllers\CallSignalingController::class, 'signal'])
    ->middleware(['auth', 'verified'])
    ->name('call.signal');

Route::post('/users/online', [UserStatusController::class, 'goOnline'])
    ->middleware(['auth', 'verified'])
    ->name('users.online');

Route::post('/users/offline', [UserStatusController::class, 'goOffline'])
    ->middleware(['auth', 'verified'])
    ->name('users.offline');


require __DIR__.'/settings.php';
require __DIR__.'/rooms.php';
