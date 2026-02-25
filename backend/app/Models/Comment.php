<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Comment extends Model
{
protected $connection = 'mongodb';
protected $collection = 'forum_comments';

    protected $fillable = [ 
        'threadId',
        'authorId',
        'content',
        'parentId',
        'path',
        'depth',
        'upvotes',
        'downvotes',
        'replyCount',
        'mentions',
        'status',
        'isEdited',
        'attachments',
        'createdAt',
        'updatedAt'
    ];

    protected $casts = [
        'mentions' => 'array',
        'attachments' => 'array',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime'
    ];

    public $timestamps = false;

    public function replies()
    {
        return $this->hasMany(Comment::class, 'parentId', '_id');
    }
}
