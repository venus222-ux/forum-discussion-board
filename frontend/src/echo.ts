import Echo from "laravel-echo";
import Pusher from "pusher-js";
import axios from "axios";

// -----------------------------
// Axios fetchDashboard function
// -----------------------------
export const fetchDashboard = async (range: string = "30d") => {
  const token = localStorage.getItem("token"); // JWT token
  if (!token) {
    console.error("No auth token found");
    return;
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_BACKEND_URL}/api/admin/dashboard?range=${range}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  } catch (err: any) {
    console.error(
      "Error fetching dashboard:",
      err.response?.status,
      err.response?.data,
    );
  }
};

// -----------------------------
// Pusher / Laravel Echo setup
// -----------------------------
window.Pusher = Pusher;
Pusher.logToConsole = true; // debug logs

const echo = new Echo({
  broadcaster: "pusher",
  key: import.meta.env.VITE_PUSHER_APP_KEY,
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
  forceTLS: true,
  authEndpoint: `${import.meta.env.VITE_BACKEND_URL}/broadcasting/auth`,

  // Custom authorizer with JWT
  authorizer: (channel: any, options: any) => {
    return {
      authorize: (socketId: string, callback: Function) => {
        const token = localStorage.getItem("token");
        if (!token) return callback(true, "No token");

        fetch(`${import.meta.env.VITE_BACKEND_URL}/broadcasting/auth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            return res.json();
          })
          .then((data) => callback(false, data))
          .catch((err) => callback(true, err));
      },
    };
  },
});

window.Echo = echo;
export default echo;
