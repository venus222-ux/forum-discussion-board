import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.Pusher = Pusher;

const echo = new Echo({
  broadcaster: "pusher",
  key: "72f70b3c1eb4247fc505",
  cluster: "eu",
  forceTLS: true,
  encrypted: true,
  authEndpoint: "http://localhost:8000/broadcasting/auth", // use your backend URL
  auth: {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`, // JWT or auth token
    },
  },
});

export default echo;
