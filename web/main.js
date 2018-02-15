const nonogrammer = require('../index');

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
		for (let value of rowData) {
			let cell = $('<td>').addClass('nonogramDataCell');
			let paletteObj = palette && palette[value === null ? 'unknown' : value];
			if (paletteObj && paletteObj.text) {
				cell.text(paletteObj.text);
			} else if (!paletteObj && value === null) {
				cell.text('?');
			}
			if (paletteObj && paletteObj.textColor) {
				cell.css('color', paletteObj.textColor);
			} else if (value === null) {
				cell.css('color', 'red');
			}
			if (paletteObj && paletteObj.color) {
				cell.css('background-color', paletteObj.color);
			} else if (value > 0) {
				cell.css('background-color', 'black');
			} else {
				cell.css('background-color', 'white');
			}
			if (value === 1) cell.css('background-color', 'black');
			rowRow.append(cell);
		}
		table.append(rowRow);
	}
	return table;
}

$(function() {

let board = nonogrammer.Board.makeRandomBoard(10, 10, 1);

$('body').append(makePuzzleUI(board));

});

