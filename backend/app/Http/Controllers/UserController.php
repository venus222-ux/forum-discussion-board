<?php

namespace App\Http\Controllers;

use App\Models\User;

class UserController extends Controller
{
public function mostActive()
{
    return User::withCount('threads')
        ->orderByDesc('threads_count')
        ->take(10)
        ->get(['id', 'name']);
}

}
