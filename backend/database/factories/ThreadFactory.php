<?php

// database/factories/ThreadFactory.php
namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Thread;
use App\Models\User;
use App\Models\Category;
use Illuminate\Support\Str;

class ThreadFactory extends Factory
{
    protected $model = Thread::class;

    public function definition()
    {
        $category = Category::inRandomOrder()->first();
        $user = User::inRandomOrder()->first();

        return [
            'title' => $title = $this->faker->sentence,
            'slug' => Str::slug($title) . '-' . Str::random(5),
            'content' => $this->faker->paragraphs(mt_rand(2,5), true),
            'category_id' => $category->id ?? 1,
            'user_id' => $user->id ?? 1,
            'status' => 'published',
            'is_pinned' => (mt_rand(1,100) <= 5),
            'is_locked' => (mt_rand(1,100) <= 2),
            'views' => mt_rand(0,1000),
            'upvotes' => mt_rand(0,200),
            'downvotes' => mt_rand(0,50),
            'comment_count' => mt_rand(0,100),
            'created_at' => now()->subDays(mt_rand(0, 365)),
            'updated_at' => now(),
            'last_activity_at' => now()->subDays(mt_rand(0,30)),
        ];
    }
}
