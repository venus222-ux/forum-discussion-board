<?php

// app/Events/BestAnswerSelected.php
namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class BestAnswerSelected implements ShouldBroadcast
{
    use InteractsWithSockets, SerializesModels;

    public $commentId;
    public $threadId;
    public $authorId;
    public $reputation;

    public function __construct($commentId, $threadId, $authorId, $reputation)
    {
        $this->commentId = $commentId;
        $this->threadId = $threadId;
        $this->authorId = $authorId;
        $this->reputation = $reputation; // new score for the user
    }

    public function broadcastOn()
    {
        return new PrivateChannel('user.' . $this->authorId);
    }

    public function broadcastWith()
    {
        return [
            'commentId' => $this->commentId,
            'threadId' => $this->threadId,
            'reputation' => $this->reputation,
        ];
    }
}
