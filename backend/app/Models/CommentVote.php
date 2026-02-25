<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class CommentVote extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'comment_votes';

    protected $fillable = [
        'commentId',
        'userId',
        'voteType',
        'createdAt'
    ];

    public $timestamps = false;
}
