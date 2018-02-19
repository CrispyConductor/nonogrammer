const {
	Solver,
	Builder,
	Board
} = require('../index');

let board = Board.makeRandomBoard(5, 5, 2);


let res = Builder.buildPuzzleFromData(board, 2);
res.board.printBoard();

