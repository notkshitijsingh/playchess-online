const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

let rooms = {}; // Store room data including players, game state (FEN), and assigned colors

// Route for the game room
app.get('/game/:roomID', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/game.html'));
});

io.on('connection', (socket) => {
    socket.on('joinRoom', ({ roomID, playerName }) => {
        // Create room if it doesn't exist
        if (!rooms[roomID]) {
            rooms[roomID] = {
                player1: { name: playerName, color: 'white', time: 300 }, // 5 minutes for Player 1
                player2: null,
                fen: 'start'
            };
        } else if (!rooms[roomID].player2 && rooms[roomID].player1.name !== playerName) {
            // Ensure Player 2 is set with a different name than Player 1
            rooms[roomID].player2 = { name: playerName, color: 'black', time: 300 }; // 5 minutes for Player 2
        }
        

        // Add the socket to the room
        socket.join(roomID);

        // Send player names to both clients
        io.to(roomID).emit('updatePlayerNames', {
            player1: rooms[roomID].player1.name,
            player2: rooms[roomID].player2 ? rooms[roomID].player2.name : null
        });

        // If both players have joined, start the game
        if (rooms[roomID].player1 && rooms[roomID].player2) {
            io.to(roomID).emit('ready', rooms[roomID].fen, rooms[roomID].player1.color, rooms[roomID].player2.color, {
                player1Time: rooms[roomID].player1.time,
                player2Time: rooms[roomID].player2.time
            });
        }
    });

    // Handle moves and update the game state (FEN)
    socket.on('move', ({ roomID, fen, move }) => {
        if (rooms[roomID]) {
            rooms[roomID].fen = fen;
            socket.to(roomID).emit('opponentMove', move);
        }
    });

    // Handle timer updates
    socket.on('updateTimers', ({ roomID, player1Time, player2Time }) => {
        if (rooms[roomID]) {
            rooms[roomID].player1.time = player1Time;
            rooms[roomID].player2.time = player2Time;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
