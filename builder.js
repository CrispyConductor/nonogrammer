const deepCopy = require('objtools').deepCopy;
const Solver = require('./solver');

/**
 * This class contains the logic for building a puzzle, given a desired set of data.
 *
 * This builder does more than just computing clues.  It repeatedly attempts to solve
 * puzzles using methods similar to what a human might use, and attempts to construct
 * a puzzle to given difficulty parameters.  It uses these parameters to determine
 * which cells should be prefilled for an optimal difficulty.  It also ensures
 * solution uniqueness.
 *
 * Because of the method used, the builder can sometimes take time to run.  Limits
 * can be put on the builder's runtime using some of the parameters (those beginning with "max").
 *
 * Available parameters are:
 * - maxSolverBranches - Max number of allowed branches for the recursive solver.  If this is set
 *     to 0, only puzzles that can be solved analytically row-by-row are generated.  Nonzero values
 *     indicate the total number of logical "branches" that must be taken when experimenting/brute
 *     forcing values, including dead ends.  This corresponds to an effective worst-case number
 *     of branches a human might have to take when solving.
 * - maxDeadEndDepth - For non-solution branches (ie, dead-ends), the maximum number of branches that
 *     might have to be followed inside of that dead end.  Set to 0 to enforce dead ends to be
 *     determinable using row-by-row logic.
 * - maxDeadEndSteps - The maximum number of row-by-row logical steps required to discover that a
 *     branch is a dead-end.
 * - maxTotalSteps - Worst case total number of row-by-row logical steps required to solve the
 *     puzzle, including following every dead end path.
 * - maxSolutionDepth - The number of forks along the solution path, excepting row-by-row logic.
 *     This is 0 for purely row-by-row puzzles.
 * - targetDeadEnds - Desired number of dead ends in the puzzle
 * - targetTotalSteps - Target number of total steps followed
 * - targetSolutionDepth - Target depth of solution
 * - numPuzzleIterations - The builder will try this number of random puzzle configurations, and
 *     pick the one that most optimally fits the targets.  This can be set to 1 to use the first
 *     random puzzle selected.
 *
 * @class Builder
 * @constructor
 * @param {Board} board - Board containing data (no unknowns).
 * @param {Object} [params]
 */
class Builder {

	constructor(board, params = {}) {
		this.filledBoard = board;
		board.buildCluesFromData();
		this.setBuilderParams(params);
	}

	/**
	 * This is the main accessor method of the class.  Given a board with filled-in data, and
	 * a difficulty level 1-10, it generates and returns a puzzle board with unknown cells.
	 *
	 * The returned object contains:
	 * - board - The puzzle board
	 * - stats - An object containing various statistics on solution difficulty
	 * - score - A score of how closely the board fits the parameters; lower is better
	 *
	 * @method buildPuzzleFromData
	 * @param {Board} board - The board containing data to generate a puzzle from
	 * @param {Number} level - The difficulty level from 1 to 10
	 * @return {Object}
	 */
	static buildPuzzleFromData(board, level = 3) {
		let builder = new Builder(board, Builder.makeParamsFromDifficulty(level));
		return builder.buildPuzzle();
	}

	setBuilderParams(params = {}) {
		let defaultParams = {
			// Maximum number of times the solver can "branch" when the puzzle can't be simple-solved.
			// Set to 0 to only allow simple-solve puzzles.
			maxSolverBranches: 10,
			// The maximum recursive depth of non-solution paths.  A value of 0 indicates that all dead-end paths must be determinable by simple solve
			maxDeadEndDepth: 0,
			// The maximum number of simple-solve steps allowed for a dead-end path
			maxDeadEndSteps: 3,
			// Max total number of simple solve steps, both for finding solution and for invalidating dead-end paths
			maxTotalSteps: 1000,
			// Max number of branches deep the solution can be; this corresponds to how many times the human solver would get "stuck" solving analytically
			maxSolutionDepth: 3,
			// Try to hit this solution depth
			targetSolutionDepth: 3,
			targetDeadEnds: 2,
			targetTotalSteps: 300,
			numPuzzleIterations: 10
		};
		for (let key in defaultParams) {
			if (params[key] === undefined || params[key] === null) params[key] = defaultParams[key];
		}
		this.params = params;
	}

	/**
	 * Returns the params object associated with a given difficulty level from 1-10.
	 *
	 * @method makeParamsFromDifficulty
	 * @param {Number} level
	 * @return {Object}
	 */
	static makeParamsFromDifficulty(level) {
		if (level < 1) level = 1;
		if (level < 3) {
			return {
				maxSolverBranches: 0,
				maxDeadEndDepth: 0,
				maxDeadEndSteps: 0,
				maxTotalSteps: 100,
				maxSolutionDepth: 0,
				targetSolutionDepth: 0,
				targetDeadEnds: 0,
				targetTotalSteps: level * 10,
				numPuzzleIterations: 2
			};
		} else if (level < 5) {
			return {
				maxSolverBranches: 0,
				maxDeadEndDepth: 0,
				maxDeadEndSteps: 0,
				maxTotalSteps: 1000,
				maxSolutionDepth: 0,
				targetSolutionDepth: 0,
				targetDeadEnds: 0,
				targetTotalSteps: (level - 2) * 100,
				numPuzzleIterations: 2
			};
		} else {
			return {
				maxSolverBranches: 10 * (level - 4),
				maxDeadEndDepth: (level < 8) ? 0 : (level - 7),
				maxDeadEndSteps: (level < 8) ? ((level - 4) * 2) : ((level - 7) * 20),
				maxTotalSteps: 10000 * level,
				maxSolutionDepth: level - 2,
				targetSolutionDepth: level - 4,
				targetDeadEnds: (level - 4) * 2,
				targetTotalSteps: level * 100,
				numPuzzleIterations: 2
			};
		}
	}

	/**
	 * Checks to see if this board is solveable, and returns stats on the solution.
	 * Returns object with solver stats if can be solved, or null if can't be solved within parameters to a unique solution.
	 * Bails out early if the maximums specified in the parameters are hit.
	 *
	 * @method _trySolve
	 * @private
	 * @param {Board}
	 * @return {Object}
	 */
	_trySolve(board) {
		// The basic structure of this method is similar to the corresponding solver method

		// Whether a solution has been found.  Used to check for multiple solutions.
		let foundSolution = false;
		let maxValue = board.getMaxValue();
		let visitedSet = {};

		let numBranches = 0;
		let curTotalSteps = 0;

		// This recursive function returns stats about the current "branch", including:
		// - depth the branch reached
		// - The number of simple solve steps used in the branch (total steps for both exhausting all dead ends and solving)
		// - Whether or not the branch ended in a solution
		const findSolutionsFromState = (solver) => {

			// Make all simple-solve steps possible
			let simpleSolveResult = solver.simpleSolveBatch();

			// Check if this branch is a dead end
			if (simpleSolveResult.contradiction) {
				return {
					maxDepth: 0,
					steps: simpleSolveResult.steps,
					deadEnds: 1,
					solution: false
				};
			}

			// Check if this branch has been visited before
			let token = solver.board.makeToken();
			if (visitedSet[token]) return visitedSet[token];

			// Early bail if hit max total steps
			curTotalSteps += simpleSolveResult.steps;
			if (curTotalSteps > this.params.maxTotalSteps) throw new Error('hit max total steps');

			// If the solution is complete ...
			if (simpleSolveResult.remainingUnknowns === 0) {
				// Make sure solution matches the desired one
				let mismatchedIndexes = [];
				for (let i = 0; i < solver.board.data.length; i++) {
					if (solver.board.data[i] !== this.filledBoard.data[i]) {
						mismatchedIndexes.push(i);
					}
				}
				if (mismatchedIndexes.length) {
					let err = new Error('wrong/ambiguous solution');
					err.mismatchedIndexes = mismatchedIndexes;
					throw err;
				}
				if (foundSolution) throw new Error('non-unique solution');
				foundSolution = true;
				let result = {
					maxDepth: 0,
					steps: simpleSolveResult.steps,
					deadEnds: 0,
					solution: true,
					solutionDepth: 0
				};
				visitedSet[token] = deepCopy(result);
				visitedSet[token].cached = true;
				return result;
			}

			numBranches++;
			if (numBranches > this.params.maxSolverBranches) throw new Error('hit max branches');

			let itMaxDepth = 0;
			let itSolveSteps = simpleSolveResult.steps;
			let itSolution = false;
			let itDeadEnds = 0;
			let itSolutionDepth;

			// Find first unknown
			let foundUnknown = false;
			for (let row = 0; row < solver.board.rows; row++) {
				for (let col = 0; col < solver.board.cols; col++) {
					let value = solver.board.get(row, col);
					if (value === null) {
						// Try it with this unknown being each of the possible values
						for (let possibleValue = 0; possibleValue <= maxValue; possibleValue++) {
							solver.board.set(row, col, possibleValue);
							let res = findSolutionsFromState(solver.partialDup());
							if (res.solution) {
								itSolution = true;
								itSolutionDepth = res.solutionDepth;
							}
							if (res.maxDepth > itMaxDepth) itMaxDepth = res.maxDepth;
							if (!res.cached) itSolveSteps += res.steps;
							if (!res.solution) {
								// This path was a dead end
								if (res.maxDepth > this.params.maxDeadEndDepth) throw new Error('hit max dead end depth');
								if (res.steps > this.params.maxDeadEndSteps) throw new Error('hit max dead end steps');
								if (!res.cached) itDeadEnds++;
							}
							solver.board.set(row, col, null);
						}
						foundUnknown = true;
						break;
					}
				}
				if (foundUnknown) break;
			}

			let result = {
				maxDepth: itMaxDepth + 1,
				steps: itSolveSteps,
				solution: itSolution,
				deadEnds: itDeadEnds,
				solutionDepth: (itSolutionDepth === undefined) ? undefined : (itSolutionDepth + 1)
			};
			visitedSet[token] = deepCopy(result);
			visitedSet[token].cached = true;
			return result;
		};

		let res = findSolutionsFromState(new Solver(Solver.partialCopyBoard(board)));
		if (!res.solution) throw new Error('Tried to solve unsolvable puzzle');
		if (res.solutionDepth > this.params.maxSolutionDepth) throw new Error('hit max solution depth');
		if (res.steps > this.params.maxTotalSteps) throw new Error('hit max total steps');

		return res;
	}

	/**
	 * Starts filling in random cells of the puzzle, trying to solve it, and calling
	 * a callback for each.
	 *
	 * @method _tryRandomPuzzle
	 * @private
	 * @param {Function} puzzleCb
	 */
	_tryRandomPuzzle(puzzleCb) {
		let board = Solver.partialCopyBoard(this.filledBoard);
		board.clearData();
		// Fill in random unknown cells repeatedly
		for (;;) {
			let tryIndexes;
			let tsr;
			try {
				tsr = this._trySolve(board);
			} catch (ex) {
				if (ex.mismatchedIndexes) tryIndexes = ex.mismatchedIndexes;
			}
			if (tsr) {
				let cbRet = puzzleCb(Solver.partialCopyBoard(board), tsr);
				if (cbRet === false) break;
			}
			let simpleSolver = new Solver(Solver.partialCopyBoard(board));
			let { remainingUnknowns, contradiction } = simpleSolver.simpleSolveBatch();
			if (contradiction) throw new Error('got solver contradiction while building puzzle');
			if (tryIndexes && Math.random() < 0.9) {
				let idx = tryIndexes[Math.floor(Math.random() * tryIndexes.length)];
				board.data[idx] = this.filledBoard.data[idx];
			} else if (remainingUnknowns > 1) {
				// Pick random unknown that can't be simple-solved to fill in
				let unknownNo = Math.floor(Math.random() * remainingUnknowns);
				let unknownCtr = 0;
				for (let i = 0; i < board.data.length; i++) {
					if (simpleSolver.board.data[i] === null) {
						if (unknownCtr === unknownNo) {
							board.data[i] = this.filledBoard.data[i];
							break;
						}
						unknownCtr++;
					}
				}
			} else {
				// Pick a random unknown, regardless of if it can be simple-solved or not
				let numUnknowns = 0;
				for (let value of board.data) {
					if (value === null) numUnknowns++;
				}
				let unknownNo = Math.floor(Math.random() * numUnknowns);
				let unknownCtr = 0;
				for (let i = 0; i < board.data.length; i++) {
					if (board.data[i] === null) {
						if (unknownCtr === unknownNo) {
							board.data[i] = this.filledBoard.data[i];
							break;
						}
						unknownCtr++;
					}
				}
			}
			// Make sure there's at least one unknown cell left
			let atLeastOneUnknown = false;
			for (let value of board.data) {
				if (value === null) atLeastOneUnknown = true;
			}
			if (!atLeastOneUnknown) break;
		}
	}

	/**
	 * Generate a score for how close a puzzle solution is to the target stats.
	 *
	 * @method _scoreStats
	 * @private
	 * @param {Object} stats
	 * @param {Board} board
	 * @return {Number}
	 */
	_scoreStats(stats, board) {
		// compare stats.solutionDepth to targetSolutionDepth
		// compare stats.deadEnds to targetDeadEnds
		// compare stats.steps to targetTotalSteps
		let scoreMSE = 0;
		let countMSE = 0;
		function addToScore(stat, target, weight = 1) {
			let percentErr = (target === 0) ? 1 : ((stat - target) / target);
			let sqErr = percentErr * percentErr;
			scoreMSE = ((scoreMSE * countMSE) + sqErr * weight) / (countMSE + weight);
			countMSE++;
		}
		addToScore(stats.solutionDepth, this.params.targetSolutionDepth, 2);
		addToScore(stats.deadEnds, this.params.targetDeadEnds, 2);
		addToScore(stats.steps, this.params.targetTotalSteps, 1.5);
		// Minimize number of prefilled squares
		let numPrefilled = 0;
		for (let value of board.data) {
			if (value !== null) numPrefilled++;
		}
		addToScore(board.rows * board.cols - numPrefilled, board.rows * board.cols, 0.2);
		return scoreMSE;
	}

	/**
	 * Builds a puzzle using the builder parameters.
	 *
	 * @method buildPuzzle
	 * @return {Object}
	 */
	buildPuzzle() {
		let bestScore = null;
		let bestBoard = null;
		let bestStats = null;
		for (let i = 0; i < this.params.numPuzzleIterations; i++) {
			let lastScore = null;
			this._tryRandomPuzzle((board, stats) => {
				let score = this._scoreStats(stats, board);
				if (bestScore === null || score < bestScore) {
					bestScore = score;
					bestStats = stats;
					bestBoard = board;
				}
				if (lastScore !== null && lastScore < score) {
					return false;
				}
				lastScore = score;
				return true;
			});
		}
		return {
			board: bestBoard,
			stats: bestStats,
			score: bestScore
		};
	}
}

module.exports = Builder;

