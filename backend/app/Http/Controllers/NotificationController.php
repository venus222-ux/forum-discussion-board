<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
 public function index(Request $request)
{
    $user = auth('api')->user(); // JWT guard

    // Fetch latest notifications (read + unread)
    $notifications = $user->notifications()
        ->latest()
        ->cursorPaginate(10);

    return response()->json([
        'data' => $notifications->items(),
        'next_cursor' => optional($notifications->nextCursor())->encode(),
        'unread_count' => $user->unreadNotifications()->count(),
    ]);
}
    public function markAsRead($id)
    {
        $user = auth('api')->user(); //Use 'api' guard
        $notification = $user->notifications()->findOrFail($id);
        $notification->markAsRead();
        return response()->json(['success'=>true]);

    }

   public function clear(Request $request)
 {
    $user = auth('api')->user(); //Use 'api' guard
    //Mark all unread notifications as read
    $user->unreadNotifications->each(function ($n){
        $n->markAsRead();
    });

    //Return latest notifications (read + unread)
    $notifications = $user->notifications()->latest()->take(10)->get();
    $user->notifications()->delete(); // Deletes all (read + unread)
    return response()->json([
        'status' => 'ok',
        'data' => $notifications,
        'unread_count' => 0,
    ]);

 }
}
