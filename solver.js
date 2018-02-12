const objtools = require('objtools');
const deepCopy = objtools.deepCopy;

class Solver {

	constructor(board) {
		this.board = board;
	}

	/**
	 * Simple-solves all the rows and columns possible.
	 * Returns object containing:
	 * - steps - Number of simple solve "steps" where each step involves inferring values for one row/col
	 * - remainingUnknowns - Number of remaining unknown cells after simple solve
	 * Or null, if there are no valid solutions.
	 */
	simpleSolveBatch() {
		let numSteps = 0;
		for (;;) {
			let solvedOne = false;
			for (let row = 0; row < this.board.rows; row++) {
				let line = this.board.getRow(row);
				let res = Solver.simpleSolveLine(line, this.board.rowClues[row]);
				if (res === null) {
					//console.log('Could not solve row', row);
					return null;
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
					//console.log('Could not solve col', col);
					return null;
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
			remainingUnknowns: numUnknowns
		};
	}

	/**
	 * Performs any simple solution steps possible given a single row or column.
	 * line - array of values in the row/col
	 * clues - array of clue objects for the row/col
	 * Solves the line in-place.  Returns:
	 *   If no valid solutions: null
	 *   Otherwise: [ numNewlySolvedCells, numRemainingUnknownCells ]
	 */
	static simpleSolveLine(line, clues) {
		// Find all valid solutions for this line, and tabulate which cells are the same across all solutions for this line

		let knownCells = null;
		let length = line.length;

		function trackPossibleLineSolution(curLine) {
			if (!knownCells) {
				knownCells = deepCopy(curLine);
				return;
			}
			for (let i = 0; i < curLine.length; i++) {
				if (curLine[i] !== knownCells[i]) knownCells[i] = null;
			}
		}

		function tryCluePositions(curLine, clueIdx, nextPossibleCluePos) {
			// Case of no clues (row must be all blank)
			if (clues.length === 0) {
				for (let i = 0; i < length; i++) curLine[i] = 0;
				trackPossibleLineSolution(curLine);
				return;
			}

			// Iterate through all possible clue positions
			let clue = clues[clueIdx];
			for (let pos = nextPossibleCluePos; pos < length; pos++) {
				if (line[pos] === 0) {
					// We already know this is a space, so the run can't start here, but might start the next iteration.
					curLine[pos] = 0;
					continue;
				}
				if (line[pos] !== null && line[pos] !== clue.value) {
					// Run can't start here, or later on.
					break;
				}

				// Make sure the run won't overrun the end
				if (pos + clue.run > length) {
					break;
				}

				// Make sure this run at this position is compatible with the rest of the line
				let curCheckPos;
				let foundDefiniteNonBlank = false;
				for (curCheckPos = pos; curCheckPos < pos + clue.run; curCheckPos++) {
					// Make sure this spot either matches the clue or is unknown
					if (line[curCheckPos] !== null && line[curCheckPos] !== 0) {
						foundDefiniteNonBlank = true;
						if (line[curCheckPos] !== clue.value) break;
					} else if (line[curCheckPos] === 0) {
						break;
					}
				}
				if (curCheckPos !== pos + clue.run) {
					// Found a cell at curCheckPos that's incompatible with the clue
					// If any non-blanks have been found, either it's a different value, or an incompatible blank after finding
					// some of the clue's value and no further positions will be valid
					if (foundDefiniteNonBlank) {
						break;
					}
					// Otherwise, we hit a blank, so skip past those blanks
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
				if (pos + clue.run < length && line[pos + clue.run] === clue.value) {
					// Can continue if this position is unknown
					if (line[pos] === null) {
						curLine[pos] = 0;
						continue;
					} else {
						break;
					}
				}

				// If this is the last clue, ensure all remaining cells are blank or unknown
				if (clueIdx === clues.length - 1) {
					let remainingCellsBlank = true;
					for (let i = pos + clue.run; i < length; i++) {
						if (line[i] !== null && line[i] !== 0) { remainingCellsBlank = false; break; }
						curLine[i] = 0;
					}
					if (!remainingCellsBlank) {
						// We can advance if starting position is unknown (could be blank)
						if (line[pos] === null) {
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
					if (pos + clue.run >= length - 1) break;
					// Ensure the next clue is a different value, or there is a space in between
					if (clues[clueIdx + 1].value === clue.value) {
						if (line[pos + clue.run] !== null && line[pos + clue.run] !== 0) {
							// We can advance if starting position is unknown (could be blank)
							if (line[pos] === null) {
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
					let nextNPCP = pos + clue.run;
					if (clues[clueIdx + 1].value === clue.value) {
						// There must be a space in between.  This is validated earlier but needs to be accounted for here.
						nextNPCP++;
					}
					// Recurse and try positions for the next clue
					tryCluePositions(curLine, clueIdx + 1, nextNPCP);
				}

				// We can continue if the starting cell is unknown
				if (line[pos] === null) {
					curLine[pos] = 0;
					continue;
				} else {
					break;
				}
			}
		}

		tryCluePositions(deepCopy(line), 0, 0);

		if (!knownCells) return null;

		let numSolved = 0;
		let numUnknowns = 0;
		for (let i = 0; i < knownCells.length; i++) {
			if (knownCells[i] !== line[i]) {
				if (line[i] !== null) {
					//console.log('line', line);
					//console.log('knownCells', knownCells);
					//console.log('clues', clues);
					throw new Error('Valid line solution contradicts line?');
				}
				line[i] = knownCells[i];
				numSolved++;
			}
			if (line[i] === null) numUnknowns++;
		}

		return [ numSolved, numUnknowns ];
	}

}

module.exports = Solver;




