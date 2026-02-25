<?php
// app/Http/Controllers/ThreadController.php
namespace App\Http\Controllers;

use App\Models\Thread;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ThreadController extends Controller
{
    // List threads in category by category slug
    public function index($categorySlug) {
        $category = \App\Models\Category::where('slug', $categorySlug)->firstOrFail();

        return Thread::where('category_id', $category->id)
            ->with('user')
            ->paginate(10);
    }

    // app/Http/Controllers/ThreadController.php
public function recent(Request $request)
{
    // Read page number from query string, default 1
    $page = $request->query('page', 1);

    $threads = Thread::with(['user:id,name', 'category:id,name,slug'])
        ->latest('created_at')
        ->paginate(10, ['*'], 'page', $page); // ensure Laravel uses correct page

    // Transform threads
    $threads->getCollection()->transform(function ($thread) {
        $thread->created_at = $thread->created_at?->toIso8601String();
        $thread->comment_count = $thread->comment_count ?? 0;
        $thread->upvotes = $thread->upvotes ?? 0;
        $thread->downvotes = $thread->downvotes ?? 0;
        $thread->like_count = $thread->upvotes - $thread->downvotes;
        return $thread;
    });

    // Return proper JSON
    return response()->json([
        'data' => $threads->items(),        // threads array
        'current_page' => $threads->currentPage(),
        'last_page' => $threads->lastPage(),
        'per_page' => $threads->perPage(),
        'total' => $threads->total(),
    ], 200);
}



    // List ONLY authenticated user's threads
    public function myThreads()
    {
      return Thread::where('user_id', auth()->id())
        ->with('category')
        ->latest()
        ->get();
    }




    // Show single thread by slug
    public function show($slug) {
        $thread = Thread::with('user', 'category')
            ->where('slug', $slug)
            ->firstOrFail();

        $thread->best_comment_id;

        return response()->json($thread);
    }

    // Create thread — user only
    public function store(Request $request) {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category_id' => 'required|exists:categories,id',
        ]);

        $data['user_id'] = auth()->id();
        $thread = Thread::create($data);

        return response()->json($thread, 201);
    }

    // Update thread by slug — only author
    public function update(Request $request, $slug) {
        $thread = Thread::where('slug', $slug)->firstOrFail();

        if ($thread->user_id !== auth()->id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'status' => 'nullable|in:published,moderation,locked,deleted',
            'is_pinned' => 'nullable|boolean',
            'is_locked' => 'nullable|boolean',
        ]);

        if (isset($data['title'])) {
            $data['slug'] = Str::slug($data['title']);
        }

        $thread->update($data);
        return response()->json($thread);
    }

    // Delete thread by slug — only author
    public function destroy($slug) {
        $thread = Thread::where('slug', $slug)->firstOrFail();

        if ($thread->user_id !== auth()->id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $thread->delete();
        return response()->json(['message' => 'Thread deleted successfully']);
    }
}
