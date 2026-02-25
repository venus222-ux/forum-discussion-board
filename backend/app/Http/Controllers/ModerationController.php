<?php

namespace App\Http\Controllers;

use App\Events\CommentFlagged;
use App\Models\Comment;
use App\Models\CommentFlag;
use App\Models\ModerationLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;

class ModerationController extends Controller
{
    /**
     * User flags a comment
     */
    public function flag(Request $request, $commentId)
    {
        $user = auth()->user();

        $data = $request->validate([
            'reason' => 'required|string|max:255'
        ]);

        // --------- RATE LIMITING ---------
        $userKey = "user_flag_rate:{$user->id}:$commentId";
        $limit = 3;        // max attempts per user per comment
        $window = 3600;    // 1 hour window

        if (Redis::exists($userKey) && Redis::get($userKey) >= $limit) {
            return response()->json(['message' => 'Rate limit exceeded. Try later.'], 429);
        }

        $flagsCountUser = Redis::incr($userKey);
        if ($flagsCountUser == 1) {
            Redis::expire($userKey, $window);
        }

        // --------- PREVENT DUPLICATE FLAG ---------
        if (CommentFlag::where('comment_id', $commentId)->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Already flagged'], 400);
        }

        // Store flag in DB
        CommentFlag::create([
            'comment_id' => $commentId,
            'user_id' => $user->id,
            'reason' => $data['reason'],
            'status' => 'pending'
        ]);

        // --------- CHECK FOR AUTO-HIDE ---------
        $count = CommentFlag::where('comment_id', $commentId)
            ->where('status', 'pending')
            ->count();

        if ($count >= 5) {
            $comment = Comment::find($commentId);
            if ($comment) {
                $comment->update([
                    'is_hidden' => true,
                    'status' => 'hidden',
                    'moderation_reason' => 'Auto-hidden due to multiple flags'
                ]);
            }
        }

        // --------- NOTIFICATIONS ---------
        broadcast(new CommentFlagged(
            $commentId,
            $count,
            1,
            $user->id
        ))->toOthers();

        return response()->json([
            'message' => 'Flag submitted',
            'total_flags' => $count
        ]);
    }

    /**
     * List pending flags
     */
    public function listFlags()
    {
        $flags = CommentFlag::where('status', 'pending')
            ->with('user')
            ->latest()
            ->get();

        return response()->json($flags);
    }

    /**
     * Approve a flag → hide comment
     */
    public function approve(Request $request, $commentId)
    {
        $data = $request->validate([
            'reason' => 'nullable|string|max:255'
        ]);

        $comment = Comment::find($commentId);
        if (!$comment) {
            return response()->json(['message' => 'Comment not found'], 404);
        }

        $comment->update([
            'is_hidden' => true,
            'status' => 'hidden',
            'moderation_reason' => $data['reason'] ?? 'Hidden by moderator'
        ]);

        CommentFlag::where('comment_id', $commentId)->update(['status' => 'approved']);

        ModerationLog::create([
            'moderator_id' => auth()->id(),
            'action' => 'hide',
            'comment_id' => $commentId,
            'reason' => $data['reason'] ?? 'Hidden by moderator'
        ]);

        // Clear user rate limits safely
        $cursor = null;
        do {
            [$cursor, $keys] = Redis::scan($cursor, [
                'match' => "user_flag_rate:*:$commentId",
                'count' => 100
            ]);

            if (is_array($keys)) {
                foreach ($keys as $key) {
                    Redis::del($key);
                }
            }
        } while ($cursor != 0);

        return response()->json(['message' => 'Comment hidden']);
    }

    /**
     * Reject a flag → restore visibility
     */
    public function reject($commentId)
    {
        $comment = Comment::find($commentId);
        if (!$comment) {
            return response()->json(['message' => 'Comment not found'], 404);
        }

        $comment->update([
            'is_hidden' => false,
            'status' => 'active',
            'moderation_reason' => null
        ]);

        CommentFlag::where('comment_id', $commentId)->update(['status' => 'rejected']);

        // Clear aggregated flags & user rate limits safely
        Redis::del("aggregated_flags:$commentId");

        $cursor = null;
        do {
            [$cursor, $keys] = Redis::scan($cursor, [
                'match' => "user_flag_rate:*:$commentId",
                'count' => 100
            ]);

            if (is_array($keys)) {
                foreach ($keys as $key) {
                    Redis::del($key);
                }
            }
        } while ($cursor != 0);

        return response()->json(['message' => 'Flag rejected']);
    }

    /**
     * Official moderator reply to a comment
     */
    public function officialReply(Request $request, $commentId)
    {
        $data = $request->validate([
            'content' => 'required|string'
        ]);

        $parent = Comment::find($commentId);
        if (!$parent) return response()->json(['message' => 'Parent comment not found'], 404);

        $lastChild = Comment::where('parentId', $parent->id)
            ->orderBy('path', 'desc')
            ->first();

        $nextSegment = $lastChild ? intval(substr($lastChild->path, -3)) + 1 : 1;
        $path = $parent->path . '.' . str_pad($nextSegment, 3, '0', STR_PAD_LEFT);

        $comment = Comment::create([
            'threadId' => $parent->threadId,
            'authorId' => auth()->id(),
            'content' => $data['content'],
            'parentId' => $parent->id,
            'path' => $path,
            'depth' => $parent->depth + 1,
            'official_reply' => true,
            'status' => 'active',
            'is_hidden' => false
        ]);

        return response()->json($comment);
    }
}
