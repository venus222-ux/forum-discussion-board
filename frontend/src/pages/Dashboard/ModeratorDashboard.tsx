import React, { useEffect, useState } from "react";
import { useModerationStore } from "../../store/useModerationStore";
import useModerationListener from "../../hooks/useModerationListener";
import styles from "../../styles/ModerateDashboard.module.css";

export default function ModerateDashboard() {
  const { flags, fetchFlags, approve, reject, loading } = useModerationStore();
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});

  useModerationListener();

  useEffect(() => {
    fetchFlags();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading flags...</div>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>🚨 Moderator Dashboard</h2>

      {flags.length === 0 && (
        <div className={styles.empty}>No pending flags. All clear!</div>
      )}

      {flags.map((flag) => (
        <div key={flag.id} className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.commentId}>
              Comment ID: {flag.comment_id}
            </span>
            <span className={styles.flaggedBy}>
              Flagged by: {flag.user.name}
            </span>
          </div>

          <div className={styles.reason}>
            <strong>Reason:</strong> {flag.reason}
          </div>

          <textarea
            className={styles.textarea}
            placeholder="Moderator reason (optional)"
            value={reasonMap[flag.comment_id] || ""}
            onChange={(e) =>
              setReasonMap({
                ...reasonMap,
                [flag.comment_id]: e.target.value,
              })
            }
          />

          <div className={styles.actions}>
            <button
              className={styles.approveBtn}
              onClick={() =>
                approve(flag.comment_id, reasonMap[flag.comment_id])
              }
            >
              ✅ Approve & Hide
            </button>

            <button
              className={styles.rejectBtn}
              onClick={() => reject(flag.comment_id)}
            >
              ❌ Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
