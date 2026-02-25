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
        Schema::create('comment_flags', function (Blueprint $table) {
          $table->id();
          $table->string('comment_id'); // Mongo ID
          $table->foreignId('user_id')->constrained()->cascadeOnDelete();
          $table->string('reason');
          $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
          $table->timestamps();
          $table->unique(['comment_id', 'user_id']); // one flag per user

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comment_flags');
    }
};
