import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import { toast } from "react-toastify";
import { useStore } from "../store/useStore";

type Role = "user" | "moderator" | "admin";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // ← nice UX improvement

  const navigate = useNavigate();

  // Zustand actions
  const setAuth = useStore((state) => state.setAuth);
  const startTokenRefreshLoop = useStore(
    (state) => state.startTokenRefreshLoop,
  );

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await API.post("/login", { email, password });
      const token = res.data.token;

      if (!token) {
        toast.error("Login failed: no token returned");
        return;
      }

      // Save token
      localStorage.setItem("token", token);
      API.defaults.headers.common.Authorization = `Bearer ${token}`;

      // Get full user data + role
      const meRes = await API.get("/me");
      const userData = meRes.data;
      const role = userData.role as Role;

      // Update store
      setAuth(token, role, userData);
      startTokenRefreshLoop();

      toast.success(`Welcome back, ${userData.name}!`);

      // 🔥 ALWAYS go to /dashboard (role-based logic is now inside Dashboard component)
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center vh-100">
      <div className="card shadow p-4" style={{ width: "100%", maxWidth: 420 }}>
        <h3 className="text-center mb-3">🔑 Login</h3>

        <form onSubmit={handleLogin}>
          <input
            className="form-control mb-3"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            className="form-control mb-3"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <button className="btn btn-primary w-100 mb-3" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="d-flex justify-content-between small">
          <Link to="/register">📝 Register</Link>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
