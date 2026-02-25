import React, { useEffect, useState } from "react";
import axios from "axios";
import styles from "./AdminCategories.module.css";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  threads_count?: number;
  parent_id?: number | null;
  is_active: boolean;
  display_order?: number;
  color?: string;
  icon?: string;
}

const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Category>>({
    name: "",
    description: "",
    parent_id: null,
    is_active: true,
    display_order: 0,
    color: "",
    icon: "",
  });
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const token = localStorage.getItem("token");
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/categories`,
        axiosConfig,
      );
      setCategories(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openModal = (category?: Category) => {
    if (category) {
      setForm({ ...category });
      setEditingSlug(category.slug);
    } else {
      setForm({
        name: "",
        description: "",
        parent_id: null,
        is_active: true,
        display_order: 0,
        color: "",
        icon: "",
      });
      setEditingSlug(null);
    }
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const saveCategory = async () => {
    try {
      if (editingSlug) {
        await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/api/categories/${editingSlug}`,
          form,
          axiosConfig,
        );
      } else {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/categories`,
          form,
          axiosConfig,
        );
      }
      closeModal();
      fetchCategories();
    } catch (err: any) {
      console.error("Error saving category:", err.response?.data || err);
    }
  };

  const deleteCategory = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/categories/${slug}`,
        axiosConfig,
      );
      fetchCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Manage Categories</h1>

      {/* Floating New Category Button */}
      <button className={styles.floatingButton} onClick={() => openModal()}>
        + New Category
      </button>

      {/* Categories Table */}
      {loading ? (
        <div className={styles.loading}>Loading categories...</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Slug</th>
                <th className={styles.th}>Description</th>
                <th className={styles.th}>Threads</th>
                <th className={styles.th}>Active</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className={styles.tr}>
                  <td className={styles.td}>{cat.name}</td>
                  <td className={styles.td}>{cat.slug}</td>
                  <td className={styles.td}>{cat.description || "-"}</td>
                  <td className={styles.td}>{cat.threads_count || 0}</td>
                  <td className={styles.td}>{cat.is_active ? "Yes" : "No"}</td>
                  <td className={styles.td}>
                    <button
                      className={styles.editButton}
                      onClick={() => openModal(cat)}
                    >
                      Edit
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => deleteCategory(cat.slug)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h2>{editingSlug ? "Edit Category" : "Add Category"}</h2>
            <input
              name="name"
              placeholder="Name"
              value={form.name || ""}
              onChange={handleChange}
              className={styles.input}
            />
            <input
              name="description"
              placeholder="Description"
              value={form.description || ""}
              onChange={handleChange}
              className={styles.input}
            />
            <div className={styles.checkboxContainer}>
              <label className={styles.checkboxLabel}>
                Active
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active ?? true}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
              </label>
            </div>
            <div className={styles.buttonGroup}>
              <button onClick={saveCategory} className={styles.saveButton}>
                {editingSlug ? "Update" : "Create"}
              </button>
              <button onClick={closeModal} className={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
