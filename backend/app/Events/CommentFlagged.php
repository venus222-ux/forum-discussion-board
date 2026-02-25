<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentFlagged implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public $commentId;
    public $totalFlags;
    public $newFlags;
    public $triggeredBy;

    public function __construct($commentId, $totalFlags, $newFlags = 1, $triggeredBy = null)
    {
        $this->commentId = $commentId;
        $this->totalFlags = $totalFlags;   // total flags count
        $this->newFlags = $newFlags;       // aggregated batch count
        $this->triggeredBy = $triggeredBy; // optional user id
    }

    public function broadcastOn()
    {
        return new PrivateChannel('moderation');
    }

    public function broadcastAs()
    {
        return 'comment.flagged'; // cleaner event name in frontend
    }

    public function broadcastWith()
    {
        return [
            'commentId' => $this->commentId,
            'totalFlags' => $this->totalFlags,
            'newFlags' => $this->newFlags,
            'triggeredBy' => $this->triggeredBy,
        ];
    }
}
