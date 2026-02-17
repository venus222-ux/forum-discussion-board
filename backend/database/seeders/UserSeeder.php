<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\DB;


class UserSeeder extends Seeder
{
    public function run()
    {
        DB::table('users')->delete();

        User::factory()->create([
            'name' => 'Alice Smith',
            'email' => 'alice@example.com',
            'password' => bcrypt('password123'),
        ]);

        User::factory()->create([
            'name' => 'Bob Johnson',
            'email' => 'bob@example.com',
            'password' => bcrypt('password123'),
        ]);

        User::factory()->create([
            'name' => 'Charlie Davis',
            'email' => 'charlie@example.com',
            'password' => bcrypt('password123'),
        ]);

        // More users via factory
        User::factory(7)->create();
    }
}
