var nk_log = 'MODULE TOP LEVEL EXECUTING';
function uint8ArrayToString(data) {
    return String.fromCharCode.apply(null, new Uint8Array(data));
}

function checkWinner(board) {
    var lines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    for (var i = 0; i < lines.length; i++) {
        var a = lines[i][0], b = lines[i][1], c = lines[i][2];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    if (board.every(function(cell) { return cell !== ""; })) return "draw";
    return null;
}

function recordWinner(nk, logger, state, winnerId) {
    try {
        var player1Id = state.playerIds[0];
        var player2Id = state.playerIds[1];
        var player1Username = state.playerUsernames[player1Id] || "Unknown";
        var player2Username = state.playerUsernames[player2Id] || "Unknown";

        if (winnerId === "draw") {
            nk.leaderboardRecordWrite("tictactoe_wins", player1Id, player1Username, 0, 0, {});
            nk.leaderboardRecordWrite("tictactoe_wins", player2Id, player2Username, 0, 0, {});
            logger.info("Draw recorded for both players");
        } else {
            var loserId = winnerId === player1Id ? player2Id : player1Id;
            var winnerUsername = state.playerUsernames[winnerId] || "Unknown";
            var loserUsername = state.playerUsernames[loserId] || "Unknown";
            nk.leaderboardRecordWrite("tictactoe_wins", winnerId, winnerUsername, 1, 0, {});
            nk.leaderboardRecordWrite("tictactoe_wins", loserId, loserUsername, 0, 0, {});
            logger.info("Leaderboard updated: " + winnerUsername + " wins!");
        }
    } catch (e) {
        logger.error("Leaderboard write failed: " + e);
    }
}

function matchInit(ctx, logger, nk, params) {
    logger.info("MATCH INIT RUNNING");
    return {
        state: {
            board: ["", "", "", "", "", "", "", "", ""],
            playerIds: [],
            playerUsernames: {},
            turn: 0,
            winner: null,
            winnerRecorded: false
        },
        tickRate: 10,
        label: "tic-tac-toe"
    };
}

function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    logger.info("Join attempt: " + presence.userId);
    if (state.playerIds.length >= 2) {
        return { state: state, accept: false, rejectMessage: "Match is full" };
    }
    return { state: state, accept: true };
}

function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
    for (var i = 0; i < presences.length; i++) {
        var p = presences[i];
        if (state.playerIds.indexOf(p.userId) === -1) {
            state.playerIds.push(p.userId);
            state.playerUsernames[p.userId] = p.username;
            logger.info("Player joined: " + p.userId + " (" + p.username + ")");
        }
    }
    logger.info("Total players: " + state.playerIds.length);

    for (var j = 0; j < presences.length; j++) {
        var pj = presences[j];
        var idx = state.playerIds.indexOf(pj.userId);
        var symbol = idx === 0 ? "X" : "O";
        dispatcher.broadcastMessage(2, JSON.stringify({ symbol: symbol }), [pj]);
    }

    dispatcher.broadcastMessage(1, JSON.stringify({
        board: state.board,
        turn: state.turn,
        players: state.playerIds.length,
        winner: state.winner
    }));

    return { state: state };
}

function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
    for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];

        var data;
        try {
            data = JSON.parse(uint8ArrayToString(msg.data));
        } catch (err) {
            logger.error("Decode failed: " + err);
            continue;
        }

        var position = data.position;

        if (state.winner) { continue; }
        if (state.playerIds.length < 2) { logger.info("Need 2 players"); continue; }

        var expectedPlayerId = state.playerIds[state.turn % 2];
        if (msg.sender.userId !== expectedPlayerId) {
            logger.info("Wrong turn");
            continue;
        }

        if (typeof position !== "number" || position < 0 || position > 8) { continue; }
        if (state.board[position] !== "") { continue; }

        var symbol = state.turn % 2 === 0 ? "X" : "O";
        state.board[position] = symbol;
        state.turn += 1;
        state.winner = checkWinner(state.board);

        logger.info("Applied: " + symbol + " at " + position + " | Board: " + JSON.stringify(state.board));

        if (state.winner && !state.winnerRecorded) {
            state.winnerRecorded = true;
            logger.info("Winner: " + state.winner);
            if (state.winner === "draw") {
                recordWinner(nk, logger, state, "draw");
            } else {
                var winnerId = state.winner === "X" ? state.playerIds[0] : state.playerIds[1];
                recordWinner(nk, logger, state, winnerId);
            }
        }

        dispatcher.broadcastMessage(1, JSON.stringify({
            board: state.board,
            turn: state.turn % 2,
            players: state.playerIds.length,
            winner: state.winner
        }));
    }

    return { state: state };
}

function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
    for (var i = 0; i < presences.length; i++) {
        logger.info("Player left: " + presences[i].userId);
    }
    return { state: state };
}

function matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    logger.info("Match terminated");
    return { state: state };
}

function matchSignal(ctx, logger, nk, dispatcher, tick, state, data) {
    logger.info("Signal received");
    return { state: state, data: data };
}

function rpcCreateMatch(ctx, logger, nk, payload) {
    var matchId = nk.matchCreate("tic-tac-toe", {});
    logger.info("Match created: " + matchId);
    return JSON.stringify({ match_id: matchId });
}

function rpcFindMatch(ctx, logger, nk, payload) {
    logger.info("Finding match for user: " + ctx.userId);

    var matches = nk.matchList(10, true, "tic-tac-toe", null, 1, "");

    if (matches && matches.length > 0) {
        for (var i = 0; i < matches.length; i++) {
            if (matches[i].size === 1) {
                logger.info("Found existing match: " + matches[i].matchId);
                return JSON.stringify({ match_id: matches[i].matchId });
            }
        }
    }

    var matchId = nk.matchCreate("tic-tac-toe", {});
    logger.info("Created new match: " + matchId);
    return JSON.stringify({ match_id: matchId });
}

function rpcGetLeaderboard(ctx, logger, nk, payload) {
    logger.info("Fetching leaderboard");
    try {
        var records = nk.leaderboardRecordsList("tictactoe_wins", [], 10, null, 0);
        var result = [];
        if (records && records.records) {
            for (var i = 0; i < records.records.length; i++) {
                var r = records.records[i];
                result.push({ username: r.username, wins: r.score, rank: r.rank });
            }
        }
        logger.info("Leaderboard fetched: " + result.length + " records");
        return JSON.stringify({ leaderboard: result });
    } catch (e) {
        logger.error("Leaderboard fetch failed: " + e);
        return JSON.stringify({ leaderboard: [] });
    }
}

InitModule = function(ctx, logger, nk, initializer) {
    logger.info('INITMODULE CALLED');
    logger.info("MATCH MODULE LOADED");

    initializer.registerRpc("create_match", rpcCreateMatch);
    initializer.registerRpc("find_match", rpcFindMatch);
    initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);

    initializer.registerMatch("tic-tac-toe", {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLoop: matchLoop,
        matchLeave: matchLeave,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
    });

    logger.info("RPCs registered");
};
