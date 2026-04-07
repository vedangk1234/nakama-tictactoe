global.WebSocket = require("ws");
const { Client } = require("@heroiclabs/nakama-js");

const client = new Client("supersecret", "127.0.0.1", "7350", false);

async function run() {
    try {
        console.log("🚀 Player 2 Starting...");

        const session = await client.authenticateDevice("device-user2", true, "Vedang2");
        console.log("✅ Authenticated as:", session.username);

        const socket = client.createSocket();
        await socket.connect(session, true);
        console.log("🔌 Socket connected");

        const matchId = "b2b548e7-2920-4c23-ab0b-518e4f9d40e6.nakama"; // e.g. 59714053-xxxx.nakama

        await socket.joinMatch(matchId);
        console.log("✅ Player 2 joined match");

        socket.onmatchdata = (data) => {
            if (data.op_code !== 1) return;
            try {
                const decoded = Buffer.from(data.data).toString("utf8");
                const parsed = JSON.parse(decoded);
                console.log("\n📢 Game state (Player 2):");
                console.log("Board:", parsed.board);
                console.log("Turn:", parsed.turn);
                if (parsed.winner) console.log("🏆 Winner:", parsed.winner);

                // ✅ Only send move when it's Player 2's turn (turn === 1)
                // and board has exactly one X (Player 1 just moved)
                const xCount = parsed.board.filter(c => c === "X").length;
                const oCount = parsed.board.filter(c => c === "O").length;
                if (parsed.turn === 1 && xCount === 1 && oCount === 0) {
                    setTimeout(() => {
                        console.log("🎯 Player 2 sending move at position 1...");
                        socket.sendMatchState(matchId, 1, JSON.stringify({ position: 1 }));
                    }, 1000);
                }
            } catch (err) {
                console.log("❌ Failed to parse:", err.message);
            }
        };

    } catch (err) {
        console.error("❌ ERROR:", err.message || err);
    }
}

run();