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

    public function recent()
{
    $threads = Thread::with(['user:id,name', 'category:id,name,slug'])
        ->latest('created_at')
        ->paginate(10); // ✅ real pagination

    // format dates
    $threads->getCollection()->transform(function ($thread) {
        $thread->created_at = $thread->created_at?->toIso8601String();
        return $thread;
    });

    return response()->json($threads, 200);
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
