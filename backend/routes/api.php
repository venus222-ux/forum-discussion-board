<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ThreadController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\ModerationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;


Broadcast::routes([
    'middleware' => ['auth.jwt'],
]);

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::get('/users/most-active', [UserController::class, 'mostActive']);

// Categories
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{slug}', [CategoryController::class, 'show']);

// Threads
Route::get('/categories/{categorySlug}/threads', [ThreadController::class, 'index']);
Route::get('/threads/recent', [ThreadController::class, 'recent']);
Route::get('/threads/{slug}', [ThreadController::class, 'show']);




// ------------------ THREAD COMMENTS ------------------
// Public: fetch all comments for a thread
Route::get('/threads/{slug}/comments', [CommentController::class, 'getThreadComments']);

// Protected routes with auth + throttle
Route::middleware('auth.jwt')->group(function ()  {
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::delete('/profile', [AuthController::class, 'destroyProfile']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::post('/threads/{threadId}/comments', [CommentController::class, 'store']);

    //Notify
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/clear', [NotificationController::class, 'clear']);

    //Comments
    Route::get('/comments/{parentId}/replies', [CommentController::class, 'loadReplies']);
    //Add endpoint: mark best answer
    Route::post('/comments/{commentId}/accept', [CommentController::class, 'acceptBest']);
    // comment votes
    Route::post('/comments/{commentId}/vote', [CommentController::class, 'vote']);
    // delete a comment
    Route::delete('/comments/{commentId}', [CommentController::class, 'delete']);
    // fetch replies of a comment
    Route::get('/comments/{commentId}/replies', [CommentController::class, 'getReplies']);

      // User can flag a comment
    Route::post('/comments/{commentId}/flag', [ModerationController::class, 'flag']);

    // Categories (admin only)
    Route::middleware('role:admin')->group(function () {
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{slug}', [CategoryController::class, 'update']);
        Route::delete('/categories/{slug}', [CategoryController::class, 'destroy']);
    });

    // Threads (user only)
    Route::middleware('role:user')->group(function () {
        Route::get('/my-threads', [ThreadController::class, 'myThreads']);
        Route::post('/threads', [ThreadController::class, 'store']);
        Route::put('/threads/{slug}', [ThreadController::class, 'update']);
        Route::delete('/threads/{slug}', [ThreadController::class, 'destroy']);
    });

    Route::middleware('role:moderator')->group(function () {
      Route::get('/moderation/flags', [ModerationController::class, 'listFlags']);
      Route::post('/moderation/{commentId}/approve', [ModerationController::class, 'approve']);
      Route::post('/moderation/{commentId}/reject', [ModerationController::class, 'reject']);
      Route::post('/moderation/{commentId}/official-reply', [ModerationController::class, 'officialReply']);
   });

   Route::middleware('role:admin')->group(function () {
        Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
    });


});
