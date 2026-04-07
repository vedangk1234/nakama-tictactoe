global.WebSocket = require("ws");
const { Client } = require("@heroiclabs/nakama-js");

const client = new Client("supersecret", "127.0.0.1", "7350", false);

async function run() {
    try {
        console.log("🚀 Player 1 Starting...");

        const session = await client.authenticateDevice("device-user1", true, "Vedang1");
        console.log("✅ Authenticated as:", session.username);

        const socket = client.createSocket();
        await socket.connect(session, true);
        console.log("🔌 Socket connected");

        const rpcResult = await client.rpc(session, "create_match", "{}");
        const payload = typeof rpcResult.payload === "string"
            ? JSON.parse(rpcResult.payload)
            : rpcResult.payload;

        const match_id = payload.match_id;
        console.log("🎮 Server match created:", match_id);

        await socket.joinMatch(match_id);
        console.log("✅ Player 1 joined match");

        console.log("\n📋 Give this match ID to Player 2:\n  ", match_id, "\n");
        console.log("⏳ Waiting for Player 2 to join...");

        socket.onmatchdata = (data) => {
            if (data.op_code !== 1) return;
            try {
                const decoded = Buffer.from(data.data).toString("utf8");
                const parsed = JSON.parse(decoded);
                console.log("\n📢 Game state (Player 1):");
                console.log("Board:", parsed.board);
                console.log("Turn:", parsed.turn);
                if (parsed.winner) console.log("🏆 Winner:", parsed.winner);
            } catch (err) {
                console.log("❌ Failed to parse:", err.message);
            }
        };

        // ✅ Only send move AFTER Player 2 joins
        socket.onmatchpresence = (presenceEvent) => {
            if (presenceEvent.joins && presenceEvent.joins.length > 0) {
                console.log("🟢 Player 2 joined! Sending move in 2s...");
                setTimeout(() => {
                    console.log("🎯 Player 1 sending move at position 0...");
                    socket.sendMatchState(match_id, 1, JSON.stringify({ position: 0 }));
                }, 2000);
            }
        };

    } catch (err) {
        console.error("❌ ERROR:", err.message || err);
    }
}

run();