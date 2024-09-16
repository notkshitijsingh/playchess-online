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

// Handle socket connections
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('joinRoom', ({ roomID, playerName }) => {
        socket.join(roomID);

        if (!rooms[roomID]) {
            // Initialize room if not present, with an empty game state and players
            rooms[roomID] = { player1: { name: playerName, color: null }, player2: null, fen: 'start' };
        } else if (!rooms[roomID].player2) {
            rooms[roomID].player2 = { name: playerName, color: null };
            
            // Randomly assign colors to the players
            const randomColor = Math.random() > 0.5 ? 'white' : 'black';
            rooms[roomID].player1.color = randomColor;
            rooms[roomID].player2.color = randomColor === 'white' ? 'black' : 'white';
        }

        const players = {
            player1: rooms[roomID].player1.name,
            player2: rooms[roomID].player2 ? rooms[roomID].player2.name : null,
        };

        // Send player names to both players
        io.to(roomID).emit('roomJoined', players);

        const playerCount = rooms[roomID].player2 ? 2 : 1;

        // Send game state and player colors once both players have joined
        if (playerCount === 2) {
            io.to(roomID).emit('ready', rooms[roomID].fen, rooms[roomID].player1.color, rooms[roomID].player2.color);
        }
    });

    // Handle player moves and update FEN
    socket.on('move', (data) => {
        rooms[data.roomID].fen = data.fen; // Store the current board state
        socket.to(data.roomID).emit('opponentMove', data.move);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Server listens on port 3000 or another specified port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
