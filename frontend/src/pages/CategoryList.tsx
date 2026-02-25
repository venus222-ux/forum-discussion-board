import { Link } from "react-router-dom";
import { useCategories } from "../store/useCategoryStore";
import styles from "../styles/CategoryList.module.css";

export default function CategoryList() {
  const { data: categories, isLoading, error } = useCategories();

  // Loading skeletons (mimic card layout)
  if (isLoading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>📂 Categories</h2>
        <div className={styles.grid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonLine} style={{ width: "60%" }} />
              <div className={styles.skeletonBadge} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorAlert}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>Failed to load categories. Please try again later.</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!categories || categories.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.infoAlert}>
          <span className={styles.infoIcon}>ℹ️</span>
          <span>No categories found.</span>
        </div>
      </div>
    );
  }

  // Success – render categories
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>📂 Categories</h2>
      <div className={styles.grid}>
        {categories.map((cat) => (
          <div key={cat.id} className={styles.card}>
            <Link
              to={`/categories/${cat.slug}/threads`}
              className={styles.cardLink}
            >
              {cat.name}
            </Link>
            <span className={styles.badge}>{cat.threads_count ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
