<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function () {
    $users = \App\Models\User::where('id', '!=', auth()->id())->get();
    return Inertia::render('Dashboard', [
        'users' => $users,
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('users', function () {
    return \App\Models\User::where('id', '!=', auth()->id())->get();
})->middleware(['auth', 'verified'])->name('users');

Route::post('call/signal', [\App\Http\Controllers\CallSignalingController::class, 'signal'])
    ->middleware(['auth', 'verified'])
    ->name('call.signal');

require __DIR__.'/settings.php';
