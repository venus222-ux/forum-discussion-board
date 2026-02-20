import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  children?: Category[];
}

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/categories")
      .then((res) => setCategories(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading categories...</div>;

  return (
    <div className="container mt-4">
      <h2>📂 Categories</h2>
      <ul className="list-group mt-3">
        {categories.map((cat) => (
          <li key={cat.id} className="list-group-item">
            <Link to={`/categories/${cat.slug}/threads`}>{cat.name}</Link>
            {cat.children && cat.children.length > 0 && (
              <ul className="list-group mt-2 ms-3">
                {cat.children.map((child) => (
                  <li key={child.id} className="list-group-item">
                    <Link to={`/categories/${child.slug}/threads`}>
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
