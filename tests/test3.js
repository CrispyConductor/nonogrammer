const {
	Solver,
	Builder,
	Board
} = require('../index');

let board = Board.makeRandomBoard(5, 5, 2);


let res = Builder.buildPuzzleFromData(board, 4);
res.board.printBoard();

