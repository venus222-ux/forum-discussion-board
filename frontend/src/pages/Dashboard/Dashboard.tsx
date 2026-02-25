import { Navigate } from "react-router-dom";
import { useStore } from "../../store/useStore";

import ModeratorDashboard from "./ModeratorDashboard";
import UserDashboard from "./UserDashboard";
import AdminDashboard from "./AdminDashboard";

export default function Dashboard() {
  const { isAuth, role, user } = useStore();

  // ── DEBUG LOGS (remove after we fix it) ──
  console.log("[Dashboard Debug] →", {
    isAuth,
    role,
    userRole: user?.role,
    userName: user?.name,
  });

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-7xl mb-6">⏳</div>
          <h2 className="text-3xl font-bold mb-2">Loading dashboard...</h2>
          <p className="text-red-600 dark:text-red-400 mb-8">
            Role is not detected (this is the debug screen)
          </p>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-left text-sm shadow">
            <strong>Current values:</strong>
            <br />
            isAuth = <span className="font-mono">{String(isAuth)}</span>
            <br />
            role ={" "}
            <span className="font-mono text-red-500">{String(role)}</span>
            <br />
            user?.role = <span className="font-mono">{String(user?.role)}</span>
            <br />
            user?.name = {user?.name || "—"}
          </div>

          <div className="mt-8 flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary px-6"
            >
              Reload Page
            </button>
            <button
              onClick={() => (window.location.href = "/login")}
              className="btn btn-outline"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal role switch (unchanged)
  switch (role.toLowerCase().trim()) {
    case "moderator":
      return <ModeratorDashboard />;
    case "user":
      return <UserDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      console.warn(`[Dashboard] Unknown role: "${role}"`);
      return <Navigate to="/" replace />;
  }
}
