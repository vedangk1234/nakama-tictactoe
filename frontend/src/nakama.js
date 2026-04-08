import { Client } from "@heroiclabs/nakama-js";

const client = new Client(
  "defaultkey",
  "nakama-tictactoe-production-3360.up.railway.app",
  "",      // leave port EMPTY — Railway handles routing
  true     // useSSL
);

export default client;