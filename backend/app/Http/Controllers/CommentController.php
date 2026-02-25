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
use App\Events\BestAnswerSelected;

class CommentController extends Controller
{
    // ---------------- FETCH COMMENTS FOR THREAD BY SLUG ----------------
public function getThreadComments($slug)
{
    $thread = Thread::where('slug', $slug)->first();

    if (!$thread) {
        return response()->json([], 404);
    }

    $comments = Comment::where('threadId', $thread->uuid)
        ->where('status', 'active')
        ->orderBy('path')
        ->get();

    $tree = $this->buildTreeFast($comments);

    // 👇 IMPORTANT: Mark the best comment BEFORE mapping user info
    $bestId = $thread->best_comment_id;
    $tree = $this->markBestComment($tree, $bestId);

    // 👇 Then map user info
    $tree = $this->mapUserInfoOptimized($tree);

    // Sort root comments to show best answer first
    usort($tree, function ($a, $b) {
        // Best answer first
        if (($a['isBest'] ?? false) && !($b['isBest'] ?? false)) {
            return -1;
        }
        if (!($a['isBest'] ?? false) && ($b['isBest'] ?? false)) {
            return 1;
        }
        // Then sort by date (newest first)
        return strtotime($b['createdAt'] ?? 'now') - strtotime($a['createdAt'] ?? 'now');
    });

    return response()->json($tree);
}

private function markBestComment(array $comments, $bestId)
{
    foreach ($comments as &$comment) {
        // Convert both to string for comparison
        $comment['isBest'] = (string)$comment['_id'] === (string)$bestId;

        if (!empty($comment['children'])) {
            $comment['children'] = $this->markBestComment($comment['children'], $bestId);
        }
    }

    return $comments;
}


    // ---------------- BUILD NESTED TREE ----------------
    private function buildTreeFast($comments)
    {
        $map = [];
        $tree = [];

        foreach ($comments as $comment) {
            $arr = $comment->toArray();
            $arr['_id'] = (string) $comment->_id;
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
            if (!empty($comment['authorId'])) {
                $ids[] = $comment['authorId'];
            }

            if (!empty($comment['children'])) {
                $ids = array_merge($ids, $this->collectUserIds($comment['children']));
            }
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
    // 1️⃣ Find thread by slug
    $thread = Thread::where('slug', $slug)->first();

    if (!$thread) {
        return response()->json(['message' => 'Thread not found'], 404);
    }

    // 2️⃣ Validate input
    $data = $request->validate([
        'content' => 'required|string',
        'parentId' => 'nullable|string'
    ]);

    $parent = null;
    $path = '';
    $depth = 0;

    // 3️⃣ Handle reply comment
    if (!empty($data['parentId'])) {
        $parent = Comment::where('_id', $data['parentId'])->first();

        if (!$parent) {
            return response()->json(['message' => 'Parent comment not found'], 404);
        }

        $depth = $parent->depth + 1;

        $lastChild = Comment::where('parentId', (string) $parent->_id)
            ->orderBy('path', 'desc')
            ->first();

        $nextSegment = $lastChild
            ? intval(substr($lastChild->path, -3)) + 1
            : 1;

        $path = $parent->path . '.' . str_pad($nextSegment, 3, '0', STR_PAD_LEFT);

        // Increment replyCount on parent
        Comment::where('_id', $parent->_id)->increment('replyCount');
    }
    // 4️⃣ Root comment
    else {
        $lastRoot = Comment::where('threadId', $thread->uuid)
            ->whereNull('parentId')
            ->orderBy('path', 'desc')
            ->first();

        $nextSegment = $lastRoot ? intval($lastRoot->path) + 1 : 1;

        $path = str_pad($nextSegment, 3, '0', STR_PAD_LEFT);
    }

    // 5️⃣ Create comment
    $comment = Comment::create([
        'threadId' => $thread->uuid,
        'authorId' => auth()->user()->id, // ✅ Use id instead of uuid
        'content' => $data['content'],
        'parentId' => $parent ? (string) $parent->_id : null,
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
        'updatedAt' => now()
    ]);

    // 6️⃣ Increment thread's comment count
    $thread->increment('comment_count');

    // 7️⃣ Return comment with user info
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
            'id' => auth()->user()->id,    // ✅ Fix: use id
            'name' => auth()->user()->name
        ]
    ], 201);
}

    // ---------------- VOTE ----------------
    public function vote(Request $request, $commentId)
{
    // Validate vote type
    $data = $request->validate([
        'type' => 'required|in:upvote,downvote'
    ]);

    if (!auth()->check()) {
        return response()->json(['message' => 'Unauthenticated'], 401);
    }

    $userId = auth()->id();

    // --- Convert commentId to ObjectId ---
    try {
        $objectId = new ObjectId($commentId);
    } catch (\Exception $e) {
        return response()->json(['message' => 'Invalid commentId'], 400);
    }

    // --- Fetch comment ---
    $comment = Comment::raw()->findOne(['_id' => $objectId]);
    if (!$comment) {
        return response()->json(['message' => 'Comment not found'], 404);
    }

    $commentAuthorId = $comment['authorId'];

    // 🚫 Prevent self-voting (recommended)
    if ($commentAuthorId === $userId) {
        return response()->json(['message' => 'You cannot vote your own comment'], 403);
    }

    // --- Fetch existing vote ---
    $existingVote = CommentVote::raw()->findOne([
        'commentId' => $objectId,
        'userId' => $userId
    ]);

    if ($existingVote) {
        if ($existingVote['voteType'] === $data['type']) {
            // Remove vote (toggle)
            CommentVote::raw()->deleteOne([
                'commentId' => $objectId,
                'userId' => $userId
            ]);

            $field = $data['type'] === 'upvote' ? 'upvotes' : 'downvotes';

            Comment::raw()->updateOne(
                ['_id' => $objectId],
                ['$inc' => [$field => -1]]
            );

            $action = 'removed';
        } else {
            // Change vote type
            CommentVote::raw()->updateOne(
                ['commentId' => $objectId, 'userId' => $userId],
                ['$set' => ['voteType' => $data['type']]]
            );

            $incField = $data['type'] === 'upvote' ? 'upvotes' : 'downvotes';
            $decField = $existingVote['voteType'] === 'upvote' ? 'upvotes' : 'downvotes';

            Comment::raw()->updateOne(
                ['_id' => $objectId],
                ['$inc' => [$incField => 1, $decField => -1]]
            );

            $action = 'changed';
        }
    } else {
        // New vote
        try {
            CommentVote::raw()->insertOne([
                'commentId' => $objectId,
                'userId' => $userId,
                'voteType' => $data['type'],
                'createdAt' => now()
            ]);
        } catch (BulkWriteException $e) {
            return response()->json(['message' => 'Already voted'], 400);
        }

        $field = $data['type'] === 'upvote' ? 'upvotes' : 'downvotes';

        Comment::raw()->updateOne(
            ['_id' => $objectId],
            ['$inc' => [$field => 1]]
        );

        $action = 'added';
    }

    // ============================
    // ⭐ Reputation System
    // ============================

    if ($action === 'added') {
        if ($data['type'] === 'upvote') {
           User::where('id', $commentAuthorId)->increment('reputation', 10);
        } else {
           User::where('id', $commentAuthorId)->decrement('reputation', 2);
        }
    }

    if ($action === 'removed') {
        if ($data['type'] === 'upvote') {
           User::where('id', $commentAuthorId)->decrement('reputation', 10);
        } else {
           User::where('id', $commentAuthorId)->increment('reputation', 2);
        }
    }

    if ($action === 'changed') {
        if ($data['type'] === 'upvote') {
            // from downvote → upvote = +12 (-2 removed +10 added)
           User::where('id', $commentAuthorId)->increment('reputation', 12);
        } else {
            // from upvote → downvote = -12
           User::where('id', $commentAuthorId)->decrement('reputation', 12);
        }
    }

    return response()->json([
        'message' => 'Vote ' . $action,
        'action' => $action
    ]);
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

    // ---------------- FETCH REPLIES ----------------
    public function getReplies($commentId)
    {
        $parent = Comment::where('_id', $commentId)->first();

        if (!$parent) {
            return response()->json([], 404);
        }

        $replies = Comment::where('threadId', $parent->threadId)
            ->where('path', 'regex', '^' . $parent->path . '\.')
            ->orderBy('path')
            ->get();

        $tree = $this->buildTreeFast($replies);


        return response()->json($tree);
    }



public function loadReplies(Request $request, $parentId)
{
    // Pagination params
    $limit = min((int) $request->get('limit', 10), 50);
    $cursor = $request->get('cursor'); // last path

    // 🔍 Find parent
    try {
        $parentObjectId = new ObjectId($parentId);
    } catch (\Exception $e) {
        return response()->json(['message' => 'Invalid parentId'], 400);
    }

    $parent = Comment::where('_id', $parentObjectId)->first();

    if (!$parent) {
        return response()->json(['message' => 'Parent comment not found'], 404);
    }

    $nextDepth = $parent->depth + 1;
    $prefix = $parent->path . '.';

    // 🧠 Query replies
    $query = Comment::where('threadId', $parent->threadId)
        ->where('depth', $nextDepth)
        ->where('path', 'like', $prefix . '%')
        ->orderBy('path', 'asc');

    // Cursor pagination
    if ($cursor) {
        $query->where('path', '>', $cursor);
    }

    $replies = $query->limit($limit + 1)->get();

    // 🎯 Detect next page
    $hasMore = $replies->count() > $limit;

    if ($hasMore) {
        $replies = $replies->slice(0, $limit);
    }

    $nextCursor = $hasMore ? $replies->last()->path : null;

    // Optional: attach user info
    $replies->transform(function ($comment) {
        $comment->user = [
            'id' => $comment->authorId,
            'name' => 'User' // replace with real lookup
        ];
        return $comment;
    });

    return response()->json([
        'data' => $replies->values(),
        'meta' => [
            'nextCursor' => $nextCursor,
            'hasMore' => $hasMore
        ]
    ]);
}

public function acceptBest($commentId)
{
    $user = auth()->user();

    try {
        $objectId = new ObjectId($commentId);
    } catch (\Exception $e) {
        return response()->json(['message' => 'Invalid commentId'], 400);
    }

    $comment = Comment::raw()->findOne(['_id' => $objectId]);

    if (!$comment) {
        return response()->json(['message' => 'Comment not found'], 404);
    }

    $thread = Thread::where('uuid', $comment['threadId'])->first();

    if (!$thread) {
        return response()->json(['message' => 'Thread not found'], 404);
    }

    if ($thread->user_id !== $user->id) {
        return response()->json(['message' => 'Forbidden'], 403);
    }

    if ($thread->best_comment_id === $commentId) {
        return response()->json(['message' => 'Already accepted'], 400);
    }

    DB::beginTransaction();

    try {
        // 🔁 Remove old best answer reward
        if ($thread->best_comment_id) {
            $oldComment = Comment::raw()->findOne([
                '_id' => new ObjectId($thread->best_comment_id)
            ]);

            if ($oldComment) {
                $oldAuthor = User::find($oldComment['authorId']);
                if ($oldAuthor) {
                    $oldAuthor->decrement('reputation', 15);
                    $oldAuthor->decrement('accepted_answers', 1);
                }
            }
        }

        // ✅ Set new best answer
        $thread->best_comment_id = $commentId;
        $thread->save();

        // 🎯 Reward comment author
        $author = User::find($comment['authorId']);
        if ($author) {
            $author->increment('reputation', 15);
            $author->increment('accepted_answers');

            // Broadcast event
            broadcast(new BestAnswerSelected(
                (string)$comment['_id'],
                $thread->uuid,
                $author->id,
                $author->reputation // send updated reputation
            ));
        }

        // 🎯 Reward thread author (who accepted)
        $user->increment('reputation', 2);
        $user->increment('given_best_answers');

        DB::commit();

        return response()->json(['message' => 'Best answer selected']);
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json([
            'message' => 'Error',
            'error' => $e->getMessage()
        ], 500);
    }
}


}
