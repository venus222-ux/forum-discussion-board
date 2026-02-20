<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ThreadController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

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


// Protected routes with auth + throttle
Route::middleware('auth.jwt')->group(function ()  {
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::delete('/profile', [AuthController::class, 'destroyProfile']);
    Route::post('/refresh', [AuthController::class, 'refresh']);

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

});
