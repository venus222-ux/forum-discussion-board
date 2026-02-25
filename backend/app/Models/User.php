<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'accepted_answers',
        'given_best_answers',
        'total_upvotes',
        'total_downvotes',
        'reputation',

    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'accepted_answers' => 'integer',
            'given_best_answers' => 'integer',
            'total_upvotes' => 'integer',
            'total_downvotes' => 'integer',
        ];
    }

    public function getJWTIdentifier() {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return ['role' => $this->role];
    }

    // A user can have many threads
    public function threads()
    {
        return $this->hasMany(\App\Models\Thread::class);
    }


    public function adjustReputation(int $points)
    {
        $this->increment('reputation', $points);
    }

    // If needed later: comments()
     public function comments() {
        return $this->hasMany(Comment::class);
     }
}
