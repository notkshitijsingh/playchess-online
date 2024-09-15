const socket = io();
let board = null;
let game = new Chess();
let playerColor = null;
let playerName = prompt("Enter your name");
let roomID = window.location.pathname.split('/').pop();

// Emit event to join the room and send player name
socket.emit('joinRoom', { roomID, playerName });

// Initialize the chessboard
function initializeChessBoard(color) {
    playerColor = color;
    board = Chessboard('board', {
        draggable: true,
        position: 'start',
        orientation: playerColor, // Set the board orientation based on the player's color
        onDrop: handleMove
    });
}

// Handle move from the player
function handleMove(source, target) {
    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' // always promote to queen for simplicity
    });

    if (move === null) return 'snapback'; // Invalid move

    socket.emit('move', { roomID, move });

    updateStatus();
}

// Handle receiving opponent's move
socket.on('opponentMove', function(move) {
    game.move(move);
    board.position(game.fen());
    updateStatus();
});

// Receive player names when both players have joined
socket.on('roomJoined', function(players) {
    document.getElementById('player1-name').textContent = players.player1 || 'Waiting for player 1...';
    document.getElementById('player2-name').textContent = players.player2 || 'Waiting for player 2...';
});

// When both players are ready, initialize the chessboard and display names
socket.on('ready', function(color) {
    initializeChessBoard(color);
    updateStatus();
});

// Update the game status (e.g., checkmate, draw)
function updateStatus() {
    let status = '';

    if (game.in_checkmate()) {
        status = 'Checkmate!';
    } else if (game.in_draw()) {
        status = 'Draw!';
    } else {
        status = 'Next move: ' + (game.turn() === 'w' ? 'White' : 'Black');
    }

    document.getElementById('status').innerText = status;
}
