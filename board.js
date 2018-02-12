

class Board {

	constructor(rows, cols) {
		this.rows = rows;
		this.cols = cols;
		this.clearData(0);
		this.buildCluesFromData();
	}

	clearData(value = null) {
		this.data = [];
		for (let i = 0; i < this.rows * this.cols; i++) this.data.push(value);
	}

	buildCluesFromData() {
		this.rowClues = [];
		for (let row = 0; row < this.rows; row++) {
			let thisRowClues = [];
			let lastValue = this.get(row, 0);
			let startOfRun = 0;
			for (let col = 1; col <= this.cols; col++) {
				let value = (col === this.cols) ? -1 : this.get(row, col);
				if (value !== lastValue || col === this.cols) {
					if (typeof lastValue !== 'number') throw new Error('Cannot build clues from unknown grid');
					let runLength = col - startOfRun;
					if (lastValue !== 0) {
						thisRowClues.push({ value: lastValue, run: runLength });
					}
					lastValue = value;
					startOfRun = col;
				}
			}
			this.rowClues.push(thisRowClues);
		}

		this.colClues = [];
		for (let col = 0; col < this.cols; col++) {
			let thisColClues = [];
			let lastValue = this.get(0, col);
			let startOfRun = 0;
			for (let row = 1; row <= this.rows; row++) {
				let value = (row === this.rows) ? -1 : this.get(row, col);
				if (value !== lastValue || row === this.rows) {
					let runLength = row - startOfRun;
					if (lastValue !== 0) {
						thisColClues.push({ value: lastValue, run: runLength });
					}
					lastValue = value;
					startOfRun = row;
				}
			}
			this.colClues.push(thisColClues);
		}
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

	printBoard(blankStr = 'X', unknownStr = ' ') {
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

}

module.exports = Board;


