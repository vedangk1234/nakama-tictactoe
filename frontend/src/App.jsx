import { useState, useRef } from "react";
import client from "./nakama.js";
import "./App.css";

const EMPTY_BOARD = Array(9).fill("");

export default function App() {
  const [screen, setScreen] = useState("lobby");
  const [username, setUsername] = useState("");
  const [matchIdInput, setMatchIdInput] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState("");
  const [selectedMode, setSelectedMode] = useState("classic");

  const [board, setBoard] = useState(EMPTY_BOARD);
  const [myTurn, setMyTurn] = useState(false);
  const [mySymbol, setMySymbol] = useState("");
  const [matchId, setMatchId] = useState("");
  const [playerCount, setPlayerCount] = useState(1);
  const [winner, setWinner] = useState(null);
  const [gameMode, setGameMode] = useState("classic");
  const [timeLeft, setTimeLeft] = useState(30);
  const [forfeit, setForfeit] = useState(false);

  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const sessionRef = useRef(null);
  const socketRef = useRef(null);
  const matchIdRef = useRef("");
  const mySymbolRef = useRef("");
  const gameModeRef = useRef("classic");

  const setMsg = (msg, type = "") => {
    setStatus(msg);
    setStatusType(type);
  };

  async function connect(name) {
    const deviceId = "device-" + name.toLowerCase().replace(/\s+/g, "-");
    const session = await client.authenticateDevice(deviceId, true, name);
    sessionRef.current = session;

    const socket = client.createSocket();
    await socket.connect(session, true);
    socketRef.current = socket;

    socket.onmatchdata = (data) => {
      // op_code 2 = symbol + mode
      if (data.op_code === 2) {
        try {
          const decoded = new TextDecoder().decode(data.data);
          const parsed = JSON.parse(decoded);
          mySymbolRef.current = parsed.symbol;
          setMySymbol(parsed.symbol);
          if (parsed.mode) {
            gameModeRef.current = parsed.mode;
            setGameMode(parsed.mode);
          }
          setMsg(parsed.symbol === "X" ? "✅ You are X — Your turn first!" : "⏳ You are O — Opponent goes first!");
        } catch (e) {
          console.error("Symbol parse error", e);
        }
        return;
      }


      if (data.op_code !== 1) return;

      try {
        const decoded = new TextDecoder().decode(data.data);
        const parsed = JSON.parse(decoded);

        setBoard(parsed.board);
        setPlayerCount(parsed.players);
        if (parsed.mode) {
          gameModeRef.current = parsed.mode;
          setGameMode(parsed.mode);
        }

        if (parsed.winner) {
          setWinner(parsed.winner);

          if (parsed.winner === "draw") {
            setMsg("It's a draw! 🤝", "winner");
          } else if (parsed.winner === mySymbolRef.current) {
            setMsg("You won! 🏆", "winner");
          } else {
            setMsg("You lost! 😔", "winner");
          }

          setMyTurn(false);
          return;
        }

        const isMyTurn =
          (parsed.turn === 0 && mySymbolRef.current === "X") ||
          (parsed.turn === 1 && mySymbolRef.current === "O");

        setMyTurn(isMyTurn);

        if (parsed.players < 2) {
          setMsg("⏳ Waiting for opponent to join...");
        } else {
          setMsg(isMyTurn ? "✅ Your turn!" : "⏳ Opponent's turn...");
        }
      } catch (e) {
        console.error("Parse error", e);
      }
    };

    socket.onmatchpresence = (e) => {
      if (e.joins && e.joins.length > 0) {
        setPlayerCount((prev) => prev + e.joins.length);
      }
      if (e.leaves && e.leaves.length > 0) {
        setPlayerCount((prev) => Math.max(1, prev - e.leaves.length));
        setMsg("Opponent left the game.", "error");
      }
    };

    return { session, socket };
  }

  async function handleCreateMatch() {
    if (!username.trim()) return setMsg("Enter a username", "error");
    setLoading(true);
    setLoadingType("create");
    try {
      const { session } = await connect(username.trim());
      const rpcResult = await client.rpc(session, "create_match", JSON.stringify({ mode: "classic" }));
      const payload = typeof rpcResult.payload === "string"
        ? JSON.parse(rpcResult.payload) : rpcResult.payload;

      const mid = payload.match_id;
      matchIdRef.current = mid;
      mySymbolRef.current = "X";
      gameModeRef.current = selectedMode;

      await socketRef.current.joinMatch(mid);
      setMatchId(mid);
      setMySymbol("X");
      setGameMode(selectedMode);
      setMsg("⏳ Waiting for opponent to join...");
      setScreen("game");
    } catch (e) {
      setMsg("Error: " + e.message, "error");
    }
    setLoading(false);
    setLoadingType("");
  }

  async function handleFindMatch() {
    if (!username.trim()) return setMsg("Enter a username", "error");
    setLoading(true);
    setLoadingType("find");
    try {
      const { session } = await connect(username.trim());
      setMsg("🔍 Finding a match...");

      const rpcResult = await client.rpc(session, "find_match", JSON.stringify({ mode: "classic" }));
      const payload = typeof rpcResult.payload === "string"
        ? JSON.parse(rpcResult.payload) : rpcResult.payload;

      const mid = payload.match_id;
      matchIdRef.current = mid;
      gameModeRef.current = selectedMode;

      await socketRef.current.joinMatch(mid);
      setMatchId(mid);
      setGameMode(selectedMode);
      setMsg("✅ Match found! Waiting for game to start...");
      setScreen("game");
    } catch (e) {
      setMsg("Error: " + e.message, "error");
    }
    setLoading(false);
    setLoadingType("");
  }

  async function handleJoinMatch() {
    if (!username.trim()) return setMsg("Enter a username", "error");
    if (!matchIdInput.trim()) return setMsg("Enter a match ID", "error");
    setLoading(true);
    setLoadingType("join");
    try {
      await connect(username.trim());
      const mid = matchIdInput.trim();
      matchIdRef.current = mid;
      mySymbolRef.current = "O";

      await socketRef.current.joinMatch(mid);
      setMatchId(mid);
      setMySymbol("O");
      setMyTurn(false);
      setMsg("✅ Joined! Waiting for X to move...");
      setScreen("game");
    } catch (e) {
      setMsg("Error: " + e.message, "error");
    }
    setLoading(false);
    setLoadingType("");
  }

  async function handleShowLeaderboard() {
    setLeaderboardLoading(true);
    try {
      let session = sessionRef.current;
      if (!session) {
        session = await client.authenticateDevice("guest-leaderboard-viewer", true, "Guest");
        sessionRef.current = session;
      }
      const rpcResult = await client.rpc(session, "get_leaderboard", "{}");
      const payload = typeof rpcResult.payload === "string"
        ? JSON.parse(rpcResult.payload) : rpcResult.payload;
      setLeaderboard(payload.leaderboard || []);
      setScreen("leaderboard");
    } catch (e) {
      console.error("Leaderboard error:", e);
      setLeaderboard([]);
      setScreen("leaderboard");
    }
    setLeaderboardLoading(false);
  }

  function handleCellClick(index) {
    if (!myTurn || board[index] !== "" || winner) return;
    setMyTurn(false);
    setMsg("⏳ Waiting for opponent...");
    socketRef.current.sendMatchState(
      matchIdRef.current, 1, JSON.stringify({ position: index })
    );
  }

  function handleCopy() {
    navigator.clipboard.writeText(matchId);
    setMsg("Match ID copied! ✅");
  }

  function handleRestart() {
    setScreen("lobby");
    setBoard(EMPTY_BOARD);
    setMyTurn(false);
    setMySymbol("");
    setMatchId("");
    setMatchIdInput("");
    setPlayerCount(1);
    setWinner(null);
    setStatus("");
    setTimeLeft(30);
    setForfeit(false);
    setGameMode("classic");
    sessionRef.current = null;
    socketRef.current = null;
    matchIdRef.current = "";
    mySymbolRef.current = "";
    gameModeRef.current = "classic";
  }



  return (
    <div className="app">
      <h1>⚡ TIC-TAC-TOE</h1>

      {screen === "lobby" && (
        <div className="lobby">
          <input
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />



          <button className="btn btn-find" onClick={handleFindMatch} disabled={loading}>
            {loadingType === "find" ? "🔍 Finding..." : "🔍 Find Match (Auto)"}
          </button>

          <div style={{ color: "#555", fontSize: "0.85rem" }}>— or —</div>

          <button className="btn btn-primary" onClick={handleCreateMatch} disabled={loading}>
            {loadingType === "create" ? "Creating..." : "➕ Create Match"}
          </button>

          <div style={{ color: "#555", fontSize: "0.85rem" }}>— or —</div>

          <input
            placeholder="Paste Match ID to join"
            value={matchIdInput}
            onChange={(e) => setMatchIdInput(e.target.value)}
          />
          <button className="btn btn-secondary" onClick={handleJoinMatch} disabled={loading}>
            {loadingType === "join" ? "Joining..." : "🔗 Join Match"}
          </button>

          <div style={{ color: "#555", fontSize: "0.85rem" }}>— or —</div>

          <button className="btn btn-leaderboard" onClick={handleShowLeaderboard} disabled={leaderboardLoading}>
            {leaderboardLoading ? "Loading..." : "🏆 Leaderboard"}
          </button>

          {status && <p className={`status ${statusType}`}>{status}</p>}
        </div>
      )}

      {screen === "game" && (
        <>
          <div className="info-bar">
            <div>You: <span>{mySymbol || "?"}</span></div>
            <div>Players: <span>{playerCount}/2</span></div>
            <div>Mode: <span>🎮 Classic</span></div>
          </div>


          {mySymbol === "X" && !board.some(cell => cell !== "") && playerCount < 2 && (
            <div className="match-id-box">
              <p>Share this Match ID with your opponent:</p>
              <span>{matchId}</span>
              <br />
              <button className="copy-btn" onClick={handleCopy}>📋 Copy</button>
            </div>
          )}

          <p className={`status ${statusType}`}>{status}</p>

          <div className="board">
            {board.map((cell, i) => (
              <button
                key={i}
                className={`cell ${cell.toLowerCase()} ${cell ? "taken" : ""} ${
                  !myTurn || cell || winner ? "disabled" : ""
                }`}
                onClick={() => handleCellClick(i)}
              >
                {cell}
              </button>
            ))}
          </div>

          {winner && (
            <div className="winner-actions">
              <button className="btn-restart" onClick={handleRestart}>🔄 Play Again</button>
              <button className="btn-leaderboard-small" onClick={handleShowLeaderboard}>🏆 View Leaderboard</button>
            </div>
          )}
        </>
      )}

      {screen === "leaderboard" && (
        <div className="leaderboard">
          <h2>🏆 Global Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="no-records">No games played yet. Be the first!</p>
          ) : (
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Wins</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={i} className={i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}>
                    <td>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${entry.rank}`}</td>
                    <td>{entry.username}</td>
                    <td>{entry.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button className="btn btn-secondary" onClick={() => setScreen("lobby")}>← Back to Lobby</button>
        </div>
      )}
    </div>
  );
}