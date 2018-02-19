(function() {

const nonogrammer = require('../index');
const objtools = require('objtools');
const md5 = require('md5');

function getURLParam(name) {
	let res = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
	return res && res[1] && decodeURIComponent(res[1]);
}

function getURLParamInt(name, def) {
	let res = getURLParam(name);
	if (typeof res !== 'string' || res === '') return def;
	return parseInt(res);
}

function updatePageLayout() {
	let maxTableWidth = 300;
	$('.nonogramTable').each(function() {
		if ($(this).is(':visible')) {
			if ($(this).width() > maxTableWidth) {
				maxTableWidth = $(this).width();
			}
		}
	});
	maxTableWidth += 50;
	$('#pageContainer').css('width', '' + maxTableWidth + 'px');
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
	// Update board size
	let boardElemRows = boardElem.find('tr').length - 1;
	let boardElemCols = boardElem.find('td').length / (boardElemRows + 1) - 1;
	while (boardElemRows < board.rows) {
		let newRowElem = $('<tr>');
		let rowClueCell = $('<td>').addClass('nonogramRowClueCell').data('row', boardElemRows).data('nonoRowClue', true);
		newRowElem.append(rowClueCell);
		for (let col = 0; col < boardElemCols; col++) {
			let cell = $('<td>').addClass('nonogramDataCell').data('row', boardElemRows).data('col', col).data('nonoCell', true);
			newRowElem.append(cell);
		}
		boardElem.find('tr').last().after(newRowElem);
		boardElemRows++;
	}
	while (boardElemRows > board.rows) {
		boardElem.find('tr').last().remove();
		boardElemRows--;
	}
	while (boardElemCols < board.cols) {
		boardElem.find('tr').each(function(idx) {
			let newCell = $('<td>');
			if (idx === 0) {
				// Clue cell
				newCell.addClass('nonogramColClueCell').data('col', boardElemCols).data('nonoColClue', true);
			} else {
				// Data cell
				newCell.addClass('nonogramDataCell').data('row', idx - 1).data('col', boardElemCols).data('nonoCell', true);
			}
			$(this).append(newCell);
		});
		boardElemCols++;
	}
	while (boardElemCols > board.cols) {
		boardElem.find('tr').each(function() {
			$(this).find('td').last().remove();
		});
		boardElemCols--;
	}

	// Update each of the cells
	boardElem.find('td').each(function() {
		let el = $(this);
		let row = el.data('row');
		let col = el.data('col');
		if (row !== undefined) row = parseInt(row);
		if (col !== undefined) col = parseInt(col);
		let isDataCell = el.data('nonoCell');
		let isRowClue = el.data('nonoRowClue');
		let isColClue = el.data('nonoColClue');
		if (row !== undefined && col !== undefined && isDataCell) {
			// Update data cell
			let value = board.get(row, col);
			setBoardCellValue(el, value, palette);
		} else if (row !== undefined && isRowClue) {
			// Update row clue cell
			el.empty();
			for (let clue of board.rowClues[row]) {
				let rowClueSpan = $('<span>').addClass('nonogramRowClue').text('' + clue.run);
				if (palette && palette[clue.value] && palette[clue.value].color) {
					rowClueSpan.css('color', palette[clue.value].color);
				}
				el.append(rowClueSpan);
			}
		} else if (col !== undefined && isColClue) {
			// Update col clue cell
			el.empty();
			for (let clue of board.colClues[col]) {
				let clueDiv = $('<div>').addClass('nonogramColClue').text('' + clue.run);
				if (palette && palette[clue.value] && palette[clue.value].color) {
					clueDiv.css('color', palette[clue.value].color);
				}
				el.append(clueDiv);
			}
		}
	});
}

function makePuzzleUI(board, palette = null) {
	let table = $('<table>').addClass('nonogramTable');
	// Build column clue row
	let columnClueRow = $('<tr>');
	let topLeftSpacer = $('<td>');
	columnClueRow.append(topLeftSpacer);
	for (let colNum = 0; colNum < board.cols; colNum++) {
		let clues = board.colClues[colNum];
		let colClueCell = $('<td>').addClass('nonogramColClueCell').data('col', colNum).data('nonoColClue', true);
		for (let clue of clues) {
			let clueDiv = $('<div>').addClass('nonogramColClue').text('' + clue.run);
			if (palette && palette[clue.value] && palette[clue.value].color) {
				clueDiv.css('color', palette[clue.value].color);
			}
			colClueCell.append(clueDiv);
		}
		columnClueRow.append(colClueCell);
	}
	table.append(columnClueRow);
	// Build other rows
	for (let rowNum = 0; rowNum < board.rows; rowNum++) {
		let rowRow = $('<tr>');
		let rowClueCell = $('<td>').addClass('nonogramRowClueCell').data('row', rowNum).data('nonoRowClue', true);
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
			let cell = $('<td>').addClass('nonogramDataCell').data('row', rowNum).data('col', colNum).data('nonoCell', true);
			setBoardCellValue(cell, value, palette);
			rowRow.append(cell);
		}
		table.append(rowRow);
	}
	return table;
}

let paletteColorSet = [ 'white', 'black', 'red', 'yellow', 'green', 'blue', 'orange', 'purple' ];
let palette = [];

function serializePalette(palette) {
	return palette.map((obj) => {
		return [
			obj.color || '',
			(obj.text && obj.textColor) || '',
			obj.text || ''
		].join('.');
	}).join(',');
}

function deserializePalette(str) {
	let entries = str.split(',');
	let palette = [];
	for (let entryStr of entries) {
		let o = {};
		let parts = entryStr.split('.');
		if (parts[0]) o.color = parts[0];
		else o.color = 'white';
		if (parts[1]) o.textColor = parts[1];
		if (parts[2]) o.text = parts[2];
		for (let idx = 0; idx < paletteColorSet.length; idx++) {
			if (o.color === paletteColorSet[idx]) {
				o.colorIdx = idx;
				break;
			}
		}
		if (o.colorIdx === undefined) {
			o.colorIdx = paletteColorSet.length;
			paletteColorSet.push(o.color);
		}
		palette.push(o);
	}
	return palette;
}

function paletteSelectorAddColor(onChange = null) {
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
		if (onChange) onChange();
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

function resetPaletteSelector(onChange = null) {
	palette = [];
	$('#paletteSelector').empty();
	paletteSelectorAddColor(onChange);
	paletteSelectorAddColor(onChange);
	palette.unknown = { color: 'white' };
}

function initPaletteSelector(callbacks = {}) {
	resetPaletteSelector(callbacks.onChange);
	$('#paletteAddButton').off('click').click(() => {
		paletteSelectorAddColor(callbacks.onChange);
		if (callbacks.onAdd) callbacks.onAdd();
	});
	$('#paletteRemoveButton').off('click').click(() => {
		paletteSelectorRemoveColor();
		if (callbacks.onRemove) callbacks.onRemove();
	});
}

function initResizeSelector(board, boardEl, defaultValue = 0, resizeCb = null) {
	$('#addRowButton').off('click').click(() => {
		board.resize(board.rows + 1, board.cols, defaultValue);
		refreshPuzzleUI(board, boardEl, palette);
		if (resizeCb) resizeCb();
	});
	$('#removeRowButton').off('click').click(() => {
		board.resize(board.rows - 1, board.cols, defaultValue);
		refreshPuzzleUI(board, boardEl, palette);
		if (resizeCb) resizeCb();
	});
	$('#addColButton').off('click').click(() => {
		board.resize(board.rows, board.cols + 1, defaultValue);
		refreshPuzzleUI(board, boardEl, palette);
		if (resizeCb) resizeCb();
	});
	$('#removeColButton').off('click').click(() => {
		board.resize(board.rows, board.cols - 1, defaultValue);
		refreshPuzzleUI(board, boardEl, palette);
		if (resizeCb) resizeCb();
	});
}

let mouseX = 0, mouseY = 0;

function initTrackMouse() {
	$('body').mousemove(function(event) {
		mouseX = event.pageX;
		mouseY = event.pageY;
	});
}

let showingEditCluePopUp = false;

function editCluePopUp(lineClues, cb) {
	if (showingEditCluePopUp) return false;
	let inputEl = $('<input>').attr('type', 'text').attr('size', '20');
	inputEl.css('position', 'absolute');
	inputEl.css('top', '' + mouseY + 'px');
	inputEl.css('left', '' + mouseX + 'px');

	let initStr = lineClues.map((clue) => {
		if (clue.value !== 1) {
			return `${clue.run}/${clue.value}`;
		} else {
			return '' + clue.run;
		}
	}).join(' ');
	inputEl.val(initStr);

	$('body').append(inputEl);
	inputEl.focus();
	inputEl.on('keyup', function(event) {
		if (event.keyCode === 13) {
			let str = inputEl.val();
			inputEl.remove();
			showingEditCluePopUp = false;
			let parts = str.split(/[^0-9\/]+/);
			let clues = [];
			for (let part of parts) {
				if (part) {
					let partParts = part.split('/');
					let value = parseInt(partParts[1] || 1);
					let run = parseInt(partParts[0] || 1);
					clues.push({ value, run });
				}
			}
			cb(clues);
		}
	});
	showingEditCluePopUp = true;
	return true;
}

function initEditBoard(board, boardEl, allowUnknown, allowEditClues, onChange, onClueChange = null) {
	boardEl.find('.nonogramDataCell').off('mousedown').mousedown((event) => {
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

	boardEl.find('.nonogramRowClueCell, .nonogramColClueCell').off('mousedown');
	if (allowEditClues) {

		boardEl.find('.nonogramRowClueCell').click(function() {
			let rowNum = parseInt($(this).data('row'));
			editCluePopUp(board.rowClues[rowNum] || [], (clues) => {
				board.rowClues[rowNum] = clues;
				refreshPuzzleUI(board, boardEl, palette);
			});
		});

		boardEl.find('.nonogramColClueCell').click(function() {
			let colNum = parseInt($(this).data('col'));
			editCluePopUp(board.colClues[colNum] || [], (clues) => {
				board.colClues[colNum] = clues;
				refreshPuzzleUI(board, boardEl, palette);
			});
		});
	}
}

function disableEditBoard(boardEl) {
	boardEl.find('.nonogramDataCell, .nonogramRowClueCell, .nonogramColClueCell').off('mousedown');
}

function boardToKey(board) {
	let keyHex = md5(board.data.join(','));
	let keyBytes = aesjs.utils.hex.toBytes(keyHex);
	return keyBytes;
}

function makePlayLink(board, palette = null, solutionBoard = null) {
	let url = ('' + window.location).split('?')[0];
	url += '?mode=play&puzzle=' + board.serialize();
	if (palette) {
		url += '&palette=' + serializePalette(palette);
	}
	let message = $('#generateMessage').val();
	if (message && solutionBoard) {
		let messageBytes = aesjs.utils.utf8.toBytes(message);
		let keyBytes = boardToKey(solutionBoard);
		let aesCtr = new aesjs.ModeOfOperation.ctr(keyBytes);
		let encBytes = aesCtr.encrypt(messageBytes);
		let encHex = aesjs.utils.hex.fromBytes(encBytes);
		url += '&msg=' + encHex;
	}
	return url;
}

function getSolvedMessage(board) {
	let msgParam = getURLParam('msg');
	if (!msgParam) return 'Solved!';
	let encBytes = aesjs.utils.hex.toBytes(msgParam);
	let keyBytes = boardToKey(board);
	let aesCtr = new aesjs.ModeOfOperation.ctr(keyBytes);
	let message = aesCtr.decrypt(encBytes);
	return aesjs.utils.utf8.fromBytes(message);
}

function initBuilder(allowUnknown, allowEditClues, editCb, clueEditCb) {
	$('#paletteSelectorContainer').show();
	$('#resizeContainer').show();
	$('#puzzleContainer').empty();
	$('#solvedMessage').hide();

	let width = getURLParamInt('w', 5);
	let height = getURLParamInt('h', 5);

	let board = new nonogrammer.Board(height, width);
	board.clearData(allowUnknown ? null : 0);

	let boardEl = makePuzzleUI(board, palette);
	initEditBoard(board, boardEl, allowUnknown, allowEditClues, editCb, clueEditCb);

	initPaletteSelector({
		onRemove() {
			for (let i = 0; i < board.data.length; i++) {
				if (board.data[i] !== null && board.data[i] >= palette.length) {
					board.data[i] = 0;
				}
			}
			board.buildCluesFromData();
			refreshPuzzleUI(board, boardEl, palette);
			updatePageLayout();
		},
		onChange() {
			refreshPuzzleUI(board, boardEl, palette);
			updatePageLayout();
		}
	});
	if (allowUnknown) {
		palette[0] = { color: 'white', textColor: 'grey', text: 'X' };
		palette.unknown = { color: 'white' };
	} else {
		palette[0] = { color: 'white' };
	}

	initResizeSelector(board, boardEl, allowUnknown ? null : 0, () => {
		initEditBoard(board, boardEl, allowUnknown, allowEditClues, editCb, clueEditCb);
		updatePageLayout();
	});

	refreshPuzzleUI(board, boardEl, palette);

	$('#puzzleContainer').append(boardEl);

	updatePageLayout();

	return {
		board,
		boardEl
	};
}

function initSolveMode() {
	$('.pageTitle').text('Nonogram Puzzle Solver');
	showBlurb('solve');

	let builder;
	builder = initBuilder(true, true, (row, col) => {
		refreshPuzzleUI(builder.board, builder.boardEl, palette);
		updatePageLayout();
	}, () => updatePageLayout());
	$('#solveContainer').show();

	$('#solveButton').off('click').click(() => {
		let solutions;
		try {
			solutions = nonogrammer.Solver.findPossibleSolutions(nonogrammer.Solver.partialCopyBoard(builder.board));
		} catch (ex) {
			solutions = [];
		}
		$('#solutionsContainer').empty();
		$('#solutionsHeader').show();
		if (!solutions.length) {
			$('#solutionsContainer').text('No solution.');
		} else {
			let solutionPalette = objtools.deepCopy(palette);
			delete solutionPalette[0].text;
			for (let solution of solutions) {
				let solutionBoardUI = makePuzzleUI(solution, solutionPalette);
				let solutionDiv = $('<div>').addClass('solutionDiv');
				solutionDiv.append(solutionBoardUI);
				$('#solutionsContainer').append(solutionDiv);
			}
		}
		updatePageLayout();
	});

	updatePageLayout();
}

function initBuildMode() {
	$('.pageTitle').text('Nonogram Puzzle Builder');
	showBlurb('build');

	let builder;
	builder = initBuilder(false, false, (row, col) => {
		builder.board.buildCluesFromData();
		refreshPuzzleUI(builder.board, builder.boardEl, palette);
		updatePageLayout();
	});
	$('#generateContainer').show();
	$('#generateButton').off('click').click(() => {
		let difficulty = parseInt($('#generateDifficulty').val());
		if (typeof difficulty !== 'number') difficulty = 3;
		if (difficulty < 1) difficulty = 1;
		if (difficulty > 10) difficulty = 10;
		let buildResult = nonogrammer.Builder.buildPuzzleFromData(builder.board, difficulty);
		let resultPalette = objtools.deepCopy(palette);
		resultPalette.unknown = { color: 'white' };
		resultPalette[0] = { color: 'white', textColor: 'grey', text: 'X' };

		$('#generateLinkContainer').show();
		$('#generateLink').attr('href', makePlayLink(buildResult.board, resultPalette, builder.board));
		let buildResultEl = makePuzzleUI(buildResult.board, resultPalette);
		$('#generatePuzzleContainer').empty().append(buildResultEl);
		console.log('Built puzzle stats', buildResult.stats);
		updatePageLayout();
	});
	updatePageLayout();
}

function initPlayMode() {
	$('.pageTitle').text('Nonogram Puzzle');
	showBlurb('play');

	$('#paletteSelectorContainer').hide();
	$('#puzzleContainer').empty();
	$('#solvedMessage').hide();
	$('#resizeContainer').hide();
	$('#generateContainer').hide();
	$('#solveContainer').hide();

	let width;
	let height;
	let colors;
	let difficulty;

	let puzzleParamStr = getURLParam('puzzle');
	let puzzleParamBoard;

	if (puzzleParamStr) {
		puzzleParamBoard = nonogrammer.Board.deserialize(puzzleParamStr);
		width = puzzleParamBoard.cols;
		height = puzzleParamBoard.rows;
		colors = puzzleParamBoard.getMaxValue();
		difficulty = 3;
	} else {
		width = getURLParamInt('w', 5);
		height = getURLParamInt('h', 5);
		colors = getURLParamInt('colors', 1);
		difficulty = getURLParamInt('difficulty', 3);
	}

	$('#playNextWidth').val('' + width);
	$('#playNextHeight').val('' + height);
	$('#playNextColors').val('' + colors);
	$('#playNextDifficulty').val('' + difficulty);

	let emptyBoard, buildResults;
	if (puzzleParamBoard) {
		emptyBoard = puzzleParamBoard;
	} else {
		let filledBoard = nonogrammer.Board.makeRandomBoard(height, width, colors);
		buildResults = nonogrammer.Builder.buildPuzzleFromData(filledBoard, difficulty);
		emptyBoard = buildResults.board;
	}

	let puzzleBoard = nonogrammer.Solver.partialCopyBoard(emptyBoard);
	if (buildResults) {
		console.log('Created board solution stats: ', buildResults.stats);
	}
	resetPaletteSelector();
	palette[0] = { color: 'white', textColor: 'grey', text: 'X' };

	let paletteParamStr = getURLParam('palette');
	if (paletteParamStr) {
		palette = deserializePalette(paletteParamStr);
	}
	palette.unknown = { color: 'white' };

	let maxValue = emptyBoard.getMaxValue();
	while (palette.length <= maxValue) paletteSelectorAddColor();
	let boardEl = makePuzzleUI(puzzleBoard, palette);

	function checkValid() {
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
			$('#solvedMessageText').text(getSolvedMessage(puzzleBoard));
			$('#solvedMessage').show();
		}
	}

	initEditBoard(puzzleBoard, boardEl, true, false, (row, col) => {
		if (emptyBoard.get(row, col) !== null) return false;
		checkValid();
	});
	$('#puzzleContainer').append(boardEl);
	updatePageLayout();

	window.solveNonogram = function() {
		let solutions = nonogrammer.Solver.findPossibleSolutions(puzzleBoard);
		if (!solutions.length) {
			alert('No solution');
			return;
		}
		for (let i = 0; i < puzzleBoard.data.length; i++) {
			puzzleBoard.data[i] = solutions[0].data[i];
		}
		refreshPuzzleUI(puzzleBoard, boardEl, palette);
		checkValid();
	};
}

function showBlurb(mode) {
	$('.pageBlurb').hide();
	if (mode === 'play') $('#pageBlurbPlay').show();
	else if (mode === 'build') $('#pageBlurbBuild').show();
	else if (mode === 'solve') $('#pageBlurbSolve').show();
}

$(function() {

	//let board = nonogrammer.Board.makeRandomBoard(10, 10, 1);
	//$('body').append(makePuzzleUI(board));
	if (mode === 'play') {
		initPlayMode();
	} else if (mode === 'build') {
		initBuildMode();
	} else if (mode === 'solve') {
		initSolveMode();
	}

	initTrackMouse();

});

})();

