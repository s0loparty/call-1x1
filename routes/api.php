<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CallController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\RoomController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);
        Route::get('/users', [AuthController::class, 'index']);

        // Call routes
        Route::post('/users/{user}/call', [CallController::class, 'store']);

        // Room routes
        Route::get('/rooms', [RoomController::class, 'index']);
        Route::post('/rooms', [RoomController::class, 'store']);
        Route::post('/rooms/{room}/join', [RoomController::class, 'join']);

        // Chat routes
        Route::get('/rooms/{room}/messages', [ChatController::class, 'index']);
        Route::post('/rooms/{room}/messages', [ChatController::class, 'store']);
        Route::delete('/messages/{message}', [ChatController::class, 'destroy']);
    });
});