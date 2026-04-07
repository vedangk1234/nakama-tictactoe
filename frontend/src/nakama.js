import { Client } from "@heroiclabs/nakama-js";

const client = new Client(
  "supersecret",
  "nakama-tictactoe-production-b830.up.railway.app", // 👈 your Railway URL
  "443",
  true
);
export default client;