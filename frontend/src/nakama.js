import { Client } from "@heroiclabs/nakama-js";

const client = new Client(
  "supersecret",
  "your-app.up.railway.app", // 👈 your Railway URL
  "443",
  true
);
export default client;