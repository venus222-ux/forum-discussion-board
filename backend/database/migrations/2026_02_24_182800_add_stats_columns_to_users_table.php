<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->integer('accepted_answers')->default(0);
            $table->integer('given_best_answers')->default(0);
            $table->integer('total_upvotes')->default(0);
            $table->integer('total_downvotes')->default(0);

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'accepted_answers',
                'given_best_answers',
                'total_upvotes',
                'total_downvotes'
            ]);
        });
    }
};
