<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Room extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'is_private',
        'password',
        'livekit_room_name',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_private' => 'boolean',
    ];

    /**
     * Get the user that owns the room.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The "booted" method of the model.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $room) {
            if (empty($room->slug)) {
                $room->slug = Str::slug($room->name) . '-' . Str::random(8);
            }
            if (empty($room->livekit_room_name)) {
                $room->livekit_room_name = (string) Str::uuid();
            }
        });
    }
}

