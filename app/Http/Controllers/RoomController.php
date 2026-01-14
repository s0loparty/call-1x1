<?php

namespace App\Http\Controllers;

use Agence104\LiveKit\AccessToken;
use Agence104\LiveKit\AccessTokenOptions;
use Agence104\LiveKit\VideoGrant;

use App\Models\Room;
use App\Models\User;
use App\Services\ChatService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RoomController extends Controller
{
	/**
	 * Display a listing of the rooms.
	 */
	public function index()
	{
		$publicRooms = Room::with('user')->where('is_private', false)->latest()->get();
		$userRooms   = Room::with('user')->where('user_id', Auth::user()->id)->latest()->get();

		return Inertia::render('Rooms/Index', [
			'publicRooms' => $publicRooms,
			'userRooms' => $userRooms,
		]);
	}

	/**
	 * Show the form for creating a new room.
	 */
	public function create()
	{
		return Inertia::render('Rooms/Create');
	}

	/**
	 * Store a newly created room in storage.
	 */
	public function store(Request $request)
	{
		$validated = $request->validate([
			'name' => 'required|string|max:255',
			'is_private' => 'boolean',
			'password' => 'nullable|string|min:6|required_if:is_private,true',
		]);

		$room = Room::create([
			'user_id' => Auth::user()->id,
			'name' => $validated['name'],
			'is_private' => $validated['is_private'],
			'password' => $validated['password'] ? Hash::make($validated['password']) : null,
		]);

		return redirect()->route('rooms.show', $room->slug);
	}

	/**
	 * Show the lobby for a specified room.
	 */
	public function lobby(Room $room)
	{
		return Inertia::render('Rooms/Lobby', [
			'room' => $room->load('user'),
		]);
	}

	public function live(Request $request, Room $room, ChatService $chatService)
	{
		/** @var User $user */
		$user = Auth::user();

		// Ensure the user has gone through the lobby preparation step.
        // This prevents direct URL access and forces device setup.
        if (! session()->pull('prepared_to_join_room_'.$room->id)) {
            return redirect()->route('rooms.lobby', $room->slug);
        }

		$tokenOptions = (new AccessTokenOptions())
			->setIdentity((string) $user->id)
			->setName($user->name);

		$videoGrant = (new VideoGrant())
			->setRoomJoin(true)
			->setRoomName($room->livekit_room_name)
			->setCanPublish(true)
			->setCanSubscribe(true);

		$accessToken = (new AccessToken(
			Config::get('services.livekit.key'),
			Config::get('services.livekit.secret')
		))
			->init($tokenOptions)
			->setGrant($videoGrant);

		return Inertia::render('Rooms/Live', [
			'room' => $room->load('user'),
			'livekitToken' => $accessToken->toJwt(),
			'livekitHost' => Config::get('services.livekit.host'),
			'chatMessages' => $chatService->getMessages($room),
		]);
	}

	/**
	 * Display the specified room.
	 */
	public function show(Request $request, Room $room, ChatService $chatService)
	{
		if ($request->hasValidSignature()) {
			session(['allowed_to_join_room_'.$room->id => true]);
		}

		return Inertia::render('Rooms/Show', [
			'room' => $room->load('user'),
			'chatMessages' => $chatService->getMessages($room),
		]);
	}

	/**
	 * Generate LiveKit access token for joining a room.
	 */
	public function join(Room $room, Request $request)
	{
		/** @var User $user */
		$user = Auth::user();

		// Check password for private rooms
		if ($room->is_private && $room->user_id !== $user->id) {
			// Bypass password check if invited via link (session key is pulled, so it's a one-time use)
			if (! session()->pull('allowed_to_join_room_'.$room->id)) {
				$validated = $request->validate([
					'password' => 'required|string',
				]);

				if (! Hash::check($validated['password'], $room->password)) {
					return back()->withErrors(['password' => 'Incorrect room password.']);
				}
			}
		}

		// Define the token options.
		$tokenOptions = (new AccessTokenOptions())
			->setIdentity((string) $user->id)
			->setName($user->name);

		// Prepare LiveKit grants
		$videoGrant = (new VideoGrant())
			->setRoomJoin(true)
			->setRoomName($room->livekit_room_name)
			->setCanPublish(true)
			->setCanSubscribe(true);

		// Create LiveKit Access Token
		$accessToken = (new AccessToken(
			Config::get('services.livekit.key'),
			Config::get('services.livekit.secret')
		))
			->init($tokenOptions)
			->setGrant($videoGrant);

		try {
			$token = $accessToken->toJwt();
			return response()->json([
				'token' => $token,
				'livekit_host' => Config::get('services.livekit.host'),
			]);
		} catch (\Exception $e) {
			Log::error('Failed to generate LiveKit token', ['error' => $e->getMessage(), 'room_id' => $room->id, 'user_id' => $user->id]);
			return response()->json(['error' => 'Failed to generate access token'], 500);
		}
	}

	/**
	 * Generate a temporary signed invite link for the room.
	 */
	public function generateInviteLink(Room $room)
	{
		// Only the room owner can generate an invite link
		if ($room->user_id !== Auth::user()->id) {
			abort(403, 'Unauthorized');
		}

		$inviteLink = URL::temporarySignedRoute(
			'rooms.show',
			now()->addHours(24),
			['room' => $room->slug]
		);

		return response()->json(['invite_link' => $inviteLink]);
	}

	/**
	 * Show the form for editing the specified room.
	 */
	public function edit(Room $room)
	{
		if (Auth::user()->id !== $room->user_id) {
			abort(403);
		}

		return Inertia::render('Rooms/Edit', [
			'room' => $room,
		]);
	}

	/**
	 * Update the specified room in storage.
	 */
	public function update(Request $request, Room $room)
	{
		if (Auth::user()->id !== $room->user_id) {
			abort(403);
		}

		$validated = $request->validate([
			'name' => ['required', 'string', 'max:255'],
			'is_private' => 'boolean',
			'password' => 'nullable|string|min:6',
		]);

		$room->name       = $validated['name'];
		$room->is_private = $request->boolean('is_private');

		if ($room->is_private) {
			// Only update password if a new one is provided
			if ($request->filled('password')) {
				$room->password = Hash::make($request->password);
			}
		} else {
			// If room is made public, remove password
			$room->password = null;
		}

		$room->save();

		return redirect()->route('rooms.index');
	}

	/**
	 * Remove the specified room from storage.
	 */
	public function destroy(Room $room)
	{
		if (Auth::user()->id !== $room->user_id) {
			abort(403);
		}

		$room->delete();

		return redirect()->route('rooms.index');
	}
}
