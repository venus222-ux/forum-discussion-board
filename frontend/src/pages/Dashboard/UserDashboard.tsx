// src/pages/Dashboard/UserDashboard.tsx
import React, { Component, createRef } from "react";
import API from "../../api";
import { useThreadStore } from "../../store/useThreadStore";
import Editor from "../../components/Editor";
import styles from "../../styles/Dashboard.module.css";

interface Thread {
  id: number;
  title: string;
  slug: string;
  content: string;
  category_id: number;
  created_at: string;
  optimistic?: boolean;
}

interface Category {
  id: number;
  name: string;
}

interface State {
  categories: Category[];
  loading: boolean;
  modalOpen: boolean;
  form: {
    title: string;
    content: string;
    category_id: number | "";
  };
  editingSlug: string | null;
}

export class UserDashboard extends Component<{}, State> {
  loader = createRef<HTMLDivElement>();
  unsubscribe: any;

  state: State = {
    categories: [],
    loading: true,
    modalOpen: false,
    form: { title: "", content: "", category_id: "" },
    editingSlug: null,
  };

  componentDidMount() {
    this.fetchCategories();
    this.fetchUserThreads();
    this.initObserver();
    this.unsubscribe = useThreadStore.subscribe(() => this.forceUpdate());
  }

  componentWillUnmount() {
    this.unsubscribe?.();
  }

  initObserver = () => {
    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      const { hasMore } = useThreadStore.getState();
      if (target.isIntersecting && hasMore) this.fetchUserThreads();
    });
    if (this.loader.current) observer.observe(this.loader.current);
  };

  fetchUserThreads = async () => {
    const { cursor, hasMore, addThreads } = useThreadStore.getState();
    if (!hasMore) return;
    const url = cursor ? `/my-threads?cursor=${cursor}` : `/my-threads`;
    try {
      const res = await API.get(url);
      const threads = res.data?.data || res.data || [];
      const nextCursor = res.data?.next_cursor ?? null;
      addThreads(threads, nextCursor);
      this.setState({ loading: false });
    } catch (err) {
      console.error(err);
    }
  };

  fetchCategories = async () => {
    try {
      const res = await API.get("/categories");
      this.setState({ categories: res.data || [] });
    } catch (err) {
      console.error(err);
    }
  };

  handleChange = (e: any) => {
    this.setState({
      form: { ...this.state.form, [e.target.name]: e.target.value },
    });
  };

  handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { form, editingSlug } = this.state;
    const store = useThreadStore.getState();

    if (editingSlug) {
      const backup = [...store.threads];
      store.setThreads(
        store.threads.map((t) =>
          t.slug === editingSlug ? { ...t, ...form } : t,
        ),
      );
      try {
        await API.put(`/threads/${editingSlug}`, form);
      } catch (err) {
        console.error(err);
        store.setThreads(backup);
      }
      this.setState({
        editingSlug: null,
        modalOpen: false,
        form: { title: "", content: "", category_id: "" },
      });
      return;
    }

    const tempThread: Thread = {
      id: Date.now(),
      slug: "temp-" + Date.now(),
      title: form.title,
      content: form.content,
      category_id: Number(form.category_id),
      created_at: new Date().toISOString(),
      optimistic: true,
    };

    store.addOptimistic(tempThread);
    this.setState({
      modalOpen: false,
      form: { title: "", content: "", category_id: "" },
    });

    try {
      const res = await API.post("/threads", form);
      store.replaceThread(tempThread.slug, res.data);
    } catch (err) {
      console.error(err);
      store.removeThread(tempThread.slug);
    }
  };

  handleEdit = (thread: Thread) => {
    this.setState({
      form: {
        title: thread.title,
        content: thread.content,
        category_id: thread.category_id,
      },
      editingSlug: thread.slug,
      modalOpen: true,
    });
  };

  handleDelete = async (slug: string) => {
    if (!window.confirm("Delete this thread?")) return;
    const store = useThreadStore.getState();
    const backup = [...store.threads];
    store.removeThread(slug);
    try {
      await API.delete(`/threads/${slug}`);
    } catch (err) {
      console.error(err);
      store.setThreads(backup);
    }
  };

  openModal = () => {
    this.setState({
      modalOpen: true,
      editingSlug: null,
      form: { title: "", content: "", category_id: "" },
    });
  };

  closeModal = () => {
    this.setState({
      modalOpen: false,
      editingSlug: null,
      form: { title: "", content: "", category_id: "" },
    });
  };

  render() {
    const { categories, loading, modalOpen, form, editingSlug } = this.state;
    const { threads, hasMore } = useThreadStore.getState();

    if (loading) {
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
            <button className={styles.createButton} onClick={this.openModal}>
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
          <div className={styles.modalOverlay} onClick={this.closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  {editingSlug ? "✏️ Edit Thread" : "➕ Create New Thread"}
                </h2>
                <button
                  className={styles.closeButton}
                  onClick={this.closeModal}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={this.handleSubmit}>
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
                    onChange={this.handleChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Content</label>
                  <div className={styles.editorWrapper}>
                    <Editor
                      value={form.content}
                      onChange={(content) =>
                        this.setState({ form: { ...form, content } })
                      }
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
                      onChange={this.handleChange}
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
                    onClick={this.closeModal}
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

        {/* Compact Thread List */}
        <div className={styles.threadList}>
          {threads.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>💬</span>
              <h3>No threads yet</h3>
              <p>Create your first thread to start the conversation!</p>
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.slug}
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
                    onClick={() => this.handleEdit(thread)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className={`${styles.iconButton} ${styles.deleteIcon}`}
                    onClick={() => this.handleDelete(thread.slug)}
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
        <div ref={this.loader} className={styles.loader}>
          {hasMore ? (
            <div className={styles.spinner}></div>
          ) : (
            threads.length > 0 && (
              <span className={styles.endMessage}>You've reached the end</span>
            )
          )}
        </div>
      </div>
    );
  }
}

export default UserDashboard;
