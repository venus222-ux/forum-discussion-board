<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Get raw MongoDB client
        $client = DB::connection('mongodb')->getMongoClient();
        $db = $client->selectDatabase(DB::connection('mongodb')->getDatabaseName());

        // Create unique index on comment_votes for (commentId + userId)
        $db->comment_votes->createIndex(
            ['commentId' => 1, 'userId' => 1],
            ['unique' => true, 'background' => true]
        );

        echo "✅ Unique index created on comment_votes (commentId + userId)\n";
    }

    public function down(): void
    {
        $client = DB::connection('mongodb')->getMongoClient();
        $db = $client->selectDatabase(DB::connection('mongodb')->getDatabaseName());

        // Drop the index if rolling back
        $db->comment_votes->dropIndex('commentId_1_userId_1');

        echo "🗑️ Index dropped\n";
    }
};
