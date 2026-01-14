<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Agence104\LiveKit\AccessToken;
use Agence104\LiveKit\AccessTokenOptions;
use Agence104\LiveKit\VideoGrant;
use Illuminate\Support\Facades\Log;

class RoomController extends Controller
{
    /**
     * Display a listing of the rooms.
     */
    public function index()
    {
        $publicRooms = Room::with('user')->where('is_private', false)->latest()->get();
        $userRooms = Room::with('user')->where('user_id', Auth::user()->id)->latest()->get();

        return response()->json([
            'public_rooms' => $publicRooms,
            'user_rooms' => $userRooms,
        ]);
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
            'is_private' => $validated['is_private'] ?? false,
            'password' => isset($validated['password']) ? Hash::make($validated['password']) : null,
        ]);

        return response()->json($room, 201);
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
            $validated = $request->validate([
                'password' => 'required|string',
            ]);

            if (! Hash::check($validated['password'], $room->password)) {
                return response()->json(['error' => 'Incorrect room password.'], 403);
            }
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

		try {
			$token = $accessToken->toJwt();
			return response()->json([
				'token' => $token,
				'livekit_host' => Config::get('services.livekit.host'),
			]);
		} catch (\Exception $e) {
			Log::error('Failed to generate LiveKit token for API', ['error' => $e->getMessage(), 'room_id' => $room->id, 'user_id' => $user->id]);
			return response()->json(['error' => 'Failed to generate access token'], 500);
		}
    }
}