const chessboard = document.getElementById('chessboard');
const turnIndicator = document.getElementById('turn-indicator');

// Initial board state
let boardState = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
];

const pieceImages = {
    'bR': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'bN': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    'bB': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'bQ': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    'bK': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
    'bP': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    'wR': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'wN': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    'wB': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'wQ': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    'wK': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    'wP': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg'
};

let currentTurn = 'w';
let selectedSquare = null;
let validMoves = [];
let isGameOver = false;
let gameMode = 'pvp';

// State for special moves
let castlingRights = {
    w: { kingMoved: false, rookQueensideMoved: false, rookKingsideMoved: false },
    b: { kingMoved: false, rookQueensideMoved: false, rookKingsideMoved: false }
};
let lastMove = null; // { piece, fromRow, fromCol, toRow, toCol }

function createBoard() {
    chessboard.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = row;
            square.dataset.col = col;
            
            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add('selected');
            }
            
            const move = validMoves.find(m => m.row === row && m.col === col);
            if (move) {
                square.classList.add('valid-move');
                if (move.capture) square.classList.add('capture');
            }
            
            const pieceCode = boardState[row][col];
            if (pieceCode) {
                const pieceImg = document.createElement('img');
                pieceImg.src = pieceImages[pieceCode];
                pieceImg.classList.add('piece');
                pieceImg.draggable = false;
                square.appendChild(pieceImg);
            }
            
            square.addEventListener('click', () => handleSquareClick(row, col));
            chessboard.appendChild(square);
        }
    }
    updateTurnIndicator();
}

function updateTurnIndicator() {
    if (isGameOver) return; // Managed by checkmate/stalemate
    
    turnIndicator.textContent = currentTurn === 'w' ? "White's Turn" : "Black's Turn";
    turnIndicator.className = 'turn-indicator ' + (currentTurn === 'w' ? 'white-turn' : 'black-turn');
    
    if (isKingInCheck(currentTurn, boardState)) {
        turnIndicator.textContent += " (Check)";
        turnIndicator.classList.add('check');
    } else {
        turnIndicator.classList.remove('check');
    }
}

function handleSquareClick(row, col) {
    if (isGameOver) return;
    if (gameMode === 'pvb' && currentTurn === 'b') return; // Prevent human from moving black pieces in PvB mode
    const piece = boardState[row][col];
    
    // If a move is selected
    const move = validMoves.find(m => m.row === row && m.col === col);
    if (move && selectedSquare) {
        executeMove(selectedSquare.row, selectedSquare.col, row, col, move);
        return;
    }

    // Select a piece
    if (piece && piece.startsWith(currentTurn)) {
        selectedSquare = { row, col };
        validMoves = calculateValidMoves(row, col, boardState);
        createBoard();
    } else {
        selectedSquare = null;
        validMoves = [];
        createBoard();
    }
}

function executeMove(fromRow, fromCol, toRow, toCol, moveDetails) {
    const piece = boardState[fromRow][fromCol];
    const color = piece[0];
    const type = piece[1];

    // En Passant Capture
    if (moveDetails && moveDetails.enPassant) {
        boardState[fromRow][toCol] = ''; // Remove captured pawn
    }

    // Castling Rook Move
    if (moveDetails && moveDetails.castling) {
        if (toCol === 6) { // Kingside
            boardState[fromRow][5] = boardState[fromRow][7];
            boardState[fromRow][7] = '';
        } else if (toCol === 2) { // Queenside
            boardState[fromRow][3] = boardState[fromRow][0];
            boardState[fromRow][0] = '';
        }
    }

    // Move piece
    boardState[toRow][toCol] = piece;
    boardState[fromRow][fromCol] = '';

    // Pawn Promotion
    if (type === 'P' && (toRow === 0 || toRow === 7)) {
        boardState[toRow][toCol] = color + 'Q'; // Auto promote to Queen
    }

    // Update state
    updateCastlingRights(piece, fromRow, fromCol);
    lastMove = { piece, fromRow, fromCol, toRow, toCol };

    selectedSquare = null;
    validMoves = [];
    currentTurn = currentTurn === 'w' ? 'b' : 'w';
    
    checkGameState();
    createBoard();
    console.log(`Move: ${fromRow},${fromCol} to ${toRow},${toCol}. Turn: ${currentTurn}`);
    
    if (!isGameOver && gameMode === 'pvb' && currentTurn === 'b') {
        setTimeout(makeBotMove, 500);
    }
}

function updateCastlingRights(piece, row, col) {
    if (piece === 'wK') castlingRights.w.kingMoved = true;
    if (piece === 'bK') castlingRights.b.kingMoved = true;
    if (piece === 'wR') {
        if (col === 0) castlingRights.w.rookQueensideMoved = true;
        if (col === 7) castlingRights.w.rookKingsideMoved = true;
    }
    if (piece === 'bR') {
        if (col === 0) castlingRights.b.rookQueensideMoved = true;
        if (col === 7) castlingRights.b.rookKingsideMoved = true;
    }
}

function calculateValidMoves(row, col, state) {
    const piece = state[row][col];
    if (!piece) return [];
    
    const color = piece[0];
    let moves = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const moveDetails = isPseudoLegalMove(row, col, r, c, state);
            if (moveDetails) {
                // Check if this move leaves king in check
                if (!movePutsKingInCheck(row, col, r, c, color, state, moveDetails)) {
                    moves.push({ row: r, col: c, capture: moveDetails.capture, enPassant: moveDetails.enPassant, castling: moveDetails.castling });
                }
            }
        }
    }
    return moves;
}

function movePutsKingInCheck(fromRow, fromCol, toRow, toCol, color, state, moveDetails) {
    // Clone board
    let tempBoard = state.map(row => [...row]);
    
    // Simulate move
    if (moveDetails.enPassant) tempBoard[fromRow][toCol] = '';
    tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
    tempBoard[fromRow][fromCol] = '';
    
    return isKingInCheck(color, tempBoard);
}

function isPseudoLegalMove(fromRow, fromCol, toRow, toCol, state, checkCastling = true) {
    if (fromRow === toRow && fromCol === toCol) return null;
    
    const piece = state[fromRow][fromCol];
    const target = state[toRow][toCol];
    
    // Cannot capture own piece
    if (target !== '' && target[0] === piece[0]) return null;
    
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
    
    const type = piece[1];
    const color = piece[0];

    switch (type) {
        case 'P': // Pawn
            const direction = color === 'w' ? -1 : 1;
            const startRow = color === 'w' ? 6 : 1;
            
            // Forward move
            if (colDiff === 0 && target === '') {
                if (rowDiff === direction) return { capture: false };
                if (fromRow === startRow && rowDiff === 2 * direction && state[fromRow + direction][fromCol] === '') return { capture: false };
            }
            // Capture
            if (absColDiff === 1 && rowDiff === direction && target !== '' && target[0] !== color) {
                return { capture: true };
            }
            // En Passant
            if (absColDiff === 1 && rowDiff === direction && target === '') {
                if (lastMove && lastMove.piece === (color === 'w' ? 'bP' : 'wP')) {
                    if (lastMove.toRow === fromRow && lastMove.toCol === toCol && Math.abs(lastMove.fromRow - lastMove.toRow) === 2) {
                        return { capture: true, enPassant: true };
                    }
                }
            }
            return null;

        case 'R': // Rook
            if (fromRow !== toRow && fromCol !== toCol) return null;
            if (isPathClear(fromRow, fromCol, toRow, toCol, state)) return { capture: target !== '' };
            return null;

        case 'N': // Knight
            if ((absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2)) return { capture: target !== '' };
            return null;

        case 'B': // Bishop
            if (absRowDiff !== absColDiff) return null;
            if (isPathClear(fromRow, fromCol, toRow, toCol, state)) return { capture: target !== '' };
            return null;

        case 'Q': // Queen
            if (absRowDiff !== absColDiff && fromRow !== toRow && fromCol !== toCol) return null;
            if (isPathClear(fromRow, fromCol, toRow, toCol, state)) return { capture: target !== '' };
            return null;

        case 'K': // King
            if (absRowDiff <= 1 && absColDiff <= 1) return { capture: target !== '' };
            // Castling
            if (checkCastling && absColDiff === 2 && rowDiff === 0 && !castlingRights[color].kingMoved) {
                // Must not be in check currently
                if (isKingInCheck(color, state)) return null;
                
                if (toCol === 6 && !castlingRights[color].rookKingsideMoved) { // Kingside
                    if (isPathClear(fromRow, fromCol, fromRow, 7, state) &&
                        !movePutsKingInCheck(fromRow, fromCol, fromRow, 5, color, state, {}) &&
                        !movePutsKingInCheck(fromRow, fromCol, fromRow, 6, color, state, {})) {
                        return { capture: false, castling: true };
                    }
                } else if (toCol === 2 && !castlingRights[color].rookQueensideMoved) { // Queenside
                    if (isPathClear(fromRow, fromCol, fromRow, 0, state) &&
                        !movePutsKingInCheck(fromRow, fromCol, fromRow, 3, color, state, {}) &&
                        !movePutsKingInCheck(fromRow, fromCol, fromRow, 2, color, state, {})) {
                        return { capture: false, castling: true };
                    }
                }
            }
            return null;
    }
    
    return null;
}

function isPathClear(fromRow, fromCol, toRow, toCol, state) {
    const rowStep = toRow > fromRow ? 1 : (toRow < fromRow ? -1 : 0);
    const colStep = toCol > fromCol ? 1 : (toCol < fromCol ? -1 : 0);
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    
    while (currentRow !== toRow || currentCol !== toCol) {
        if (state[currentRow][currentCol] !== '') return false;
        currentRow += rowStep;
        currentCol += colStep;
    }
    return true;
}

function isKingInCheck(color, state) {
    // Find King
    let kingRow = -1, kingCol = -1;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (state[r][c] === color + 'K') {
                kingRow = r;
                kingCol = c;
                break;
            }
        }
    }
    
    // Check if any opponent piece can attack king
    const oppColor = color === 'w' ? 'b' : 'w';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (state[r][c].startsWith(oppColor)) {
                // Avoid infinite recursion by not checking castling in pseudo legal check
                const moveDetails = isPseudoLegalMove(r, c, kingRow, kingCol, state, false);
                if (moveDetails) return true;
            }
        }
    }
    return false;
}

function checkGameState() {
    let hasAnyValidMove = false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (boardState[r][c].startsWith(currentTurn)) {
                if (calculateValidMoves(r, c, boardState).length > 0) {
                    hasAnyValidMove = true;
                    break;
                }
            }
        }
        if (hasAnyValidMove) break;
    }

    if (!hasAnyValidMove) {
        isGameOver = true;
        if (isKingInCheck(currentTurn, boardState)) {
            turnIndicator.textContent = currentTurn === 'w' ? "Black Wins by Checkmate!" : "White Wins by Checkmate!";
            turnIndicator.className = 'turn-indicator checkmate';
        } else {
            turnIndicator.textContent = "Draw by Stalemate!";
            turnIndicator.className = 'turn-indicator stalemate';
        }
    }
}

// --- Bot Logic ---
function makeBotMove() {
    if (isGameOver) return;
    
    let allMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (boardState[r][c].startsWith('b')) {
                const moves = calculateValidMoves(r, c, boardState);
                moves.forEach(m => {
                    allMoves.push({
                        fromRow: r, fromCol: c,
                        toRow: m.row, toCol: m.col,
                        moveDetails: m
                    });
                });
            }
        }
    }
    
    if (allMoves.length === 0) return;

    let bestMove = null;
    let bestScore = -Infinity;
    
    // Add randomness for variety
    allMoves.sort(() => Math.random() - 0.5);

    for (let move of allMoves) {
        let score = evaluateMove(move);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    if (bestMove) {
        executeMove(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol, bestMove.moveDetails);
    }
}

function evaluateMove(move) {
    let score = 0;
    const targetPiece = boardState[move.toRow][move.toCol];
    
    if (targetPiece) {
        score += getPieceValue(targetPiece);
    }
    
    // Encourage promotion
    const piece = boardState[move.fromRow][move.fromCol];
    if (piece === 'bP' && move.toRow === 7) {
        score += 80;
    }

    return score;
}

function getPieceValue(piece) {
    if (!piece) return 0;
    const type = piece[1];
    switch (type) {
        case 'P': return 10;
        case 'N': return 30;
        case 'B': return 30;
        case 'R': return 50;
        case 'Q': return 90;
        case 'K': return 900;
        default: return 0;
    }
}

// --- Game Control ---
function resetGame() {
    boardState = [
        ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
        ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
        ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
    ];
    currentTurn = 'w';
    selectedSquare = null;
    validMoves = [];
    isGameOver = false;
    castlingRights = {
        w: { kingMoved: false, rookQueensideMoved: false, rookKingsideMoved: false },
        b: { kingMoved: false, rookQueensideMoved: false, rookKingsideMoved: false }
    };
    lastMove = null;
    createBoard();
}

document.getElementById('reset-btn').addEventListener('click', resetGame);
document.getElementById('game-mode').addEventListener('change', (e) => {
    gameMode = e.target.value;
    const p2Name = document.getElementById('player2-name');
    if (gameMode === 'pvb') {
        p2Name.textContent = 'Bot (Black)';
    } else {
        p2Name.textContent = 'Player 2';
    }
    resetGame();
});

// Initialize
createBoard();
console.log('Chess game initialized - Phase 3 logic active.');
