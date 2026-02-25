<?php

// app/Notifications/ThreadCommented.php
namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;

class ThreadCommented extends Notification
{
    use Queueable;

    public function __construct(public $thread, public $comment, public $actor) {}

    public function via($notifiable)
    {
        return ['database', 'broadcast'];
    }

    public function toArray($notifiable)
    {
        return [
            'type' => 'thread_comment',
            'thread_id' => $this->thread->uuid,
            'thread_title' => $this->thread->title,
            'comment_id' => (string) $this->comment->_id,
            'actor_name' => $this->actor->name
        ];
    }

    public function toBroadcast($notifiable)
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
