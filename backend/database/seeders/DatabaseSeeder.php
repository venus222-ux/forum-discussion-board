<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $this->call([
            UserSeeder::class,   // existing users
            ForumSeeder::class,  // categories + threads
           // CommentSeeder::class,
        ]);
    }
}
