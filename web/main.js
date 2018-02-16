(function() {

const nonogrammer = require('../index');

function getURLParam(name) {
	let res = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
	return res && res[1] && decodeURIComponent(res[1]);
}

function getURLParamInt(name, def) {
	let res = getURLParam(name);
	if (typeof res !== 'string' || res === '') return def;
	return parseInt(res);
}

let mode = getURLParam('mode');
if (mode !== 'solve' && mode !== 'build') mode = 'play';

function setBoardCellValue(cell, value, palette) {
	let paletteObj = palette && palette[value === null ? 'unknown' : value];
	if (paletteObj && paletteObj.text) {
		cell.text(paletteObj.text);
	} else if (!paletteObj && value === null) {
		cell.text('?');
	} else {
		cell.text('');
	}
	if (paletteObj && paletteObj.textColor) {
		cell.css('color', paletteObj.textColor);
	} else if (value === null) {
		cell.css('color', 'red');
	} else {
		cell.css('color', 'black');
	}
	if (paletteObj && paletteObj.color) {
		cell.css('background-color', paletteObj.color);
	} else if (value > 0) {
		cell.css('background-color', 'black');
	} else {
		cell.css('background-color', 'white');
	}
}

function refreshPuzzleUI(board, boardElem, palette) {
	boardElem.find('td').each(function() {
		let el = $(this);
		let row = el.data('row');
		let col = el.data('col');
		if (row !== undefined && col !== undefined) {
			let value = board.get(row, col);
			setBoardCellValue(el, value, palette);
		}
	});
}

function makePuzzleUI(board, palette = null) {
	let table = $('<table>').addClass('nonogramTable');
	// Build column clue row
	let columnClueRow = $('<tr>');
	let topLeftSpacer = $('<td>');
	columnClueRow.append(topLeftSpacer);
	for (let clues of board.colClues) {
		let colClueCell = $('<td>').addClass('nonogramColClueCell');
		for (let clue of clues) {
			let clueDiv = $('<div>').addClass('nonogramColClue').text('' + clue.run);
			if (palette && palette[clue.value] && palette[clue.value].color) {
				clueDiv.css('color', palette[clue.value].color);
			} else {
				clueDiv.css('color', 'black');
			}
			colClueCell.append(clueDiv);
		}
		columnClueRow.append(colClueCell);
	}
	table.append(columnClueRow);
	// Build other rows
	for (let rowNum = 0; rowNum < board.rows; rowNum++) {
		let rowRow = $('<tr>');
		let rowClueCell = $('<td>').addClass('nonogramRowClueCell');
		for (let clue of board.rowClues[rowNum]) {
			let rowClueSpan = $('<span>').addClass('nonogramRowClue').text('' + clue.run);
			if (palette && palette[clue.value] && palette[clue.value].color) {
				rowClueSpan.css('color', palette[clue.value].color);
			}
			rowClueCell.append(rowClueSpan);
		}
		rowRow.append(rowClueCell);
		let rowData = board.getRow(rowNum);
		for (let colNum = 0; colNum < rowData.length; colNum++) {
			let value = rowData[colNum];
			let cell = $('<td>').addClass('nonogramDataCell').data('row', rowNum).data('col', colNum);
			setBoardCellValue(cell, value, palette);
			rowRow.append(cell);
		}
		table.append(rowRow);
	}
	return table;
}

let paletteColorSet = [ 'white', 'black', 'red', 'yellow', 'green', 'blue', 'orange', 'purple' ];
let palette = [];

function paletteSelectorAddColor() {
	if (palette.length >= paletteColorSet.length) return;
	let idx = palette.length;
	palette.push({ color: paletteColorSet[idx], colorIdx: idx });
	let colorSpan = $('<span>').addClass('nonogramPalSelBlock');
	colorSpan.css('background-color', palette[idx].color);
	//$('#paletteSelector').append(colorSpan);
	//palette[idx].el = colorSpan;
	colorSpan.click(function() {
		if (idx === 0) return;
		palette[idx].colorIdx++;
		if (palette[idx].colorIdx >= paletteColorSet.length) palette[idx].colorIdx = 0;
		palette[idx].color = paletteColorSet[palette[idx].colorIdx];
		colorSpan.css('background-color', palette[idx].color);
	});
	let colorSpanPadding = $('<span>').addClass('nonogramPalSelBlockPad');
	colorSpanPadding.append(colorSpan);
	$('#paletteSelector').append(colorSpanPadding);
	palette[idx].el = colorSpanPadding;
}

function paletteSelectorRemoveColor() {
	if (palette.length < 3) return;
	palette.pop().el.remove();
}

function resetPaletteSelector() {
	palette = [];
	$('#paletteSelector').empty();
	paletteSelectorAddColor();
	paletteSelectorAddColor();
	palette.unknown = { color: 'white' };
}

function initPaletteSelector() {
	resetPaletteSelector();
	$('#paletteAddButton').click(paletteSelectorAddColor);
	$('#paletteRemoveButton').click(paletteSelectorRemoveColor);
}

function initEditBoard(board, boardEl, allowUnknown, onChange) {
	boardEl.find('.nonogramDataCell').mousedown((event) => {
		let el = $(event.target);
		let row = parseInt(el.data('row'));
		let col = parseInt(el.data('col'));
		let value = board.get(row, col);
		let newValue = value;
		if (event.which === 1) {
			// left click cycles between colors
			if (value === null) {
				newValue = 1;
			} else if (value === 0 && allowUnknown) {
				newValue = null;
			} else {
				newValue = value + 1;
				if (newValue >= palette.length) {
					newValue = 0;
				}
			}
		} else if (event.which === 3) {
			// right click toggles between unknown and blank
			if (!allowUnknown) return;
			if (value === null) newValue = 0;
			else newValue = null;
		}
		if (newValue !== value) {
			board.set(row, col, newValue);
			let res = onChange(row, col, newValue, value);
			if (res === false) {
				board.set(row, col, value);
			}
			setBoardCellValue(el, board.get(row, col), palette);
		}
	}).on('contextmenu', () => false);
}

function disableEditBoard(boardEl) {
	boardEl.find('.nonogramDataCell').off('mousedown');
}

function initPlayMode() {
	$('#paletteSelectorContainer').hide();
	$('#puzzleContainer').empty();
	$('#solvedMessage').hide();

	let width = getURLParamInt('w', 5);
	let height = getURLParamInt('h', 5);
	let colors = getURLParamInt('colors', 1);
	let difficulty = getURLParamInt('difficulty', 3);

	let filledBoard = nonogrammer.Board.makeRandomBoard(height, width, colors);
	let buildResults = nonogrammer.Builder.buildPuzzleFromData(filledBoard, difficulty);
	let puzzleBoard = nonogrammer.Solver.partialCopyBoard(buildResults.board);
	console.log('Created board solution stats: ', buildResults.stats);
	resetPaletteSelector();
	palette[0] = { color: 'white', textColor: 'grey', text: 'X' };
	let maxValue = filledBoard.getMaxValue();
	while (palette.length <= maxValue) paletteSelectorAddColor();
	let boardEl = makePuzzleUI(puzzleBoard, palette);
	initEditBoard(puzzleBoard, boardEl, true, (row, col) => {
		if (buildResults.board.get(row, col) !== null) return false;
		if (puzzleBoard.validate(true)) {
			// Solved the puzzle
			// Transform all unknowns to blanks, and update the palette
			palette[0] = { color: 'white', text: '' };
			for (let row = 0; row < puzzleBoard.rows; row++) {
				for (let col = 0; col < puzzleBoard.cols; col++) {
					let value = puzzleBoard.get(row, col);
					if (value === null) {
						puzzleBoard.set(row, col, 0);
					}
				}
			}
			refreshPuzzleUI(puzzleBoard, boardEl, palette);
			disableEditBoard(boardEl);
			$('#solvedMessage').show();
		}
	});
	$('#puzzleContainer').append(boardEl);
}

$(function() {

	//let board = nonogrammer.Board.makeRandomBoard(10, 10, 1);
	//$('body').append(makePuzzleUI(board));
	initPaletteSelector();

	if (mode === 'play') {
		initPlayMode();
	}

});

})();

