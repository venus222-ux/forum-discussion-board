import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import { toast } from "react-toastify";
import { useStore } from "../store/useStore";

type Role = "user" | "moderator" | "admin";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Zustand actions
  const setAuth = useStore((state) => state.setAuth);
  const startTokenRefreshLoop = useStore(
    (state) => state.startTokenRefreshLoop,
  );

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    try {
      // Step 1: login and get token
      const res = await API.post("/login", { email, password });
      const token = res.data.token;

      if (!token) {
        toast.error("Login failed: no token returned");
        return;
      }

      // Step 2: store token locally and in axios headers
      localStorage.setItem("token", token);
      API.defaults.headers.common.Authorization = `Bearer ${token}`;

      // Step 3: fetch user info (role, name, etc.)
      const me = await API.get("/me");
      const role = me.data.role as Role;

      if (!role) {
        toast.error("Login failed: invalid user role");
        return;
      }

      // Step 4: store in Zustand
      setAuth(token, role);

      // Step 5: start auto refresh loop
      startTokenRefreshLoop();

      toast.success(`Welcome back, ${me.data.name}!`);
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid credentials");
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
          />
          <input
            className="form-control mb-3"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn btn-primary w-100 mb-3">Login</button>
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
