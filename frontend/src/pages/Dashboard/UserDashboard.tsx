// src/pages/Dashboard/UserDashboard.tsx
import { useEffect, useRef, useState } from "react";
import API from "../../api";
import { useThreadStore, Thread } from "../../store/useThreadStore";
import Editor from "../../components/Editor";
import styles from "../../styles/Dashboard.module.css";

interface Category {
  id: number;
  name: string;
}

export default function UserDashboard() {
  const loaderRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", category_id: "" });

  const {
    threads,
    hasMore,
    cursor,
    addThreads,
    addOptimistic,
    removeThread,
    replaceThread,
    setThreads,
  } = useThreadStore();

  // ------------------------ Fetch Categories ------------------------
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await API.get("/categories");
        setCategories(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategories();
  }, []);

  // ------------------------ Fetch Threads ------------------------
  const fetchUserThreads = async () => {
    if (!hasMore) return;
    const url = cursor ? `/my-threads?cursor=${cursor}` : `/my-threads`;
    try {
      const res = await API.get(url);
      const threadsData: Thread[] = res.data?.data || res.data || [];
      const nextCursor = res.data?.next_cursor ?? null;

      // Prevent duplicates
      const existingSlugs = new Set(threads.map((t) => t.slug));
      const uniqueThreads = threadsData.filter(
        (t) => !existingSlugs.has(t.slug),
      );

      addThreads(uniqueThreads, nextCursor);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // ------------------------ Infinite Scroll ------------------------
  useEffect(() => {
    if (!loaderRef.current) return;

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) fetchUserThreads();
    });

    observerRef.current.observe(loaderRef.current);

    return () => observerRef.current?.disconnect();
  }, [hasMore, cursor]);

  // ------------------------ Initial Load ------------------------
  useEffect(() => {
    fetchUserThreads();
  }, []);

  // ------------------------ Form Handlers ------------------------
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const openModal = () => {
    setModalOpen(true);
    setEditingSlug(null);
    setForm({ title: "", content: "", category_id: "" });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSlug(null);
    setForm({ title: "", content: "", category_id: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSlug) {
      const backup = [...threads];
      setThreads(
        threads.map((t) => (t.slug === editingSlug ? { ...t, ...form } : t)),
      );
      try {
        await API.put(`/threads/${editingSlug}`, form);
      } catch {
        setThreads(backup);
      }
      closeModal();
      return;
    }

    // Optimistic thread
    const tempSlug = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const tempThread: Thread = {
      id: -Date.now(), // negative ensures uniqueness
      slug: tempSlug,
      title: form.title,
      content: form.content,
      category_id: Number(form.category_id),
      created_at: new Date().toISOString(),
      optimistic: true,
    };

    addOptimistic(tempThread);
    closeModal();

    try {
      const res = await API.post("/threads", form);
      replaceThread(tempSlug, res.data);
    } catch {
      removeThread(tempSlug);
    }
  };

  const handleEdit = (thread: Thread) => {
    setForm({
      title: thread.title,
      content: thread.content,
      category_id: thread.category_id,
    });
    setEditingSlug(thread.slug);
    setModalOpen(true);
  };

  const handleDelete = async (slug: string) => {
    if (!window.confirm("Delete this thread?")) return;
    const backup = [...threads];
    removeThread(slug);
    try {
      await API.delete(`/threads/${slug}`);
    } catch {
      setThreads(backup);
    }
  };

  // ------------------------ Render ------------------------
  if (loading && threads.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>🧑‍💻 My Threads</h1>
        <div className={styles.headerActions}>
          <button className={styles.createButton} onClick={openModal}>
            + New Thread
          </button>
          <span className={styles.stat}>
            <span className={styles.statIcon}>📝</span>
            {threads.length} threads
          </span>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingSlug ? "✏️ Edit Thread" : "➕ Create New Thread"}
              </h2>
              <button className={styles.closeButton} onClick={closeModal}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="title" className={styles.label}>
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  className={styles.input}
                  placeholder="e.g., How to implement dark mode?"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Content</label>
                <div className={styles.editorWrapper}>
                  <Editor
                    value={form.content}
                    onChange={(content) => setForm({ ...form, content })}
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="category" className={styles.label}>
                    Category
                  </label>
                  <select
                    id="category"
                    name="category_id"
                    className={styles.select}
                    value={form.category_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitButton}>
                  {editingSlug ? "Update Thread" : "Create Thread"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thread List */}
      {/* Thread List */}
      <div className={styles.threadList}>
        {threads.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💬</span>
            <h3>No threads yet</h3>
            <p>Create your first thread to start the conversation!</p>
          </div>
        ) : (
          threads.map((thread, index) => (
            <div
              key={
                thread.optimistic
                  ? `optimistic-${thread.slug}-${thread.id}-${Math.random()
                      .toString(36)
                      .substring(2, 8)}`
                  : `thread-${thread.slug}-${thread.id}-${new Date(
                      thread.created_at,
                    ).getTime()}-${index}`
              }
              className={`${styles.compactThreadCard} ${
                thread.optimistic ? styles.optimistic : ""
              }`}
            >
              <div className={styles.compactThreadInfo}>
                <h3 className={styles.compactThreadTitle}>{thread.title}</h3>
                <div className={styles.compactThreadMeta}>
                  <span className={styles.compactCategory}>
                    {categories.find((c) => c.id === thread.category_id)
                      ?.name || "Uncategorized"}
                  </span>
                  <span className={styles.compactDate}>
                    {new Date(thread.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className={styles.compactThreadActions}>
                <button
                  className={styles.iconButton}
                  onClick={() => handleEdit(thread)}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  className={`${styles.iconButton} ${styles.deleteIcon}`}
                  onClick={() => handleDelete(thread.slug)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Infinite Scroll Loader */}
      <div ref={loaderRef} className={styles.loader}>
        {hasMore && <div className={styles.spinner}></div>}
        {!hasMore && threads.length > 0 && (
          <span className={styles.endMessage}>You've reached the end</span>
        )}
      </div>
    </div>
  );
}
