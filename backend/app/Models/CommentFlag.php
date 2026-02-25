<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommentFlag extends Model
{
    protected $fillable = [
        'comment_id',
        'user_id',
        'reason',
        'status', // optional: pending, approved, rejected
    ];

    // optional: default table name if you want
    protected $table = 'comment_flags';

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
