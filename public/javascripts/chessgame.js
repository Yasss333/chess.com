// const { Chess } = require("chess.js");

const socket = io();

const chess = new Chess();

const boardElement = document.querySelector(".chessboard");
let demoMode = false;

let draggedPiece = null;
let sourcepiece = null;
let playerRole = null;
const piece_unicode={
          K: "♔",  // King
    Q: "♕",  // Queen
    R: "♖",  // Rook
    B: "♗",  // Bishop
    N: "♘",  // Knight
    P: "♙",  // Pawn
    k: "♚",  // King
    q: "♛",  // Queen
    r: "♜",  // Rook
    b: "♝",  // Bishop
    n: "♞",  // Knight
    p: "♟"   // Pawn
}

const renderboard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";
  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex )%2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerText = getPieceUnicode(square);
        // pieceElement.draggable = playerRole === square.color;
        pieceElement.draggable = demoMode || playerRole === square.color;


        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourcepiece = { row: rowindex, col: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });
        pieceElement.addEventListener("dragend", (e) => {
          draggedPiece = null;
          sourcepiece = null;
        });
        squareElement.appendChild(pieceElement)
      }
      squareElement.addEventListener('dragover',(e)=>{
        e.preventDefault();
      })
      squareElement.addEventListener('drop',(e)=>{
       e.preventDefault();
       if(draggedPiece){
        const targetsource={
            row:parseInt(squareElement.dataset.row),
            col:parseInt(squareElement.dataset.col)
        };
        handlemove(sourcepiece,targetsource )
       }
      })
      boardElement.appendChild(squareElement)
    });
  });
  if(playerRole==='b'){
    boardElement.classList.add('flipped')
  }
  else{
    boardElement.classList.remove('flipped')
  }
};


const handlemove = (source,target) => {
    const move={
        from:`${String.fromCharCode(97+source.col)}${8-source.row}`,
        to:`${String.fromCharCode(97+target.col)}${8-target.row}`,
    
    }
    
    if (demoMode) {
        // In demo mode, apply move locally without socket
        const result = chess.move(move);
        if (result) {
            console.log("Demo move made:", move);
            renderboard();
        } else {
            console.log("Invalid move in demo mode:", move);
        }
    } else {
        // Normal mode: send through socket
        socket.emit('move', move);
    }
};
const getPieceUnicode = (piece) => {
    if(!piece)return ;
    const key=piece.color==='w'?
    piece.type.toUpperCase():
    piece.type.toLowerCase()
    
    
    return piece_unicode[key]; 
};


const demoBtn = document.getElementById("demoToggle");

if (demoBtn) {
  console.log("Demo button found");
  demoBtn.addEventListener("click", () => {
    demoMode = !demoMode;
    console.log("Demo mode toggled:", demoMode);
    demoBtn.innerText = demoMode ? "Demo Mode: ON" : "Demo Mode: OFF";
    renderboard();
  });
} else {
  console.error("Demo button not found!");
}


socket.on("playerRole",function(role){
    playerRole=role;
    renderboard()
});
socket.on("SpectatorRole", function () {
  playerRole = null;
  renderboard();
});
socket.on("boardState", function (fen) {
    chess.load(fen);
    renderboard();
});
socket.on("move", function (move) {
    chess.move(move);
    renderboard();
});

socket.on("check",({color})=>{
   alert(`${color==='w' ? 'White':"Black"} is in Check !`)
});

socket.on("gameOver",(data)=>{
  if(data.result==='Checkmate'){
      alert(`Checkmate! ${data.winner === "w" ? "White" : "Black"} is winner`);
  }

  if(data.result==='draw'){
    alert('Game is draw ')
  }
});



renderboard();
