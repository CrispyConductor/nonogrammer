const objtools = require('objtools');
const deepCopy = objtools.deepCopy;
const Board = require('./board');

/**
 * This class contains the logic for a nonogram solver.
 *
 * @class Solver
 * @constructor
 * @param {Board} board - The game board with unknowns the solver should solve.
 */
class Solver {

	constructor(board) {
		this.board = board;
	}

	/*
	 * This is the main solver entry point.  It is a static method that takes a Board object
	 * with unknowns/nulls and returns an array of solved Board objects.
	 *
	 * This function primarily contains recursive logic to perform a depth first search on
	 * puzzle board configurations.  Additional solving logic to determine all cells that
	 * can be determined within a given row/column is called "simple solving" here and is
	 * implemented in other methods that are called from within this method's recursive logic.
	 *
	 * @method findPossibleSolutions
	 * @param {Board} board
	 * @return {Board[]}
	 */
	static findPossibleSolutions(board) {
		// Array of solution Boards found so far
		let solutions = [];
		// Number of board values
		const maxValue = board.getMaxValue();
		// Contains a set of Board tokens that have been explored to avoid recomputing earlier paths.
		let visitedSet = {};

		// Array of all possible cell values
		let allPossibleValues = [];
		for (let i = 0; i <= maxValue; i++) allPossibleValues.push(i);

		// Number of solver iterations so far
		let iterations = 0;

		// Recursive function that tries all board configurations accessible from the given solver
		function findSolutionsFromState(solver, depth = 0) {
			iterations++;
			// Try to simple-solve the board
			let simpleSolveResult = solver.simpleSolveBatch();
			if (simpleSolveResult.contradiction) {
				// No solution to this puzzle
				return;
			}
			// Make sure we have not yet checked this board configuration
			let token = solver.board.makeToken();
			if (visitedSet[token]) {
				return;
			}
			visitedSet[token] = true;

			// If there are no unknowns remaining, this is a valid solution
			if (simpleSolveResult.remainingUnknowns === 0) {
				solutions.push(Solver.partialCopyBoard(solver.board));
				return;
			}

			// Find first unknown cell
			for (let row = 0; row < solver.board.rows; row++) {
				for (let col = 0; col < solver.board.cols; col++) {
					let value = solver.board.get(row, col);
					if (value === null || Array.isArray(value)) {
						// Set the cell value to each possible value and recurse, checking for solutions along each path
						let possibleValues = (value === null) ? allPossibleValues : value;
						for (let possibleValue of possibleValues) {
							solver.board.set(row, col, possibleValue);
							findSolutionsFromState(solver.partialDup(), depth + 1);
							solver.board.set(row, col, null);
						}
						return;
					}
				}
			}
		}

		findSolutionsFromState(new Solver(Solver.partialCopyBoard(board)));
		return solutions;
	}

	/**
	 * Makes a copy of a Board that deep-copies board data and shallow-copies everything else.
	 *
	 * @method partialCopyBoard
	 * @static
	 * @param {Board} board
	 * @return {Board}
	 */
	static partialCopyBoard(board) {
		// Deep-copies board data, shallow-copies everything else
		let b = new Board(board.rows, board.cols);
		b.rowClues = board.rowClues;
		b.colClues = board.colClues;
		b.data = deepCopy(board.data);
		return b;
	}

	/**
	 * Duplicates this Solver with a partially copied Board.
	 *
	 * @method partialDup
	 * @return {Solver}
	 */
	partialDup() {
		return new Solver(Solver.partialCopyBoard(this.board));
	}

	/**
	 * Repeatedly makes passes on the board and simple-solves all rows and columns
	 * until no more can be simple-solved.
	 *
	 * The returned object contains:
	 * - steps - Number of simple solve "steps" where each step involves inferring values for one row/col
	 * - remainingUnknowns - Number of remaining unknown cells after simple solve batch
	 * - contradiction - true if simple-solving lead to a logical contradiction, meaning the board is unsolveable
	 *
	 * @method simpleSolveBatch
	 * @return {Object}
	 */
	simpleSolveBatch() {
		let numSteps = 0;
		for (;;) {
			let solvedOne = false;
			for (let row = 0; row < this.board.rows; row++) {
				let line = this.board.getRow(row);
				let res = Solver.simpleSolveLine(line, this.board.rowClues[row]);
				if (res === null) {
					return {
						steps: numSteps,
						contradiction: true
					};
				}
				if (res[0] > 0) {
					numSteps++;
					solvedOne = true;
					this.board.setRow(row, line);
				}
			}
			for (let col = 0; col < this.board.cols; col++) {
				let line = this.board.getCol(col);
				let res = Solver.simpleSolveLine(line, this.board.colClues[col]);
				if (res === null) {
					return {
						steps: numSteps,
						contradiction: true
					};
				}
				if (res[0] > 0) {
					numSteps++;
					solvedOne = true;
					this.board.setCol(col, line);
				}
			}
			if (!solvedOne) break;
		}
		let numUnknowns = 0;
		for (let value of this.board.data) {
			if (value === null) numUnknowns++;
		}
		return {
			steps: numSteps,
			remainingUnknowns: numUnknowns,
			contradiction: false
		};
	}

	/**
	 * Performs any simple solution steps possible given a single row or column.
	 *
	 * The return value is either `null` (indicating there are no valid line solutions), or
	 * an array in the form [ numNewlySolvedCells, numRemainingUnknownCells ]
	 * This function may transform some `null` elements into arrays of possible values.
	 *
	 * @method simpleSolveLine
	 * @param {Number[]} line - The row or column value array.  This is updated in-place with discovered values.
	 * @param {Object[]} clues - Array of clue objects for the row/col, each containing { value: X, run: Y }
	 * @return {Number[]|Null}
	 */
	static simpleSolveLine(line, clues) {
		// Make sure  line contains at least one unknown
		let earlyCheckUnknowns = false;
		for (let value of line) {
			if (value === null || (Array.isArray(value) && value.length > 1)) {
				earlyCheckUnknowns = true;
				break;
			}
		}
		if (!earlyCheckUnknowns) return [ 0, 0 ];

		// Find all valid solutions for this line, and tabulate which cells are the same across all solutions for this line

		// Array of cell values matching the line length containing cell values that are the same across all line solutions
		let knownCells = null;
		let length = line.length;

		// Make a set of all the values in the line clues
		let lineValues = [];
		for (let clue of clues) {
			if (lineValues.indexOf(clue.value) < 0) lineValues.push(clue.value);
		}

		// Given a value, returns an array of possible values for that cell
		function toKnownArray(value) {
			if (Array.isArray(value)) return value;
			if (value === null) {
				let r = deepCopy(lineValues);
				r.push(0);
				return r;
			}
			return [ value ];
		}

		// Scalar array intersection
		function intersection(ar1, ar2) {
			let ret = [];
			for (let el of ar1) {
				if (ar2.indexOf(el) >= 0) {
					ret.push(el);
				}
			}
			return ret;
		}

		// Checks to see if 2 sets of values are the same
		function valueSetsEqual(a, b) {
			if (!Array.isArray(a) && !Array.isArray(b)) return a === b;
			if (!Array.isArray(a)) a = [ a ];
			if (!Array.isArray(b)) b = [ b ];
			if (a.length !== b.length) return false;
			for (let el of a) {
				if (b.indexOf(el) < 0) return false;
			}
			return true;
		}

		// Checks if the 'set' possible value set wholly contains the 'otherSet'
		function valueSetContains(set, otherSet) {
			if (set === null) return true; // unknown values can be anything
			set = toKnownArray(set);
			otherSet = toKnownArray(otherSet);
			for (let el of otherSet) {
				if (set.indexOf(el) < 0) return false;
			}
			return true;
		}

		// Remove el from set
		function valueSetRemove(set, el) {
			set = toKnownArray(set);
			let idx = set.indexOf(el);
			if (idx >= 0) {
				set.splice(idx, 1);
			}
			return set;
		}

		function union(a, b) {
			let res = [];
			a = toKnownArray(a);
			b = toKnownArray(b);
			for (let el of a) {
				if (res.indexOf(el) < 0) res.push(el);
			}
			for (let el of b) {
				if (res.indexOf(el) < 0) res.push(el);
			}
			return res;
		}

		// Given a valid line solution, compares it to `knownCells` and updates `knownCells` with all cells that are the same
		function trackPossibleLineSolution(curLine) {
			if (!knownCells) {
				knownCells = deepCopy(curLine);
				return;
			}
			for (let i = 0; i < curLine.length; i++) {
				let cur = curLine[i];
				let known = knownCells[i];
				if (cur === known) continue;
				knownCells[i] = union(toKnownArray(cur), toKnownArray(known));
			}
		}

		// Recursive function that tries all possible positions of each clue
		// Parameters are:
		// - curLine - Array containing the line values
		// - clueIdx - The index of the clue to try positions on
		// - nextPossibleCluePos - The first index in curLine to start checking for this clue's position
		function tryCluePositions(curLine, clueIdx, nextPossibleCluePos) {
			// Degenerate case of 0 clues.  Line must be all blank.
			if (clues.length === 0) {
				for (let i = 0; i < length; i++) curLine[i] = 0;
				trackPossibleLineSolution(curLine);
				return;
			}

			// Iterate through all possible clue positions in this line
			let clue = clues[clueIdx];
			for (let pos = nextPossibleCluePos; pos < length; pos++) {
				if (valueSetsEqual(line[pos], 0)) {
					// We already know this is a space, so the run can't start here, but might start the next iteration.
					curLine[pos] = 0;
					continue;
				}
				if (!valueSetContains(line[pos], clue.value)) {
					if (valueSetContains(line[pos], 0)) {
						curLine[pos] = 0;
						continue;
					}
					// Clue position is of a value different from the clue.  Run can't start here, or later on.
					break;
				}

				// Make sure the run won't overrun the end of the line
				if (pos + clue.run > length) {
					break;
				}

				// Make sure this run at this position is compatible with the rest of the line
				let curCheckPos;
				let foundDefiniteNonBlank = false;
				for (curCheckPos = pos; curCheckPos < pos + clue.run; curCheckPos++) {
					// Make sure this clue fits the known values of this spot
					if (!valueSetContains(line[curCheckPos], 0)) foundDefiniteNonBlank = true;
					if (!valueSetContains(line[curCheckPos], clue.value)) break;
				}
				// If we found an incompatibility ...
				if (curCheckPos !== pos + clue.run) {
					// Found a cell at curCheckPos that's incompatible with the clue
					// If any non-blanks have been found, either it's a different value, or an incompatible blank after finding
					// some of the clue's value and no further positions will be valid
					if (foundDefiniteNonBlank) {
						break;
					}
					// Otherwise, we hit a string of potential blanks, and the only possibly solution is if they are all blanks
					// Update curLine to prepare for skipping ahead
					for (let i = pos; i <= curCheckPos; i++) {
						curLine[i] = 0;
					}
					// Advance pos to that cell, so next loop through starts with checking the immediate next cell
					pos = curCheckPos;
					// Skip to next iteration
					continue;
				}

				// Next cell must be at end of line, or different value (including blank or unknown).
				if (pos + clue.run < length && valueSetsEqual(line[pos + clue.run], clue.value)) {
					// Can continue if starting pos can be blank
					if (valueSetContains(line[pos], 0)) {
						curLine[pos] = 0;
						continue;
					} else {
						break;
					}
				}

				// Remove this clue's value from the next cell's potential value set
				if (pos + clue.run < length) {
					// Remove this clue's value from the next cell's potential value set
					curLine[pos + clue.run] = valueSetRemove(curLine[pos + clue.run], clue.value);
				}

				// If this is the last clue, ensure all remaining cells are blank or unknown
				if (clueIdx === clues.length - 1) {
					let remainingCellsBlank = true;
					for (let i = pos + clue.run; i < length; i++) {
						if (!valueSetContains(line[i], 0)) { remainingCellsBlank = false; break; }
						curLine[i] = 0;
					}
					if (!remainingCellsBlank) {
						// We can advance if starting position is unknown (could be blank)
						if (valueSetContains(line[pos], 0)) {
							curLine[pos] = 0;
							continue;
						} else {
							// Advancing would leave un-accounted-for cell values
							break;
						}
					}
				} else {
					// If this is not the last clue:
					// Ensure we have room for more clues
					if (pos + clue.run >= length) {
						break;
					}
					// Ensure the next clue is a different value, or there is a space in between
					if (clues[clueIdx + 1].value === clue.value) {
						if (!valueSetContains(line[pos + clue.run], 0)) {
							// We can advance if starting position is unknown (could be blank)
							if (valueSetContains(line[pos], 0)) {
								curLine[pos] = 0;
								continue;
							} else {
								break;
							}
						} else {
							curLine[pos + clue.run] = 0;
						}
					}
				}

				// We now know that, so far, this is a valid configuration for this clue

				// Update curLine for these values
				for (let i = pos; i < pos + clue.run; i++) {
					curLine[i] = clue.value;
				}

				if (clueIdx === clues.length - 1) {
					// This is the last clue, and the recursive "base case"
					trackPossibleLineSolution(curLine);
				} else {
					// Calculate the next possible clue starting position
					let nextNPCP = pos + clue.run;
					if (clues[clueIdx + 1].value === clue.value) {
						// There must be a space in between.  This is validated earlier but needs to be accounted for here.
						nextNPCP++;
					}
					// Recurse and try positions for the next clue
					tryCluePositions(curLine, clueIdx + 1, nextNPCP);
				}

				// We can continue if the starting cell is unknown
				if (valueSetContains(line[pos], 0)) {
					curLine[pos] = 0;
					continue;
				} else {
					break;
				}
			}
		}

		// Start trying clue positions, starting with the first clue at the beginning of the line
		tryCluePositions(deepCopy(line), 0, 0);

		// No valid line solutions were found, so it must not be solveable.
		if (!knownCells) return null;

		// Find the number of newly solved cells and remaining unknown cells
		// A "solved" cell here is any cell whose value set has been reduced
		// An unknown is any cell who has a value set length > 1
		let numSolved = 0;
		let numUnknowns = 0;
		for (let i = 0; i < knownCells.length; i++) {
			let knownPossibleValues = toKnownArray(knownCells[i]).length;
			let linePossibleValues = toKnownArray(line[i]).length;
			if (
				knownPossibleValues <= linePossibleValues ||
				(line[i] === null && knownPossibleValues === linePossibleValues)
			) {
				line[i] = knownCells[i];
				numSolved++;
			}
			if (!valueSetContains(line[i], knownCells[i])) {
				// Should never happen
				throw new Error('Valid line solution contradicts line?');
			}
			if (toKnownArray(line[i]).length !== 1) numUnknowns++;
		}

		// Simplify value sets of 1 element
		for (let i = 0; i < line.length; i++) {
			if (Array.isArray(line[i])) {
				if (line[i].length === 1) {
					line[i] = line[i][0];
				} else if (line[i].length === lineValues.length + 1) {
					line[i] = null;
				}
			}
		}

		return [ numSolved, numUnknowns ];
	}

}

module.exports = Solver;


