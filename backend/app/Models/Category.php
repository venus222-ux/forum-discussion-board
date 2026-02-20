<?php
// app/Models/Category.php
// app/Models/Category.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use SoftDeletes, HasFactory;

    protected $fillable = [
        'uuid', 'name', 'slug', 'description', 'icon', 'color',
        'parent_id', 'display_order', 'is_active', 'thread_count'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($category) {
            $category->uuid = (string) Str::uuid();
            $category->slug = self::generateUniqueSlug($category->name);
        });

        static::updating(function ($category) {
            if ($category->isDirty('name')) {
                $category->slug = self::generateUniqueSlug($category->name, $category->id);
            }
        });
    }

    public static function generateUniqueSlug($name, $ignoreId = null)
    {
        $slug = Str::slug($name);
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

    public function threads(): HasMany
    {
        return $this->hasMany(Thread::class);
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }
}
