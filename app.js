const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const ejs = require("ejs");
const path = require("path");
const { title, emit } = require("process");
const { log } = require("console");

const app = express();

const server = http.createServer(app);

const io = socket(server);

let chess = new Chess();
let player = {};
let currentPlayer = "W";

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Custom chess game" });
});

io.on("connection", function (uniquesocket) {
  console.log("Connected");

  if (!player.white) {
    player.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w");
  } else if (!player.black) {
    player.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b");
  } else {
    uniquesocket.emit("SpectatorRole");
  }

 uniquesocket.on("disconnect", () => {
   if (uniquesocket.id === player.white) {
     delete player.white;
   }
   if (uniquesocket.id === player.black) {
     delete player.black;
   }
 });

 uniquesocket.on('move',(move)=>{
   try {
    if (chess.turn() === "w" && uniquesocket.id !== player.white) {
      return uniquesocket.emit("notYourTurn");
    }
    if (chess.turn() === "b" && uniquesocket.id !== player.black) {
      return uniquesocket.emit("notYourTurn");
    }

   const result=chess.move(move);
   
   if(result){
     currentPlayer=chess.turn();
     io.emit('move',move)
     io.emit('boardState',chess.fen())
   }
   else{
     console.log('invalid move ',move);
     uniquesocket.emit('Invalid ',move)
    }
    if(chess.inCheck()){
      io.emit('check',{
        color:chess.turn()
      })
    }
    if(chess.isCheckmate()){
      const winner=chess.turn()=== 'w'? 'b':'w';

      io.emit('gameOver',{
        result:"Checkmate", 
        winner
      })

      chess.reset();
      delete player.white;
      delete player.black;
    }
    if(chess.isDraw()){
      io.emit('gameover',{
        result:'draw'
      })

      chess.reset();
      delete player.white;
      delete player.black;

    }
} catch (error) {
    console.log(error);
    
    uniquesocket.emit('Invalid ',move)
}

})


});

server.listen(3000, () => {
  console.log("Server activated");
});
