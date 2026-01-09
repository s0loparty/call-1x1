<?php

use App\Http\Controllers\RoomController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('rooms')->name('rooms.')->group(function () {
        Route::get('/', [RoomController::class, 'index'])->name('index');
        Route::get('/create', [RoomController::class, 'create'])->name('create');
        Route::post('/', [RoomController::class, 'store'])->name('store');
        Route::get('/{room:slug}', [RoomController::class, 'show'])->name('show');
        Route::post('/{room:slug}/join', [RoomController::class, 'join'])->name('join');
        Route::post('/{room:slug}/invite', [RoomController::class, 'generateInviteLink'])->name('invite');
    });
});
