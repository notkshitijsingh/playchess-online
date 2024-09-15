const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

let rooms = {};

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
            rooms[roomID] = { player1: playerName, player2: null };
        } else if (!rooms[roomID].player2) {
            rooms[roomID].player2 = playerName;
        }

        const players = rooms[roomID];
        
        // Send updated player names to both players
        io.to(roomID).emit('roomJoined', players);

        const playerCount = Object.values(players).filter(Boolean).length;

        // Once both players have joined, assign them colors
        if (playerCount === 1) {
            socket.emit('ready', 'white');
        } else if (playerCount === 2) {
            io.to(roomID).emit('ready', 'black');
        }
    });

    socket.on('move', (data) => {
        socket.to(data.roomID).emit('opponentMove', data.move);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Server listens on port 3000 or another specified port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
