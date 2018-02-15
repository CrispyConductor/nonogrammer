const Board = require('./board');
const Solver = require('./solver');
const Builder = require('./builder');

let board = Board.makeRandomBoard(10, 10, 1);
console.log('Randomly created board: (spaces are blank)');
board.printBoard(' ', '?');
console.log('');

let res = Builder.buildPuzzleFromData(board, 4);
console.log('Created puzzle: (Xs are known blanks, spaces are unknowns)');
res.board.printBoard('X', ' ');
console.log('Solution stats:');
console.log(res.stats);
console.log('');

let solutions = Solver.findPossibleSolutions(res.board);
console.log('Solution from solver:');
for (let sol of solutions) {
	sol.printBoard(' ', '?');
}

