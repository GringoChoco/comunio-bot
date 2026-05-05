//ligaInsider
// matche die ligainisdernamen mit den comunio ids, speicher die comunioids mit den Ligainsider namen (id match tabelle, oder jeweils bei dem Spielr speichern???)
// integriere es in xChange

// Array of all teams
const teamURIs = [
  "fc-bayern-muenchen/1/",
  "sv-werder-bremen/2/",
  "eintracht-frankfurt/3/",
  "borussia-moenchengladbach/5/",
  //"hertha-bsc/6/",
  "bayer-04-leverkusen/4/",
  "tsg-hoffenheim/10/",
  //"vfl-bochum/11/",
  "vfb-stuttgart/12/",
  //"fc-schalke-04/13/",
  "borussia-dortmund/14/",
  "1-fc-koeln/15/",
  "vfl-wolfsburg/16/",
  "1-fsv-mainz-05/17/",
  "sc-freiburg/18/",
  "fc-augsburg/21/",
  "1-fc-union-berlin/1246/",
  "rb-leipzig/1311/",
  //"sv-darmstadt-98/1267/",
  "1-fc-heidenheim/1259/",
  "fc-st-pauli/20/",
  //"ksv-holstein/1295/",
  "hamburger-sv/9/",
];
//team_title_area

// Alle Spieler von LigaInsider in firebase speichern
function getAllLIPlayer() {
  //Empty Array for all Player
  let allPlayerArray = [];

  //All Player RegEx
  let allPlayerRegEx_all = new RegExp(
    /(?<=left_small_icon"><div class="middle_info"><a href="\/).*?(?=_)/gs,
  );

  // Loop through teams
  for (let j = 0; j < teamURIs.length; j++) {
    //Fetch Content
    let urlLI = "https://www.ligainsider.de/" + teamURIs[j];
    let htmlContent = UrlFetchApp.fetch(urlLI).getContentText();

    //Regex scrape
    const regExPlayerArray = [...htmlContent.matchAll(allPlayerRegEx_all)];

    for (var i = 0; i < regExPlayerArray.length; i++) {
      let playerString = regExPlayerArray[i][0].split("-").join(" ");
      allPlayerArray.push({
        ligaInsiderName: playerString,
        team: teamURIs[j],
      });
    }
  }

  base.setData("allLigaInsiderPlayer", allPlayerArray);
}

// Alle Spieler von Player importieren
const ligaInsiderPlayerToSheet = () => {
  deleteOldPlayers("matchSheetLI"); // Clear old data

  const ligaInsiderPlayer = base.getData("allLigaInsiderPlayer");
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("matchSheetLI");

  if (!ligaInsiderPlayer || Object.keys(ligaInsiderPlayer).length === 0) {
    Logger.log("No data to import.");
    return;
  }

  // Prepare data for bulk insertion
  const rowsToInsert = Object.values(ligaInsiderPlayer).map((value) => [
    value.ligaInsiderName,
    value.team,
  ]);

  // Insert all rows in a single operation
  const startRow = 2; // Assuming row 1 is headers
  const startColumn = 1;
  const rowCount = rowsToInsert.length;
  const columnCount = 2;

  sheet
    .getRange(startRow, startColumn, rowCount, columnCount)
    .setValues(rowsToInsert);
};

// Insert IDs and Names from comnioPlayer to match
function insertIDAndName() {
  clearFilter("matchSheetComunio");
  deleteOldPlayers("matchSheetComunio");
  let comunioPlayer = base.getData("comunioPlayer");
  for (const [key, value] of Object.entries(comunioPlayer)) {
    if (value.ligaInsiderName == undefined) {
      //base.setData("comunioPlayer/"+key, null)
      let playerRow = {
        playerKey: key,
        name: value.name,
        club: value.club,
      };
      insertRow(playerRow, "matchSheetComunio");
    }
  }
}

// Gematchten ligaInsiderNamen in ComunioPlayer updaten
const addLigaInsiderName = () => {
  var sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("matchSheetComunio");
  var data = sheet.getDataRange().getValues();

  // Loop durch Daten
  for (var i = 1; i < data.length; i++) {
    //comunioPlayer updaten, wenn nicht ""
    if (data[i][3] != "") {
      let comunioPlayerObject = { ligaInsiderName: data[i][3] };
      base.updateData("comunioPlayer/" + data[i][0], comunioPlayerObject);
      base.updateData("ligaInsiderNames/" + data[i][0], comunioPlayerObject);
    }
  }
};

// Aktuelles lineup in firebase speichern
function getCurrentLineUp() {
  // Empty array fürs LineUp
  let currentLineUpArray = [];

  //Regexes definieren
  //Starter ohne Sub
  let safeRegEx = new RegExp(
    /<div class="player_position_photo"[^>]*><a href="\/(.*?)(?=_)/gs,
  );

  // Sub aber erste Option
  let firstRegEx = new RegExp(
    /sub_child" style="display:\s*block.*?href="\/(.*?)_/gs,
  );

  // Zweite Optionen
  let secondRegEx = new RegExp(
    /sub_child" style="display:\s*none.*?href="\/(.*?)_/gs,
  );

  // Loop through teams
  for (let j = 0; j < teamURIs.length; j++) {
    //Fetch Content
    let urlLI = "https://www.ligainsider.de/" + teamURIs[j];
    let htmlContent = UrlFetchApp.fetch(urlLI).getContentText();

    //Spieltag nicht berücksichtigen
    if (!htmlContent.includes('class="team_title_area"')) {
      //Regex scrape
      //Starter ohne Sub
      const safeRegExArray = Array.from([...htmlContent.matchAll(safeRegEx)]);

      for (var i = 0; i < safeRegExArray.length; i++) {
        let playerString = safeRegExArray[i][1].split("-").join(" ");
        currentLineUpArray.push({
          ligaInsiderName: playerString,
          lineUp: "safe",
        });
      }

      //First Option
      const firstRegExArray = Array.from([...htmlContent.matchAll(firstRegEx)]);

      for (var i = 0; i < firstRegExArray.length; i++) {
        let playerString = firstRegExArray[i][1].split("-").join(" ");
        currentLineUpArray.push({
          ligaInsiderName: playerString,
          lineUp: "first",
        });
      }

      //Second Option
      const secondRegExArray = Array.from([
        ...htmlContent.matchAll(secondRegEx),
      ]);

      for (var i = 0; i < secondRegExArray.length; i++) {
        let playerString = secondRegExArray[i][1].split("-").join(" ");
        currentLineUpArray.push({
          ligaInsiderName: playerString,
          lineUp: "second",
        });
      }
    }
  }

  //currentLineUp Array in firebase dumpen
  base.setData("currentLineUp", currentLineUpArray);

  //Alle comunioPlayer laden
  let comunioPlayer = base.getData("comunioPlayer");

  // Step 1: Transform currentLineUpArray into a lookup object
  const lookup = currentLineUpArray.reduce(
    (acc, { ligaInsiderName, lineUp }) => {
      acc[ligaInsiderName] = lineUp;
      return acc;
    },
    {},
  );

  // Step 2: Match and enrich comunioPlayer
  for (const key in comunioPlayer) {
    const player = comunioPlayer[key];

    if (!player.ligaInsiderName) {
      let playerRow = {
        playerKey: key,
        name: player.name,
        club: player.club,
      };
      insertRow(playerRow, "matchSheetComunio");
      player.lineUp = "No lIName";
      continue;
    }

    // If ligaInsiderName exists but no match in currentLineUpArray, set lineUp to "bench"
    player.lineUp = lookup[player.ligaInsiderName] || "bench";
  }

  base.updateData("comunioPlayer", comunioPlayer);
}

// Inkorrekte LINamen löschen
const deleteWrongLINames = () => {
  //Alle comunioPlayer laden
  let comunioPlayer = base.getData("comunioPlayer");

  //Alle LIPlayer laden
  let allLigaInsiderPlayer = base.getData("allLigaInsiderPlayer");

  let found = false;
  // Loop durch comunioPlayer um falsche Namen zu finden
  for (const [key, value] of Object.entries(comunioPlayer)) {
    found = false;
    for (let i = 0; i < allLigaInsiderPlayer.length; i++) {
      if (
        !value["ligaInsiderName"] == false &&
        value["ligaInsiderName"] == allLigaInsiderPlayer[i].ligaInsiderName
      ) {
        allLigaInsiderPlayer.splice(i, 1);
        found = true;
        break;
      }
    }
    if (found == false) {
      base.updateData("comunioPlayer/" + key, null);
    }
  }
};

const createLigaInsiderNamesObject = () => {
  // get accessToken
  const accessToken = getAccessToken();

  // Set up squad GET request
  const getOptions = {
    method: "get",
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  };

  // get all player from comunio
  const getResultAllComunioPlayer = UrlFetchApp.fetch(
    "https://www.comunio.de/api/communities/" +
      community +
      "/players?start=0&limit=800",
    getOptions,
  );
  const getAllComunioPlayerData = JSON.parse(getResultAllComunioPlayer);

  //Alle comunioPlayer laden
  let comunioPlayer = base.getData("comunioPlayer");

  getAllComunioPlayerData.tradables.forEach((item) => {
    base.updateData("ligaInsiderNames/" + item.id, {
      ligaInsiderName: comunioPlayer[item.id].ligaInsiderName,
    });
  });
};
