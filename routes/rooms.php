<?php

use App\Http\Controllers\ChatController;
use App\Http\Controllers\PrepareToJoinRoomController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\RoomPasswordController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
	Route::prefix('rooms')->name('rooms.')->group(function () {
		Route::get('/', [RoomController::class, 'index'])->name('index');
		Route::get('/create', [RoomController::class, 'create'])->name('create');
		Route::post('/', [RoomController::class, 'store'])->name('store');
		Route::post('/{room:slug}/password', RoomPasswordController::class)->name('password.validate');
		Route::post('/{room:slug}/prepare-to-join', PrepareToJoinRoomController::class)->name('prepare-to-join');
		Route::get('/{room:slug}/lobby', [RoomController::class, 'lobby'])->name('lobby');
		Route::get('/{room:slug}/live', [RoomController::class, 'live'])->name('live');
		Route::get('/{room:slug}', [RoomController::class, 'show'])->name('show');
		Route::post('/{room:slug}/join', [RoomController::class, 'join'])->name('join');
		Route::post('/{room:slug}/invite', [RoomController::class, 'generateInviteLink'])->name('invite');
		Route::get('/{room:slug}/edit', [RoomController::class, 'edit'])->name('edit');
		Route::put('/{room:slug}', [RoomController::class, 'update'])->name('update');
		Route::delete('/{room:slug}', [RoomController::class, 'destroy'])->name('destroy');

		Route::post('/{room}/chat/{content}', [ChatController::class, 'store'])->name('chat.store');
	});
});
