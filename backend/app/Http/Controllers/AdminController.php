<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Thread;
use App\Models\User;
use App\Models\Comment;
use App\Models\CommentFlag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use MongoDB\BSON\UTCDateTime;

class AdminController extends Controller
{
    public function dashboard(Request $request)
    {
        $range = $request->query('range', '30d');
        $startDate = match($range) {
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            '90d' => now()->subDays(90),
            default => now()->subDays(30)
        };

        // -----------------------------
        // SQL stats
        // -----------------------------
        $totalUsers = User::count();
        $totalCategories = Category::count();
        $totalThreads = Thread::count();
        $totalComments = Comment::count(); // Mongo, may need aggregate
        $flaggedComments = CommentFlag::where('status', 'pending')->count();

        $recentUsers = User::orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id','name','email','role','created_at']);

        $recentThreads = Thread::with('user','category')
            ->orderBy('created_at','desc')
            ->limit(5)
            ->get()
            ->map(fn($thread) => [
                'id' => $thread->id,
                'title' => $thread->title,
                'user' => ['name' => $thread->user->name ?? 'Unknown'],
                'category' => ['name' => $thread->category->name ?? 'Uncategorized'],
                'created_at' => $thread->created_at,
                'comment_count' => $thread->comment_count,
            ]);

        // -----------------------------
        // Mongo: Comment stats
        // -----------------------------
        $topComments = Comment::raw(function($collection) use ($startDate) {
            $startMongo = new UTCDateTime($startDate->timestamp * 1000);
            return $collection->aggregate([
                ['$match' => ['createdAt' => ['$gte' => $startMongo]]],
                ['$sort' => ['upvotes' => -1]],
                ['$limit' => 10],
            ]);
        });

        // Format Mongo results
        $topCommentsArray = array_map(fn($c) => [
            'id' => (string)($c->_id ?? ''),
            'content' => $c->content ?? '',
            'upvotes' => $c->upvotes ?? 0,
            'downvotes' => $c->downvotes ?? 0,
            'author' => $c->authorId ?? 'Unknown',
        ], iterator_to_array($topComments));

        // -----------------------------
        // Activity / Distribution
        // -----------------------------
        $threadsPerCategory = Category::withCount('threads')->get()->map(fn($cat) => [
            'name' => $cat->name,
            'count' => $cat->threads_count,
        ]);

        $userRoleDistribution = User::select('role', DB::raw('count(*) as count'))
            ->groupBy('role')
            ->get()
            ->toArray();

        return response()->json([
            'totalUsers' => $totalUsers,
            'totalCategories' => $totalCategories,
            'totalThreads' => $totalThreads,
            'totalComments' => $totalComments,
            'flaggedComments' => $flaggedComments,
            'recentUsers' => $recentUsers,
            'recentThreads' => $recentThreads,
            'topComments' => $topCommentsArray,
            'threadsPerCategory' => $threadsPerCategory,
            'userRoleDistribution' => $userRoleDistribution,
        ]);
    }
}
