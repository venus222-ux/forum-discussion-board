<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Comment;
<<<<<<< HEAD
<<<<<<< HEAD
=======
use Laravel\Scout\Searchable;  // Add this
>>>>>>> b0354f2 (add the button choose best answer buy the author of the thread)
=======
>>>>>>> ae5dd85d9b441ffddbf18e313884df29e585a949

class Thread extends Model
{
    use SoftDeletes, HasFactory, Searchable;  // Add Searchable here

    protected $fillable = [
        'uuid',
        'category_id',
        'user_id',
        'title',
        'slug',
        'content',
        'status',
        'is_pinned',
        'is_locked',
        'views',
        'upvotes',
        'downvotes',
        'comment_count',
        'last_activity_at',
        'best_comment_id'
    ];

<<<<<<< HEAD
<<<<<<< HEAD
=======
    // Add this method to define searchable data (exclude _id if present)
    public function toSearchableArray()
    {
        return [
            'id' => (int) $this->id,
            'title' => $this->title,
            'content' => $this->content,
            'category_id' => (int) $this->category_id,
            // You can add more fields like 'user_id' for user-based searches
        ];
    }

>>>>>>> b0354f2 (add the button choose best answer buy the author of the thread)
=======
>>>>>>> ae5dd85d9b441ffddbf18e313884df29e585a949
    // ---------------- Slug + boot logic ----------------
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
<<<<<<< HEAD

<<<<<<< HEAD
=======
>>>>>>> b0354f2 (add the button choose best answer buy the author of the thread)
=======
>>>>>>> ae5dd85d9b441ffddbf18e313884df29e585a949
    // ---------------- Relationships ----------------
    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class);
    }
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> b0354f2 (add the button choose best answer buy the author of the thread)
=======

>>>>>>> ae5dd85d9b441ffddbf18e313884df29e585a949
    public function category(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Category::class);
    }
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> b0354f2 (add the button choose best answer buy the author of the thread)
=======

>>>>>>> ae5dd85d9b441ffddbf18e313884df29e585a949
    // ---------------- MongoDB-safe comments ----------------
    public function fetchComments()
    {
        // Top-level comments (parentId = null)
        $comments = Comment::where('threadId', $this->_id)
            ->whereNull('parentId')
            ->with(['user', 'children.user']) // only 1-level deep
            ->orderBy('createdAt', 'asc')
            ->get();
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> b0354f2 (add the button choose best answer buy the author of the thread)
=======

>>>>>>> ae5dd85d9b441ffddbf18e313884df29e585a949
        // Convert _id fields to string for frontend
        return $comments->map(function ($c) {
            $cArr = $c->toArray();
            $cArr['_id'] = (string) $c->_id;
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> b0354f2 (add the button choose best answer buy the author of the thread)
=======

>>>>>>> ae5dd85d9b441ffddbf18e313884df29e585a949
            if (!empty($cArr['children'])) {
                $cArr['children'] = collect($cArr['children'])->map(function ($child) {
                    $child['_id'] = (string) $child['_id'];
                    return $child;
                })->toArray();
            }
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> b0354f2 (add the button choose best answer buy the author of the thread)
=======

>>>>>>> ae5dd85d9b441ffddbf18e313884df29e585a949
            return $cArr;
        })->toArray();
    }
}
