<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Thread;
use App\Models\User;
use App\Models\Comment;
use MongoDB\BSON\ObjectId;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;
use Illuminate\Support\Collection;

class CommentSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create();

        $threads = Thread::all();
        $users = User::all();

        if ($threads->isEmpty() || $users->isEmpty()) {
            $this->command->error("Threads or Users missing!");
            return;
        }

        $this->command->info("Seeding deep nested comments + realistic votes...");

        foreach ($threads as $thread) {

            $allComments = collect();
            $commentCount = 0;

            // ====================================
            // ROOT COMMENTS (depth 0)
            // ====================================
            $rootCount = rand(5, 15);

            for ($i = 1; $i <= $rootCount; $i++) {

                $root = $this->createComment(
                    $faker,
                    $users,
                    $thread->uuid,
                    null,
                    str_pad($i, 3, '0', STR_PAD_LEFT),
                    0
                );

                $allComments->push($root);
                $commentCount++;

                // Generate children recursively (depth 1–4)
                $children = $this->generateReplies(
                    $faker,
                    $users,
                    $thread->uuid,
                    $root,
                    1,
                    4
                );

                $allComments = $allComments->merge($children);
                $commentCount += $children->count();
            }

            // Update thread comment count
            $thread->update([
                'comment_count' => $commentCount
            ]);
        }

        // ====================================
        // VOTES (no duplicates per user)
        // ====================================
        $comments = Comment::all();

        foreach ($comments as $comment) {

            $voteCount = rand(0, 8);

            if ($voteCount === 0) continue;

            $voters = $users->random(
                min($voteCount, $users->count())
            );

            $usedUserIds = [];

            foreach ($voters as $user) {

                if (in_array($user->uuid, $usedUserIds)) {
                    continue; // prevent double vote
                }

                $usedUserIds[] = $user->uuid;

                $voteType = rand(0, 1) ? 'upvote' : 'downvote';

                DB::connection('forum_comments')
                    ->collection('comment_votes')
                    ->insert([
                        'commentId' => new ObjectId($comment->_id),
                        'userId' => $user->uuid,
                        'voteType' => $voteType,
                        'createdAt' => now(),
                    ]);

                Comment::where('_id', $comment->_id)
                    ->increment(
                        $voteType === 'upvote'
                            ? 'upvotes'
                            : 'downvotes'
                    );
            }
        }

        $this->command->info("Advanced nested comments seeded successfully.");
    }

    // ==========================================================
    // CREATE SINGLE COMMENT (with deleted + edited logic)
    // ==========================================================
    private function createComment($faker, $users, $threadId, $parent, $path, $depth)
    {
        $isDeleted = rand(1, 100) <= 5;   // 5% deleted
        $isEdited  = rand(1, 100) <= 15;  // 15% edited

        return Comment::create([
            'threadId' => $threadId,
            'authorId' => $users->random()->uuid,
            'content' => $isDeleted
                ? '[deleted]'
                : $faker->paragraph(),
            'parentId' => $parent?->_id,
            'path' => $path,
            'depth' => $depth,
            'upvotes' => 0,
            'downvotes' => 0,
            'replyCount' => 0,
            'mentions' => [],
            'status' => $isDeleted ? 'deleted' : 'active',
            'isEdited' => $isDeleted ? false : $isEdited,
            'attachments' => [],
            'createdAt' => now()->subDays(rand(0, 90)),
            'updatedAt' => $isEdited ? now() : now(),
        ]);
    }

    // ==========================================================
    // RECURSIVE REPLIES GENERATOR (depth 1–4)
    // ==========================================================
    private function generateReplies($faker, $users, $threadId, $parent, $depth, $maxDepth)
    {
        $collection = collect();

        if ($depth > $maxDepth) {
            return $collection;
        }

        $replyCount = rand(0, 4);

        for ($i = 1; $i <= $replyCount; $i++) {

            $path = $parent->path . '.' . str_pad($i, 3, '0', STR_PAD_LEFT);

            $comment = $this->createComment(
                $faker,
                $users,
                $threadId,
                $parent,
                $path,
                $depth
            );

            $collection->push($comment);

            // Recursive deeper replies
            $children = $this->generateReplies(
                $faker,
                $users,
                $threadId,
                $comment,
                $depth + 1,
                $maxDepth
            );

            $collection = $collection->merge($children);
        }

        // update reply count
        Comment::where('_id', $parent->_id)
            ->update(['replyCount' => $replyCount]);

        return $collection;
    }
}
