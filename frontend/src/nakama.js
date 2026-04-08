import { Client } from "@heroiclabs/nakama-js";

const client = new Client(
  "defaultkey",
  "nakama-tictactoe-production-3360.up.railway.app",
  "443",
  true
);

export default client;