//Functins für sheets zum  Namen matchen
//=IFERROR(VLOOKUP(B2,comunioPlayer!$A:$J,1,FALSE),IFERROR(VLOOKUP(C2,comunioPlayer!$A:$J,1,FALSE),IFERROR(VLOOKUP(D2,comunioPlayer!$A:$J,1,FALSE))))

function deleteOldPlayers(sheetName = "allPlayer") {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  // Start clearing from the second row (assuming the first row is the header)
  const headerRowNumber = 1;
  const lastRow = sheet.getLastRow();

  // Only proceed if there are rows to clear
  if (lastRow > headerRowNumber) {
    const rowsToDelete = lastRow - headerRowNumber;
    sheet.getRange(headerRowNumber + 1, 1, rowsToDelete, sheet.getLastColumn()).clearContent();
  }
}

// Filter löschen
function clearFilter(sheetName) {
  let Sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (Sheet.getFilter() !== null) Sheet.getFilter().remove();
}

//Filter erstellen
function createFilter(sheetName) {
  let Sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("xChange");
  Sheet.createFilter();
}

// Eine Reihe löschen
function insertRow(rowData, sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  // Get column headers only once
  const columnHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Map rowData to match column order
  const rowValues = columnHeaders.map(header => rowData[header] || ""); // Default to empty if header not found

  // Append the row in one call
  sheet.appendRow(rowValues);
}


const idMatchList = () => {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("player");
  var data = sheet.getDataRange().getValues();
  var dataToImport = {};
  for(var i = 1; i < data.length; i++) {
    if (data[i][7] != "") {
      dataToImport[data[i][7]] = {
      player_id: data[i][0]
    };
    }
  }
  base.setData("idMatch", dataToImport)
}

// Data from Sheet
function writeDataToFirebase() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
    var data = sheet.getDataRange().getValues();
    var dataToImport = {};
    for (var i = 1; i < data.length; i++) {
        dataToImport["hallo"] = {
            hallo: data[i][0],
            numb: data[i][1]  
        };
    }
    //base.updateData("comunioPlayer" + key, dataToImport);
}




const updateComunioPlayer = () => {
  let key = 30755
  let basePlayerRow = {ligaInsiderName: "manuel neuer"}
  base.updateData("comunioPlayer/" + key, basePlayerRow)
}


const getComunioPlayer = (key = 33592) => {
  let comunioPlayerObject = base.getData("comunioPlayer/" + key)
  Logger.log(JSON.stringify(comunioPlayerObject))
}


// Filtern nach "Comuputer" & "myTeam"
function applyFilter(sheetName = "allPlayer") {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);
  
  // Entferne den aktuellen Filter, falls vorhanden
  if (sheet.getFilter() !== null) sheet.getFilter().remove();
  
  // Lege den Filterbereich fest
  var range = sheet.getDataRange();
  var filterRange = range.offset(0, 0, range.getNumRows(), range.getNumColumns()); // Annahme: Die Spalte "owner" ist die vierte Spalte (Spaltenindex 4)
  
  // Füge den Filter hinzu
  var filter = filterRange.createFilter();
  const filterCriteria = SpreadsheetApp.newFilterCriteria().setHiddenValues([
    "Alen A.",
    "Rico",
    "David",
    "Marvin Fmann",
    "Felix",
    "Wasim",
    "Rico",
    "Karim Sabry Stern",
    "Marco Braun",
    "Florian Krumpholz",
    "Fatih"
    ]).build();
  const filtered = filter.setColumnFilterCriteria(4, filterCriteria); // Annahme: Die Spalte "owner" ist die vierte Spalte (Spaltenindex 4)
  
  // Aktualisiere das Tabellenblatt, um den Filter anzuwenden
  SpreadsheetApp.flush();
}

