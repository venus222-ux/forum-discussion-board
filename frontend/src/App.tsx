import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import ForgotPassword from "./pages/ForgetPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Navbar from "./components/Navbar";
import { ToastContainer } from "react-toastify";
import { useStore } from "./store/useStore";
import ModeratorDashboard from "./pages/Dashboard/ModeratorDashboard";
import UserDashboard from "./pages/Dashboard/UserDashboard";
import AdminDashboard from "./pages/Dashboard/AdminDashboard";
import CategoryList from "./pages/CategoryList";
import ThreadList from "./pages/ThreadList";
import ThreadDetail from "./pages/ThreadDetail";

const App = () => {
  const { theme, isAuth, role, startTokenRefreshLoop } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);

    if (isAuth) startTokenRefreshLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, isAuth]);

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/login"
          element={!isAuth ? <Login /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/register"
          element={
            !isAuth ? <Register /> : <Navigate to="/dashboard" replace />
          }
        />

        <Route path="/categories" element={<CategoryList />} />
        <Route
          path="/categories/:categorySlug/threads"
          element={<ThreadList />}
        />
        <Route path="/threads/:slug" element={<ThreadDetail />} />

        {/* Single dashboard route */}
        <Route
          path="/dashboard"
          element={
            isAuth ? (
              role === "moderator" ? (
                <ModeratorDashboard />
              ) : role === "user" ? (
                <UserDashboard />
              ) : role === "admin" ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/login" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/profile"
          element={isAuth ? <Profile /> : <Navigate to="/login" replace />}
        />

        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
};

export default App;
