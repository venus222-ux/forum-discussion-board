import React, { useEffect, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

import echo, { fetchDashboard } from "../../echo"; // your echo + fetchDashboard file
import styles from "../../styles/AdminDashboard.module.css";
import AdminCategories from "../../components/AdminCategories";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

interface DashboardData {
  totalUsers: number;
  totalCategories: number;
  totalThreads: number;
  totalComments: number;
  flaggedComments: number;
  threadsPerCategory: { name: string; count: number }[];
  userRoleDistribution: { role: string; count: number }[];
}

const AdminDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      const data = await fetchDashboard("30d");
      if (data) setDashboard(data);
    };
    loadDashboard();
  }, []);

  if (!dashboard) return <div className={styles.loading}>Loading...</div>;

  // Prepare chart data
  const threadsChart = {
    labels: dashboard.threadsPerCategory.map((c) => c.name),
    datasets: [
      {
        label: "# Threads per Category",
        data: dashboard.threadsPerCategory.map((c) => c.count),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const rolesChart = {
    labels: dashboard.userRoleDistribution.map((r) => r.role),
    datasets: [
      {
        label: "# Users by Role",
        data: dashboard.userRoleDistribution.map((r) => r.count),
        backgroundColor: [
          "rgba(255, 99, 132, 0.6)",
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 206, 86, 0.6)",
          "rgba(75, 192, 192, 0.6)",
          "rgba(153, 102, 255, 0.6)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin Dashboard</h1>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3 className={styles.statTitle}>Total Users</h3>
          <p className={styles.statValue}>{dashboard.totalUsers}</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statTitle}>Total Categories</h3>
          <p className={styles.statValue}>{dashboard.totalCategories}</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statTitle}>Total Threads</h3>
          <p className={styles.statValue}>{dashboard.totalThreads}</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statTitle}>Total Comments</h3>
          <p className={styles.statValue}>{dashboard.totalComments}</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statTitle}>Flagged Comments</h3>
          <p className={styles.statValue}>{dashboard.flaggedComments}</p>
        </div>
      </div>
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Threads per Category</h2>
          <div className={styles.chartContainer}>
            <Bar data={threadsChart} options={chartOptions} />
          </div>
        </div>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Users by Role</h2>
          <div className={styles.chartContainer}>
            <Pie data={rolesChart} options={chartOptions} />
          </div>
        </div>
      </div>
      <AdminCategories />
    </div>
  );
};

export default AdminDashboard;
