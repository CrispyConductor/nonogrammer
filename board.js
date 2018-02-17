/**
 * This class represents a puzzle board and includes the dimensions (rows and columns),
 * clues, and cell data.  Cell data may or may not include unknowns.  Also supported
 * are color nonograms, where each cell can contain colors other than black.
 *
 * Board data is accessible at the `data` property and is a single-dimensional array
 * of data.  Accessors should be used to access elements.
 *
 * Dimensions are available as the `rows` and `cols` properties.
 *
 * Clues are accessible at the `rowClues` and `colClues` properties.  These are arrays
 * such that the array index corresponds to the number of row or column.  0,0 is at
 * the upper-left of the puzzle.  This array contains arrays of clue objects, where
 * each clue object looks like `{ value: 1, run: 3 }`.  `value` represents the color of
 * the clue, and is always 1 for black-and-white puzzles.  `run` is the count of the clue.
 *
 * Values in the data (and the clues) are represented as numbers.  0 is 'blank', and 1+
 * are cell colors.  The special value `null` can be used in the data (but not in the clues)
 * to represent an unknown cell.
 *
 * @class Board
 * @constructor
 * @param {Number} rows - Number of rows, ie, height
 * @param {Number} cols - Number of columns, ie, width
 */
class Board {

	constructor(rows, cols) {
		if (rows < 2) rows = 2;
		if (cols < 2) cols = 2;
		this.rows = rows;
		this.cols = cols;
		this.clearData(0);
		this.rowClues = [];
		this.colClues = [];
		for (let i = 0; i < this.rows; i++) this.rowClues.push([]);
		for (let i = 0; i < this.cols; i++) this.colClues.push([]);
	}

	/**
	 * Resizes the board
	 *
	 * @method resize
	 * @param {Number} newRows
	 * @param {Number} newCols
	 * @param {Number} defaultValue
	 */
	resize(newRows, newCols, defaultValue = 0) {
		if (newRows < 2) newRows = 2;
		if (newCols < 2) newCols = 2;
		let newData = [];
		for (let row = 0; row < newRows; row++) {
			for (let col = 0; col < newCols; col++) {
				let value;
				if (col < this.cols && row < this.rows) {
					value = this.get(row, col);
				} else {
					value = defaultValue;
				}
				newData[row * newCols + col] = value;
			}
		}
		this.rows = newRows;
		this.cols = newCols;
		this.data = newData;
		this.buildCluesFromData();
	}

	/**
	 * Method to generate random board data.
	 *
	 * @method makeRandomBoard
	 * @static
	 * @param {Number} rows - Number of rows
	 * @param {Number} cols - Number of columns
	 * @param {Number} [values=1] - Number of values, 1 for black-and-white
	 * @param {Number} [density=null] - Density of filled-in cells.  Default is to pick at random between 0.2 and 0.8 .
	 * @return {Board}
	 */
	static makeRandomBoard(rows, cols, values = 1, density = null) {
		if (density === null) density = Math.random() * 0.6 + 0.2;
		let board = new Board(rows, cols);
		for (let i = 0; i < board.data.length; i++) {
			if (Math.random() < density) {
				board.data[i] = Math.floor(Math.random() * values) + 1;
			} else {
				board.data[i] = 0;
			}
		}
		board.buildCluesFromData();
		return board;
	}

	/**
	 * Fills the board data with all of the same value.
	 *
	 * @method clearData
	 * @param {Number} [value=null] - Value to set
	 */
	clearData(value = null) {
		this.data = [];
		for (let i = 0; i < this.rows * this.cols; i++) this.data.push(value);
	}

	/**
	 * Creates a string token that uniquely represents the full state of board data.
	 *
	 * @method makeToken
	 */
	makeToken() {
		return this.data.map((x) => (x === null) ? '?' : x).join(',');
	}

	/**
	 * Take the board data and compute the board clues from it.
	 *
	 * @method buildCluesFromData
	 */
	buildCluesFromData() {
		let { rowClues, colClues } = this._makeCluesFromData(false);
		this.rowClues = rowClues;
		this.colClues = colClues;
	}

	_makeCluesFromData(includeBlanks = false, countUnknownAsBlank = false) {
		let rowClues = [];
		for (let row = 0; row < this.rows; row++) {
			let thisRowClues = [];
			let lastValue = this.get(row, 0);
			if (lastValue === null && countUnknownAsBlank) lastValue = 0;
			let startOfRun = 0;
			for (let col = 1; col <= this.cols; col++) {
				let value = (col === this.cols) ? -1 : this.get(row, col);
				if (value === null && countUnknownAsBlank) value = 0;
				if (value !== lastValue || col === this.cols) {
					if (typeof lastValue !== 'number') throw new Error('Cannot build clues from unknown grid');
					let runLength = col - startOfRun;
					if (lastValue !== 0 || includeBlanks) {
						thisRowClues.push({ value: lastValue, run: runLength });
					}
					lastValue = value;
					startOfRun = col;
				}
			}
			rowClues.push(thisRowClues);
		}

		let colClues = [];
		for (let col = 0; col < this.cols; col++) {
			let thisColClues = [];
			let lastValue = this.get(0, col);
			if (lastValue === null && countUnknownAsBlank) lastValue = 0;
			let startOfRun = 0;
			for (let row = 1; row <= this.rows; row++) {
				let value = (row === this.rows) ? -1 : this.get(row, col);
				if (value === null && countUnknownAsBlank) value = 0;
				if (value !== lastValue || row === this.rows) {
					let runLength = row - startOfRun;
					if (lastValue !== 0 || includeBlanks) {
						thisColClues.push({ value: lastValue, run: runLength });
					}
					lastValue = value;
					startOfRun = row;
				}
			}
			colClues.push(thisColClues);
		}

		return { rowClues, colClues };
	}

	/**
	 * Returns true if there are no unknowns
	 *
	 * @method isComplete
	 * @return {Boolean}
	 */
	isComplete() {
		for (let value of this.data) {
			if (value === null) return false;
		}
		return true;
	}

	/**
	 * Checks for a valid solution.  Returns true if valid.
	 *
	 * @method validate
	 * @return {Boolean}
	 */
	validate(countUnknownAsBlank = false) {
		let { rowClues, colClues } = this._makeCluesFromData(false, countUnknownAsBlank);
		for (let row = 0; row < this.rows; row++) {
			if (rowClues[row].length !== this.rowClues[row].length) return false;
			for (let i = 0; i < rowClues[row].length; i++) {
				if (
					rowClues[row][i].value !== this.rowClues[row][i].value ||
					rowClues[row][i].run !== this.rowClues[row][i].run
				) return false;
			}
		}
		for (let col = 0; col < this.cols; col++) {
			if (colClues[col].length !== this.colClues[col].length) return false;
			for (let i = 0; i < colClues[col].length; i++) {
				if (
					colClues[col][i].value !== this.colClues[col][i].value ||
					colClues[col][i].run !== this.colClues[col][i].run
				) return false;
			}
		}
		return true;
	}

	// 0 is blank, 1+ are colors, null is unknown
	get(row, col) {
		if (row >= this.rows || col >= this.cols) throw new Error('Out of bounds');
		return this.data[row * this.cols + col];
	}

	set(row, col, value) {
		if (row >= this.rows || col >= this.cols) throw new Error('Out of bounds');
		this.data[row * this.cols + col] = value;
	}

	getRow(row) {
		let ar = Array(this.cols);
		for (let i = 0; i < this.cols; i++) ar[i] = this.get(row, i);
		return ar;
	}

	getCol(col) {
		let ar = Array(this.rows);
		for (let i = 0; i < this.rows; i++) ar[i] = this.get(i, col);
		return ar;
	}

	setRow(row, line) {
		for (let i = 0; i < this.cols; i++) this.set(row, i, line[i]);
	}

	setCol(col, line) {
		for (let i = 0; i < this.rows; i++) this.set(i, col, line[i]);
	}

	/**
	 * Computes and returns the maximum value present across clues and data.
	 *
	 * @method getMaxValue()
	 * @return {Number}
	 */
	getMaxValue() {
		let maxValue = 0;
		for (let i = 0; i < this.data.length; i++) {
			if (typeof this.data[i] === 'number' && this.data[i] > maxValue) maxValue = this.data[i];
		}
		for (let clues of [ this.rowClues, this.colClues ]) {
			for (let rcClues of clues) {
				for (let clue of rcClues) {
					if (clue.value > maxValue) maxValue = clue.value;
				}
			}
		}
		return maxValue;
	}

	/**
	 * Prints to the console a textual representation of this board.
	 *
	 * @method printBoard
	 * @param {String} [blankStr='X'] - Character to use for blank cells
	 * @param {String} [unknownStr=' '] - Character to use for unknown cells
	 */
	printBoard(blankStr = 'X', unknownStr = ' ') {
		let maxValue = this.getMaxValue();

		function clueStr(clue) {
			if (maxValue > 1) {
				return `${clue.run}(${clue.value})`;
			} else {
				return '' + clue.run;
			}
		}

		function valStr(value) {
			if (typeof value !== 'number') return unknownStr;
			if (value === 0) return blankStr;
			return '' + value;
		}

		function padStr(str, len, padStyle = 'left') {
			let padding = '';
			let padLen = len - str.length;
			for (let i = 0; i < padLen; i++) {
				padding += ' ';
			}
			if (padStyle === 'left') {
				return padding + str;
			} else if (padStyle === 'right') {
				return str + padding;
			} else {
				padding = padding.slice(0, Math.floor(padLen / 2));
				return padStr(str + padding, len, 'left');
			}
		}

		function padTo(value, len) {
			return padStr(valStr(value), len, 'center');
		}

		let maxCellLength = 1;
		for (let i = 0; i < this.data.length; i++) {
			let str = valStr(this.data[i]);
			if (str.length > maxCellLength) maxCellLength = str.length;
		}
		for (let col = 0; col < this.colClues.length; col++) {
			for (let i = 0; i < this.colClues[col].length; i++) {
				let str = clueStr(this.colClues[col][i]);
				if (str.length > maxCellLength) maxCellLength = str.length;
			}
		}

		let maxNumColClues = 0;
		for (let i = 0; i < this.colClues.length; i++) {
			if (this.colClues[i].length > maxNumColClues) maxNumColClues = this.colClues[i].length;
		}

		const rowSeparator = '-';
		const colSeparator = ' | ';
		const rowClueSpacing = ' ';
		const clueColSeparator = ' | ';
		const clueRowSeparator = '+';

		// Generate row clues
		let rowClueStrs = [];
		let maxRowClueStrLen = 0;
		for (let row = 0; row < this.rowClues.length; row++) {
			let thisRowClues = this.rowClues[row];
			let thisRowClueStr = '';
			for (let i = 0; i < thisRowClues.length; i++) {
				if (i > 0) thisRowClueStr += rowClueSpacing;
				thisRowClueStr += clueStr(thisRowClues[i]);
			}
			if (thisRowClueStr.length > maxRowClueStrLen) maxRowClueStrLen = thisRowClueStr.length;
			rowClueStrs.push(thisRowClueStr);
		}
		// Pad rowClueStrs and add separator
		for (let row = 0; row < rowClueStrs.length; row++) {
			rowClueStrs[row] = padStr(rowClueStrs[row], maxRowClueStrLen) + clueColSeparator;
		}

		const printRowSeparatorLine = (c) => {
			let str = '';
			let len = maxRowClueStrLen + this.cols * (maxCellLength + colSeparator.length);
			for (let i = 0; i < len; i++) str += c;
			console.log(str);
		};

		// Print column clue rows
		for (let colClueRowNum = 0; colClueRowNum < maxNumColClues; colClueRowNum++) {
			let colClueRowStr = padStr('', maxRowClueStrLen) + colSeparator;
			for (let col = 0; col < this.colClues.length; col++) {
				if (col !== 0) colClueRowStr += colSeparator;
				let thisColClues = this.colClues[col];
				if (colClueRowNum < maxNumColClues - thisColClues.length) {
					colClueRowStr += padStr('', maxCellLength);
				} else {
					let clue = thisColClues[colClueRowNum - (maxNumColClues - thisColClues.length)];
					colClueRowStr += padStr(clueStr(clue), maxCellLength);
				}
			}
			console.log(colClueRowStr);
		}

		// Print data rows
		for (let row = 0; row < this.rows; row++) {
			printRowSeparatorLine(row === 0 ? clueRowSeparator : rowSeparator);
			let rowStr = '';
			rowStr += rowClueStrs[row];
			for (let col = 0; col < this.cols; col++) {
				if (col > 0) rowStr += colSeparator;
				rowStr += padTo(this.get(row, col), maxCellLength);
			}
			console.log(rowStr);
		}
	}

	serialize() {
		function serializeClues(lineClues) {
			return lineClues.map((clues) => {
				return clues.map((clue) => {
					return `${clue.value}x${clue.run}`;
				}).join('.');
			}).join(',');
		}
		return [
			this.rows,
			this.cols,
			serializeClues(this.rowClues),
			serializeClues(this.colClues),
			this.data.map((val) => {
				return val === null ? 'x' : val;
			}).join(',')
		].join('|');
	}

	static deserialize(str) {
		function deserializeClues(str) {
			let lines = str.split(',');
			return lines.map((lineStr) => {
				if (lineStr === '') return [];
				let clues = lineStr.split('.');
				return clues.map((clueStr) => {
					let clueParts = clueStr.split('x');
					return { value: parseInt(clueParts[0]), run: parseInt(clueParts[1]) };
				});
			});
		}
		let parts = str.split('|');
		let rows = parseInt(parts[0]);
		let cols = parseInt(parts[1]);
		let board = new Board(rows, cols);
		board.rowClues = deserializeClues(parts[2]);
		board.colClues = deserializeClues(parts[3]);
		board.data = parts[4].split(',').map((str) => {
			return (str === 'x') ? null : parseInt(str);
		});
		return board;
	}

}

module.exports = Board;


