<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\CommentVote;
use App\Models\Thread;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use MongoDB\BSON\ObjectId;
use MongoDB\Driver\Exception\BulkWriteException;
use App\Notifications\BestAnswerSelectedNotification;
use App\Notifications\CommentLiked;
use App\Notifications\ThreadCommented;
use App\Notifications\CommentReplied;

class CommentController extends Controller
{
    // ---------------- FETCH COMMENTS FOR THREAD BY SLUG ----------------
    public function getThreadComments($slug)
    {
        $thread = Thread::where('slug', $slug)->first();
        if (!$thread) return response()->json([], 404);

        $comments = Comment::where('threadId', $thread->uuid)
            ->where('status', 'active')
            ->orderBy('path')
            ->get();

        $tree = $this->buildTreeFast($comments);

        $bestId = $thread->best_comment_id;
        $tree = $this->markBestComment($tree, $bestId);

        $tree = $this->mapUserInfoOptimized($tree);

        usort($tree, function ($a, $b) {
            if (($a['isBest'] ?? false) && !($b['isBest'] ?? false)) return -1;
            if (!($a['isBest'] ?? false) && ($b['isBest'] ?? false)) return 1;
            return strtotime($b['createdAt'] ?? 'now') - strtotime($a['createdAt'] ?? 'now');
        });

        return response()->json($tree);
    }

    private function markBestComment(array $comments, $bestId)
    {
        if (!$bestId) return $comments;

        foreach ($comments as &$comment) {
            $commentId = (string)$comment['_id'];
            $comment['isBest'] = $commentId === (string)$bestId;
            if (!empty($comment['children'])) {
                $comment['children'] = $this->markBestComment($comment['children'], $bestId);
            }
        }

        return $comments;
    }

     // ---------------- ACCEPT BEST ANSWER ----------------
    public function acceptBest($commentId)
    {
        $user = auth()->user();

        try { $objectId = new ObjectId($commentId); }
        catch (\Exception $e) { return response()->json(['message' => 'Invalid commentId'], 400); }

        $comment = Comment::raw()->findOne(['_id' => $objectId]);
        if (!$comment) return response()->json(['message' => 'Comment not found'], 404);

        $thread = Thread::where('uuid', $comment['threadId'])->first();
        if (!$thread) return response()->json(['message' => 'Thread not found'], 404);
        if ($thread->user_id !== $user->id) return response()->json(['message' => 'Forbidden'], 403);
        if ($thread->best_comment_id === $commentId) return response()->json(['message' => 'Already accepted'], 400);

        DB::beginTransaction();
        try {
            // Remove old best answer reward
            if ($thread->best_comment_id) {
                $oldComment = Comment::raw()->findOne(['_id' => new ObjectId($thread->best_comment_id)]);
                if ($oldComment) {
                    $oldAuthor = User::find($oldComment['authorId']);
                    if ($oldAuthor) {
                        $oldAuthor->decrement('reputation', 15);
                        $oldAuthor->decrement('accepted_answers', 1);
                    }
                }
            }

            $thread->best_comment_id = $commentId;
            $thread->save();
            Thread::where('uuid', $thread->uuid)->lockForUpdate()->update(['best_comment_id' => $commentId]);

            // Reward comment author
            $author = User::find($comment['authorId']);
            if ($author) {
                $author->increment('reputation', 15);
                $author->increment('accepted_answers');
                $author->notify(new BestAnswerSelectedNotification($thread, $comment, $user));
            }

            // Reward thread author
            $user->increment('reputation', 2);
            $user->increment('given_best_answers');

            DB::commit();

            return response()->json(['message' => 'Best answer selected', 'best_comment_id' => $commentId]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error', 'error' => $e->getMessage()], 500);
        }
    }

    // ---------------- BUILD NESTED TREE ----------------
    private function buildTreeFast($comments)
    {
        $map = [];
        $tree = [];

        foreach ($comments as $comment) {
            $arr = $comment->toArray();
            $arr['_id'] = (string)$comment->_id;
            $arr['children'] = [];
            $map[$arr['_id']] = $arr;
        }

        foreach ($map as $id => &$comment) {
            if (!empty($comment['parentId']) && isset($map[$comment['parentId']])) {
                $map[$comment['parentId']]['children'][] = &$comment;
            } else {
                $tree[] = &$comment;
            }
        }

        return $tree;
    }

    // ---------------- OPTIMIZED USER MAPPING ----------------
    private function mapUserInfoOptimized(array $comments)
    {
        $userIds = $this->collectUserIds($comments);
        $users = User::whereIn('id', $userIds)->get()->keyBy('id');
        return $this->attachUsers($comments, $users);
    }

    private function collectUserIds(array $comments)
    {
        $ids = [];
        foreach ($comments as $comment) {
            if (!empty($comment['authorId'])) $ids[] = $comment['authorId'];
            if (!empty($comment['children'])) $ids = array_merge($ids, $this->collectUserIds($comment['children']));
        }
        return array_unique($ids);
    }

    private function attachUsers(array $comments, $users)
    {
        foreach ($comments as &$comment) {
            $user = $users[$comment['authorId']] ?? null;
            $comment['user'] = [
                'id' => $comment['authorId'],
                'name' => $user->name ?? 'Anonymous'
            ];
            if (!empty($comment['children'])) {
                $comment['children'] = $this->attachUsers($comment['children'], $users);
            }
        }
        return $comments;
    }

    // ---------------- POST NEW COMMENT ----------------
    public function store(Request $request, $slug)
    {
        $thread = Thread::where('slug', $slug)->first();
        if (!$thread) return response()->json(['message' => 'Thread not found'], 404);

        $data = $request->validate([
            'content' => 'required|string',
            'parentId' => 'nullable|string'
        ]);

        $parent = null;
        $path = '';
        $depth = 0;

        if (!empty($data['parentId'])) {
            $parent = Comment::where('_id', $data['parentId'])->first();
            if (!$parent) return response()->json(['message' => 'Parent comment not found'], 404);

            $depth = $parent->depth + 1;

            $lastChild = Comment::where('parentId', (string)$parent->_id)
                ->orderBy('path', 'desc')
                ->first();
            $nextSegment = $lastChild ? intval(substr($lastChild->path, -3)) + 1 : 1;
            $path = $parent->path . '.' . str_pad($nextSegment, 3, '0', STR_PAD_LEFT);

            Comment::where('_id', $parent->_id)->increment('replyCount');
        } else {
            $lastRoot = Comment::where('threadId', $thread->uuid)
                ->whereNull('parentId')
                ->orderBy('path', 'desc')
                ->first();
            $nextSegment = $lastRoot ? intval($lastRoot->path) + 1 : 1;
            $path = str_pad($nextSegment, 3, '0', STR_PAD_LEFT);
        }

        $comment = Comment::create([
            'threadId' => $thread->uuid,
            'authorId' => auth()->user()->id,
            'content' => $data['content'],
            'parentId' => $parent ? (string)$parent->_id : null,
            'path' => $path,
            'depth' => $depth,
            'upvotes' => 0,
            'downvotes' => 0,
            'replyCount' => 0,
            'mentions' => [],
            'status' => 'active',
            'isEdited' => false,
            'attachments' => [],
            'createdAt' => now(),
            'updatedAt' => now(),
            'is_hidden' => false,
            'official_reply' => false,
            'moderation_reason' => null,
        ]);

        $thread->increment('comment_count');

        $actor = auth()->user();

        // ================== NOTIFICATIONS ==================
        // Thread author
        if ($thread->user_id !== $actor->id) {
            $threadAuthor = User::find($thread->user_id);
            if ($threadAuthor) $threadAuthor->notify(new ThreadCommented($thread, $comment, $actor));
        }

        // Parent comment author
        if ($parent && $parent->authorId !== $actor->id) {
            $parentAuthor = User::find($parent->authorId);
            if ($parentAuthor) $parentAuthor->notify(new CommentReplied($thread, $comment, $actor));
        }

        return response()->json([
            '_id' => (string)$comment->_id,
            'threadId' => $comment->threadId,
            'parentId' => $comment->parentId,
            'path' => $comment->path,
            'depth' => $comment->depth,
            'content' => $comment->content,
            'upvotes' => $comment->upvotes,
            'downvotes' => $comment->downvotes,
            'replyCount' => $comment->replyCount,
            'mentions' => $comment->mentions,
            'status' => $comment->status,
            'isEdited' => $comment->isEdited,
            'attachments' => $comment->attachments,
            'createdAt' => $comment->createdAt,
            'updatedAt' => $comment->updatedAt,
            'user' => [
                'id' => $actor->id,
                'name' => $actor->name
            ]
        ], 201);
    }

    // ---------------- VOTE ----------------
    public function vote(Request $request, $commentId)
    {
        $data = $request->validate(['type' => 'required|in:upvote,downvote']);
        $user = auth()->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);
        $userId = $user->id;

        try { $objectId = new ObjectId($commentId); }
        catch (\Exception $e) { return response()->json(['message' => 'Invalid commentId'], 400); }

        $comment = Comment::raw()->findOne(['_id' => $objectId]);
        if (!$comment) return response()->json(['message' => 'Comment not found'], 404);

        $commentAuthorId = $comment['authorId'];
        if ($commentAuthorId === $userId) return response()->json(['message' => 'You cannot vote your own comment'], 403);

        $existingVote = CommentVote::raw()->findOne(['commentId' => $objectId, 'userId' => $userId]);

        if ($existingVote) {
            if ($existingVote['voteType'] === $data['type']) {
                CommentVote::raw()->deleteOne(['commentId' => $objectId, 'userId' => $userId]);
                $field = $data['type'] === 'upvote' ? 'upvotes' : 'downvotes';
                Comment::raw()->updateOne(['_id' => $objectId], ['$inc' => [$field => -1]]);
                $action = 'removed';
            } else {
                $incField = $data['type'] === 'upvote' ? 'upvotes' : 'downvotes';
                $decField = $existingVote['voteType'] === 'upvote' ? 'upvotes' : 'downvotes';
                CommentVote::raw()->updateOne(['commentId' => $objectId, 'userId' => $userId], ['$set' => ['voteType' => $data['type']]]);
                Comment::raw()->updateOne(['_id' => $objectId], ['$inc' => [$incField => 1, $decField => -1]]);
                $action = 'changed';
            }
        } else {
            CommentVote::raw()->insertOne([
                'commentId' => $objectId,
                'userId' => $userId,
                'voteType' => $data['type'],
                'createdAt' => now()
            ]);
            $field = $data['type'] === 'upvote' ? 'upvotes' : 'downvotes';
            Comment::raw()->updateOne(['_id' => $objectId], ['$inc' => [$field => 1]]);
            $action = 'added';
        }

        // ---------- Reputation system ----------
        if ($action === 'added') {
            if ($data['type'] === 'upvote') User::where('id', $commentAuthorId)->increment('reputation', 10);
            else User::where('id', $commentAuthorId)->decrement('reputation', 2);
        } elseif ($action === 'removed') {
            if ($data['type'] === 'upvote') User::where('id', $commentAuthorId)->decrement('reputation', 10);
            else User::where('id', $commentAuthorId)->increment('reputation', 2);
        } elseif ($action === 'changed') {
            if ($data['type'] === 'upvote') User::where('id', $commentAuthorId)->increment('reputation', 12);
            else User::where('id', $commentAuthorId)->decrement('reputation', 12);
        }

        // ---------- Notification for likes ----------
        if ($action === 'added' && $data['type'] === 'upvote') {
            $author = User::find($commentAuthorId);
            if ($author && $author->id !== $userId) {
                $actor = $user;
                $author->notify(new CommentLiked($comment, $actor, $actor));
            }
        }

        return response()->json(['message' => 'Vote ' . $action, 'action' => $action]);
    }

    // ---------------- DELETE ----------------
    public function delete($commentId)
    {
        Comment::where('_id', $commentId)->update([
            'status' => 'deleted',
            'content' => '[deleted]',
            'updatedAt' => now()
        ]);
        return response()->json(['message' => 'Deleted']);
    }


}
