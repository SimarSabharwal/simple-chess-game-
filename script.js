const chessboard = document.getElementById('chessboard');
const turnIndicator = document.getElementById('turn-indicator');

// Initial board state
// R: Rook, N: Knight, B: Bishop, Q: Queen, K: King, P: Pawn
// w: White, b: Black
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
    turnIndicator.textContent = currentTurn === 'w' ? "White's Turn" : "Black's Turn";
    turnIndicator.className = 'turn-indicator ' + (currentTurn === 'w' ? 'white-turn' : 'black-turn');
}

function handleSquareClick(row, col) {
    const piece = boardState[row][col];
    
    // If a move is selected
    const move = validMoves.find(m => m.row === row && m.col === col);
    if (move && selectedSquare) {
        executeMove(selectedSquare.row, selectedSquare.col, row, col);
        return;
    }

    // Select a piece
    if (piece && piece.startsWith(currentTurn)) {
        selectedSquare = { row, col };
        validMoves = calculateValidMoves(row, col);
        createBoard();
    } else {
        selectedSquare = null;
        validMoves = [];
        createBoard();
    }
}

function executeMove(fromRow, fromCol, toRow, toCol) {
    boardState[toRow][toCol] = boardState[fromRow][fromCol];
    boardState[fromRow][fromCol] = '';
    
    selectedSquare = null;
    validMoves = [];
    currentTurn = currentTurn === 'w' ? 'b' : 'w';
    
    createBoard();
    console.log(`Move: ${fromRow},${fromCol} to ${toRow},${toCol}. Turn: ${currentTurn}`);
}

function calculateValidMoves(row, col) {
    const piece = boardState[row][col];
    if (!piece) return [];
    
    const type = piece[1];
    const color = piece[0];
    let moves = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (isValidMove(row, col, r, c)) {
                const targetPiece = boardState[r][c];
                moves.push({ row: r, col: c, capture: targetPiece !== '' });
            }
        }
    }
    return moves;
}

function isValidMove(fromRow, fromCol, toRow, toCol) {
    if (fromRow === toRow && fromCol === toCol) return false;
    
    const piece = boardState[fromRow][fromCol];
    const target = boardState[toRow][toCol];
    
    // Cannot capture own piece
    if (target !== '' && target[0] === piece[0]) return false;
    
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
                if (rowDiff === direction) return true;
                if (fromRow === startRow && rowDiff === 2 * direction && boardState[fromRow + direction][fromCol] === '') return true;
            }
            // Capture
            if (absColDiff === 1 && rowDiff === direction && target !== '' && target[0] !== color) {
                return true;
            }
            return false;

        case 'R': // Rook
            if (fromRow !== toRow && fromCol !== toCol) return false;
            return isPathClear(fromRow, fromCol, toRow, toCol);

        case 'N': // Knight
            return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);

        case 'B': // Bishop
            if (absRowDiff !== absColDiff) return false;
            return isPathClear(fromRow, fromCol, toRow, toCol);

        case 'Q': // Queen
            if (absRowDiff !== absColDiff && fromRow !== toRow && fromCol !== toCol) return false;
            return isPathClear(fromRow, fromCol, toRow, toCol);

        case 'K': // King
            return absRowDiff <= 1 && absColDiff <= 1;
    }
    
    return false;
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = toRow > fromRow ? 1 : (toRow < fromRow ? -1 : 0);
    const colStep = toCol > fromCol ? 1 : (toCol < fromCol ? -1 : 0);
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    
    while (currentRow !== toRow || currentCol !== toCol) {
        if (boardState[currentRow][currentCol] !== '') return false;
        currentRow += rowStep;
        currentCol += colStep;
    }
    return true;
}

// Initialize
createBoard();
console.log('Chess game initialized - Phase 2 logic active.');
