import { useEffect } from "react";
import Echo from "../echo";
import { useModerationStore } from "../store/useModerationStore";

export default function useModerationListener() {
  const addRealtimeFlag = useModerationStore((s) => s.addRealtimeFlag);

  useEffect(() => {
    const channel = Echo.private("moderation");

    channel.listen(".comment.flagged", (event: any) => {
      console.log("Realtime flag event:", event);
      addRealtimeFlag(event.commentId, event.totalFlags);
    });

    return () => {
      Echo.leave("moderation");
    };
  }, []);
}
