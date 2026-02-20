<?php
// app/Models/Thread.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\SoftDeletes;

class Thread extends Model
{
    use SoftDeletes, HasFactory;

    protected $fillable = [
        'uuid', 'category_id', 'user_id', 'title', 'slug', 'content',
        'status', 'is_pinned', 'is_locked', 'views', 'upvotes', 'downvotes', 'comment_count', 'last_activity_at'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($thread) {
            $thread->uuid = (string) Str::uuid();
            $thread->slug = self::generateUniqueSlug($thread->title);
        });

        static::updating(function ($thread) {
            if ($thread->isDirty('title')) {
                $thread->slug = self::generateUniqueSlug($thread->title, $thread->id);
            }

            // Thread count handling...
            if ($thread->isDirty('category_id')) {
                $originalCategoryId = $thread->getOriginal('category_id');
                $newCategoryId = $thread->category_id;

                if ($originalCategoryId) {
                    \App\Models\Category::where('id', $originalCategoryId)->decrement('thread_count');
                }
                if ($newCategoryId) {
                    \App\Models\Category::where('id', $newCategoryId)->increment('thread_count');
                }
            }
        });

        static::created(function ($thread) {
            $thread->category()->increment('thread_count');
        });

        static::deleted(function ($thread) {
            if ($thread->category) {
                $thread->category()->decrement('thread_count');
            }
        });

        static::restored(function ($thread) {
            $thread->category()->increment('thread_count');
        });
    }

    public static function generateUniqueSlug($title, $ignoreId = null)
    {
        $slug = Str::slug($title);
        $originalSlug = $slug;
        $count = 1;

        while (self::where('slug', $slug)
                   ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))
                   ->exists()) {
            $slug = $originalSlug . '-' . $count;
            $count++;
        }

        return $slug;
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
