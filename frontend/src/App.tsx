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
import CategoryList from "./pages/CategoryList";
import ThreadList from "./pages/ThreadList";
import ThreadDetail from "./pages/ThreadDetail";
import Dashboard from "./pages/Dashboard/Dashboard";

const App = () => {
  const { theme, isAuth, role, startTokenRefreshLoop } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
    if (isAuth) startTokenRefreshLoop();
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

        {/* Single /dashboard route with role selection */}
        {/* 🔥 CLEAN SINGLE DASHBOARD ROUTE */}
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/profile"
          element={isAuth ? <Profile /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
};

export default App;
