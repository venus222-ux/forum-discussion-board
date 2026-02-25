<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'updatedAt',
        'is_hidden',
        'official_reply',
        'moderation_reason',
    ];

    protected $casts = [
        'mentions' => 'array',
        'attachments' => 'array',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime'
    ];

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';
    public $timestamps = true;

    // Parent comment
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parentId', '_id');
    }

    // Nested children (1 level)
    public function children(): HasMany
    {
        return $this->hasMany(Comment::class, 'parentId', '_id')->with('user');
    }

    // User who posted comment
    public function user(): BelongsTo
{
    return $this->belongsTo(User::class, 'authorId', 'id');
}

}
