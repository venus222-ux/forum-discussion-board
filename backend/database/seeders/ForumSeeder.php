<?php
// database/seeders/ForumSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\Thread;
use App\Models\User;
use Illuminate\Support\Str;
use Faker\Factory as Faker;

class ForumSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create();

        // 1. Create 20 tech categories
        $techCategories = [
            'Java', 'React', 'Vue', 'Angular', 'Python', 'PHP', 'Laravel', 'Node.js',
            'Django', 'Ruby on Rails', 'C#', 'Go', 'Rust', 'Flutter', 'Kotlin', 'Swift',
            'TypeScript', 'GraphQL', 'Docker', 'Kubernetes'
        ];

        $categories = [];
        $categoryActivityBase = [];

        foreach ($techCategories as $name) {
            $category = Category::create([
                'name' => $name,
                'description' => "All discussions about $name",
                'icon' => null,
                'color' => sprintf('#%06X', mt_rand(0, 0xFFFFFF)),
            ]);
            $categories[$name] = $category;

            // Base activity date in the past year
            $categoryActivityBase[$name] = now()->subDays(mt_rand(0, 365));
        }

        // 2. Fetch all users
        $users = User::all();
        if ($users->count() === 0) {
            $this->command->error("No users found. Please run UserSeeder first!");
            return;
        }

        $this->command->info("Seeding 1000 threads with hot topics effect...");

        $threadsToCreate = [];

        // 3. Hot categories
        $hotCategories = ['React', 'Laravel', 'Java'];
        foreach ($hotCategories as $name) {
            for ($i = 0; $i < mt_rand(100, 120); $i++) {
                $threadsToCreate[] = [
                    'category' => $categories[$name],
                    'user' => $users->random(),
                    'title' => $faker->sentence(mt_rand(3, 8)),
                ];
            }
        }

        // 4. Medium categories
        $mediumCategories = ['Python', 'Node.js', 'Vue'];
        foreach ($mediumCategories as $name) {
            for ($i = 0; $i < mt_rand(40, 60); $i++) {
                $threadsToCreate[] = [
                    'category' => $categories[$name],
                    'user' => $users->random(),
                    'title' => $faker->sentence(mt_rand(3, 8)),
                ];
            }
        }

        // 5. Remaining categories
        $remainingCategories = array_diff($techCategories, array_merge($hotCategories, $mediumCategories));
        $remainingThreadsCount = 1000 - count($threadsToCreate);

        while ($remainingThreadsCount > 0) {
            foreach ($remainingCategories as $name) {
                if ($remainingThreadsCount <= 0) break;
                $threadsToCreate[] = [
                    'category' => $categories[$name],
                    'user' => $users->random(),
                    'title' => $faker->sentence(mt_rand(3, 8)),
                ];
                $remainingThreadsCount--;
            }
        }

        // 6. Create threads with realistic timestamps
        foreach ($threadsToCreate as $threadData) {
            $category = $threadData['category'];
            $user = $threadData['user'];
            $title = $threadData['title'];

            $baseDate = $categoryActivityBase[$category->name];
            $createdAt = $baseDate->copy()->addDays(mt_rand(0, 30))->addMinutes(mt_rand(0, 1440));
            $lastActivityAt = $createdAt->copy()->addDays(mt_rand(0, 15))->addMinutes(mt_rand(0, 1440));

            Thread::create([
                'title' => $title,
                'content' => $faker->paragraphs(mt_rand(2, 5), true),
                'category_id' => $category->id,
                'user_id' => $user->id,
                'status' => 'published',
                'is_pinned' => (mt_rand(1, 100) <= 5),
                'is_locked' => (mt_rand(1, 100) <= 2),
                'views' => mt_rand(0, 1000),
                'upvotes' => mt_rand(0, 200),
                'downvotes' => mt_rand(0, 50),
                'comment_count' => mt_rand(0, 100),
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
                'last_activity_at' => $lastActivityAt,
            ]);
        }

        $this->command->info("Seeded 20 categories and 1000 threads with hot topics successfully!");
    }
}
