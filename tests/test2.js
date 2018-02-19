const {
	Solver,
	Builder,
	Board
} = require('../index');

let board = new Board(8, 8);
board.data = [
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 1, 1, 1, 0, 0, 0, 0,
	0, 0, 1, 1, 1, 0, 0, 1,
	0, 0, 0, 0, 1, 0, 0, 0,
	0, 1, 0, 1, 1, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 1, 0, 0,
	0, 1, 0, 0, 0, 0, 0, 0
];


let res = Builder.buildPuzzleFromData(board);
res.printBoard();

