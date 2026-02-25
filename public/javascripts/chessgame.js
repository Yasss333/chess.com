const socket = io();
const chess = new Chess();

const boardElement = document.querySelector(".chessboard");
const demoBtn = document.getElementById("demoToggle");
const statusElement = document.getElementById("gameStatus");
const overlayElement = document.getElementById("gameOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlaySubtitle = document.getElementById("overlaySubtitle");

let demoMode = false;
let gameEnded = false;
let draggedPiece = null;
let sourcePiece = null;
let playerRole = null;
let resetTimer = null;
let lastGameKey = null;

const pieceUnicode = {
  K: "\u2654",
  Q: "\u2655",
  R: "\u2656",
  B: "\u2657",
  N: "\u2658",
  P: "\u2659",
  k: "\u265A",
  q: "\u265B",
  r: "\u265C",
  b: "\u265D",
  n: "\u265E",
  p: "\u265F",
};

const setStatus = (message) => {
  if (statusElement) statusElement.innerText = message;
};

const showOverlay = (title, subtitle) => {
  if (overlayTitle) overlayTitle.innerText = title;
  if (overlaySubtitle) overlaySubtitle.innerText = subtitle;
  if (overlayElement) overlayElement.classList.add("show");
};

const hideOverlay = () => {
  if (overlayElement) overlayElement.classList.remove("show");
};

const updateTurnStatus = () => {
  if (gameEnded) return;
  const turnText = chess.turn() === "w" ? "White" : "Black";
  if (chess.in_check()) {
    setStatus(`${turnText} is in check`);
    return;
  }
  setStatus(`${turnText} to move`);
};

const getGameResult = () => {
  if (chess.in_checkmate()) {
    return {
      result: "Checkmate",
      winner: chess.turn() === "w" ? "b" : "w",
      reason: "King has no legal moves",
    };
  }
  if (chess.in_stalemate()) {
    return { result: "Draw", reason: "Stalemate" };
  }
  if (chess.insufficient_material()) {
    return { result: "Draw", reason: "Insufficient material" };
  }
  if (chess.in_threefold_repetition()) {
    return { result: "Draw", reason: "Threefold repetition" };
  }
  if (chess.in_draw()) {
    return { result: "Draw", reason: "Draw by rule" };
  }
  return null;
};

const scheduleReset = () => {
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    if (demoMode) {
      chess.reset();
      gameEnded = false;
      lastGameKey = null;
      hideOverlay();
      renderBoard();
      updateTurnStatus();
      return;
    }
    if (!chess.game_over()) {
      gameEnded = false;
      lastGameKey = null;
      hideOverlay();
      updateTurnStatus();
    }
  }, 2000);
};

const announceGameOver = (gameData) => {
  const key = `${chess.fen()}|${gameData.result}|${gameData.winner || ""}|${gameData.reason || ""}`;
  if (key === lastGameKey) return;
  lastGameKey = key;

  gameEnded = true;

  if (gameData.result === "Checkmate") {
    const winnerText = gameData.winner === "w" ? "White" : "Black";
    setStatus(`Checkmate. ${winnerText} wins.`);
    showOverlay(`${winnerText} wins`, "Checkmate");
  } else {
    const drawReason = gameData.reason || "Draw";
    setStatus(`Draw: ${drawReason}`);
    showOverlay("Draw", drawReason);
  }

  scheduleReset();
};

const evaluateGameState = () => {
  const gameResult = getGameResult();
  if (gameResult) {
    announceGameOver(gameResult);
    return;
  }
  if (!chess.game_over()) {
    gameEnded = false;
    lastGameKey = null;
    hideOverlay();
  }
  updateTurnStatus();
};

const getPieceUnicode = (piece) => {
  if (!piece) return "";
  const key = piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();
  return pieceUnicode[key];
};

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, rowIndex) => {
    row.forEach((square, squareIndex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add("square", (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark");
      squareElement.dataset.row = rowIndex;
      squareElement.dataset.col = squareIndex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = !gameEnded && (demoMode || playerRole === square.color);

        pieceElement.addEventListener("dragstart", (e) => {
          if (!pieceElement.draggable) return;
          draggedPiece = pieceElement;
          sourcePiece = { row: rowIndex, col: squareIndex };
          e.dataTransfer.setData("text/plain", "");
        });

        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourcePiece = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", (e) => e.preventDefault());
      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!draggedPiece || gameEnded) return;
        const targetSquare = {
          row: parseInt(squareElement.dataset.row, 10),
          col: parseInt(squareElement.dataset.col, 10),
        };
        handleMove(sourcePiece, targetSquare);
      });

      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
};

const handleMove = (source, target) => {
  if (gameEnded) return;

  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
  };

  if (demoMode) {
    const result = chess.move(move);
    if (!result) {
      setStatus("Invalid move");
      return;
    }
    renderBoard();
    evaluateGameState();
    return;
  }

  socket.emit("move", move);
};

if (demoBtn) {
  demoBtn.addEventListener("click", () => {
    demoMode = !demoMode;
    demoBtn.innerText = demoMode ? "Demo Mode: ON" : "Demo Mode: OFF";
    setStatus(demoMode ? "Demo mode enabled" : "Online mode enabled");
    renderBoard();
    evaluateGameState();
  });
}

socket.on("playerRole", (role) => {
  playerRole = role;
  renderBoard();
  evaluateGameState();
});

socket.on("SpectatorRole", () => {
  playerRole = null;
  setStatus("Spectator mode");
  renderBoard();
  evaluateGameState();
});

socket.on("boardState", (fen) => {
  chess.load(fen);
  if (!chess.game_over()) {
    gameEnded = false;
    lastGameKey = null;
    hideOverlay();
  }
  renderBoard();
  evaluateGameState();
});

socket.on("move", (move) => {
  chess.move(move);
  renderBoard();
  evaluateGameState();
});

socket.on("check", ({ color }) => {
  const colorText = color === "w" ? "White" : "Black";
  setStatus(`${colorText} is in check`);
});

socket.on("gameOver", (data) => {
  if (data.result === "Checkmate") {
    announceGameOver({
      result: "Checkmate",
      winner: data.winner,
      reason: "King has no legal moves",
    });
    return;
  }
  announceGameOver({
    result: "Draw",
    reason: data.reason || "Draw",
  });
});

socket.on("gameover", (data) => {
  announceGameOver({
    result: "Draw",
    reason: data.reason || "Draw",
  });
});

socket.on("notYourTurn", () => {
  setStatus("Not your turn");
});

socket.on("invalidMove", () => {
  setStatus("Invalid move");
});

socket.on("Invalid ", () => {
  setStatus("Invalid move");
});

renderBoard();
evaluateGameState();
