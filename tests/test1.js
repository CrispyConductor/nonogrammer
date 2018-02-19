const {
	Solver,
	Builder,
	Board
} = require('../index');

let board = new Board(11, 8);
board.clearData(null);

function mkc(clues) {
	return clues.map((c) => { return { value: 1, run: c }; });
}

board.rowClues = [
	[],
	mkc([ 4 ]),
	mkc([ 6 ]),
	mkc([ 2, 2 ]),
	mkc([ 2, 2 ]),
	mkc([ 6 ]),
	mkc([ 4 ]),
	mkc([ 2 ]),
	mkc([ 2 ]),
	mkc([ 2 ]),
	[]
];

board.colClues = [
	[],
	mkc([ 9 ]),
	mkc([ 9 ]),
	mkc([ 2, 2 ]),
	mkc([ 2, 2 ]),
	mkc([ 4 ]),
	mkc([ 4 ]),
	[]
];

let sols = Solver.findPossibleSolutions(board);
if (!sols) {
	console.log('null return, no solutions');
} else {
	for (let sol of sols) sol.printBoard();
}

