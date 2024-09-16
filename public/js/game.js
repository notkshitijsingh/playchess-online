const socket = io();
let board = null;
let game = new Chess();
let playerColor = null;
let playerName = prompt("Enter your name");
let roomID = window.location.pathname.split('/').pop();

// Timer variables (in seconds)
let player1Time = 300; // 5 minutes for Player 1
let player2Time = 300; // 5 minutes for Player 2
let timerInterval = null;
let currentPlayer = 'white'; // White starts the game by default

// Emit event to join the room and send player name
socket.emit('joinRoom', { roomID, playerName });

// Initialize the chessboard with the correct color and game state (FEN)
function initializeChessBoard(color, fen) {
    playerColor = color;
    game.load(fen); // Load the saved game state or start a new game if no FEN is provided

    board = Chessboard('board', {
        draggable: true,
        position: game.fen(), // Set board position based on the FEN
        orientation: playerColor, // Set the board orientation based on the player's color
        onDragStart: onDragStart,
        onDrop: handleMove,
        onMouseoverSquare: onMouseoverSquare,
        onMouseoutSquare: onMouseoutSquare
    });

    startTimer(); // Start the timer once the board is initialized
}

// Update the timers for both players
function updateTimers() {
    document.getElementById('player1-timer').innerText = formatTime(player2Time);
    document.getElementById('player2-timer').innerText = formatTime(player1Time);
}

// Format time to MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Switch timers when a move is made
function switchTimer() {
    if (currentPlayer === 'white') {
        currentPlayer = 'black';
    } else {
        currentPlayer = 'white';
    }
}

// Start the timer for the current player
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (currentPlayer === 'white') {
            player1Time--;
            if (player1Time <= 0) {
                clearInterval(timerInterval);
                alert('Player 1 ran out of time! Player 2 wins!');
                gameOver();
            }
        } else {
            player2Time--;
            if (player2Time <= 0) {
                clearInterval(timerInterval);
                alert('Player 2 ran out of time! Player 1 wins!');
                gameOver();
            }
        }
        updateTimers();
    }, 1000); // Update every second
}

// Handle move from the player
function handleMove(source, target) {
    removeHighlights();

    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to queen for simplicity
    });

    // If the move is invalid, return the piece to the original position
    if (move === null) return 'snapback';

    // Emit the move to the opponent
    socket.emit('move', { roomID, fen: game.fen(), move });

    // Switch timer to the opponent's turn
    switchTimer();

    // Update the board status (e.g., whose turn it is)
    updateStatus();
}


// Handle receiving opponent's move
socket.on('opponentMove', function(move) {
    game.move(move);
    board.position(game.fen());
    switchTimer(); // Switch the timer back to the current player
    updateStatus();
});

// Receive player names when both players have joined
socket.on('roomJoined', function(players) {
    document.getElementById('player1-name').textContent = players.player1 || 'Waiting for player 1...';
    document.getElementById('player2-name').textContent = players.player2 || 'Waiting for player 2...';
});

// When both players are ready, initialize the chessboard with the proper color and game state
socket.on('ready', function(fen, player1Color, player2Color) {
    const playerColor = (playerName === document.getElementById('player1-name').textContent) ? player1Color : player2Color;
    initializeChessBoard(playerColor, fen);

    // Assign turn based on color
    if (playerColor === 'white') {
        currentPlayer = 'white'; // White always starts the game
    } else {
        currentPlayer = 'black'; // Black will go second
    }

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

// End the game (clear the board and stop the timers)
function gameOver() {
    board.clear();
    clearInterval(timerInterval);
}

// Highlight possible moves for the clicked piece
function highlightMoves(square) {
    const moves = game.moves({
        square: square,
        verbose: true
    });

    if (moves.length === 0) return;

    moves.forEach(move => {
        highlightSquare(move.to);
    });
}

// Highlight the square
function highlightSquare(square) {
    const $square = $('#board .square-' + square);

    let background = whiteSquareGrey;
    if ($square.hasClass('black-3c85d')) {
        background = blackSquareGrey;
    }

    $square.css('background', background);
}

// Remove all highlights
function removeHighlights() {
    $('#board .square-55d63').css('background', '');
}

// Handle drag start event
function onDragStart(source, piece, position, orientation) {
    // Check if the game is over or it's not the player's turn
    if (game.in_checkmate() || game.in_draw()) return false;

    // Restrict movement to only the player's color
    if ((game.turn() === 'w' && playerColor !== 'white') || (game.turn() === 'b' && playerColor !== 'black')) {
        return false;
    }

    // Restrict movement to only the player's own pieces
    if ((playerColor === 'white' && piece.search(/^b/) !== -1) || 
        (playerColor === 'black' && piece.search(/^w/) !== -1)) {
        return false;
    }
}


// Remove highlights when the mouse leaves a square
function onMouseoutSquare(square, piece) {
    removeHighlights();
}

// Show possible moves when the mouse is over a square
function onMouseoverSquare(square, piece) {
    if (piece && game.turn() === playerColor[0]) {
        highlightMoves(square);
    }
}
