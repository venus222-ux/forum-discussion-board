<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ModerationLog extends Model
{
    protected $fillable = [
        'moderator_id',
        'action',
        'comment_id'
    ];

    protected $table = 'moderation_logs';
}
