<?php
// app/Http/Controllers/CategoryController.php
namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    // List all categories with children
   public function index() {
  $categories = Category::withCount('threads')
    ->orderByDesc('threads_count')
    ->get();

  return response()->json($categories); // ✅ REQUIRED
}

    // Show single category by slug
    public function show($slug) {
        $category = Category::with('children', 'threads')
            ->where('slug', $slug)
            ->firstOrFail();
        return response()->json($category);
    }

    // Create category — admin only
    public function store(Request $request) {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:7',
            'parent_id' => 'nullable|exists:categories,id',
            'display_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $category = Category::create($data);
        return response()->json($category, 201);
    }

    // Update category by slug — admin only
    public function update(Request $request, $slug) {
        $category = Category::where('slug', $slug)->firstOrFail();

        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:7',
            'parent_id' => 'nullable|exists:categories,id',
            'display_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $category->update($data);
        return response()->json($category);
    }

    // Delete category by slug — admin only
    public function destroy($slug) {
        $category = Category::where('slug', $slug)->firstOrFail();
        $category->delete();
        return response()->json(['message' => 'Category deleted successfully']);
    }
}
