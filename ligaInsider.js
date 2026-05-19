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
  // Arrays for Expected Lineup vs Actual Game Day Lineup
  let currentLineUpArray = [];
  let currentGameDayArray = [];

  // Regexes
  let safeRegEx = new RegExp(/<div class="player_position_photo"[^>]*><a href="\/(.*?)(?=_)/gs);
  let firstRegEx = new RegExp(/sub_child" style="display:\s*block.*?href="\/(.*?)_/gs);
  let secondRegEx = new RegExp(/sub_child" style="display:\s*none.*?href="\/(.*?)_/gs);

  // We will store the HTML of teams currently playing to detect bench players later
  let playingTeamsHtml = "";

  // Loop through teams
  for (let j = 0; j < teamURIs.length; j++) {
    let urlLI = "https://www.ligainsider.de/" + teamURIs[j];
    let htmlContent = UrlFetchApp.fetch(urlLI).getContentText();

    let isMatchGoingOn = htmlContent.includes('class="team_title_area"');

    if (isMatchGoingOn) {
      playingTeamsHtml += htmlContent; // Save HTML of active matches
    }

    // Helper to run regex and push to the correct array
    const extractPlayers = (regex, targetArray, propertyName, role) => {
      const matches = Array.from([...htmlContent.matchAll(regex)]);
      for (let i = 0; i < matches.length; i++) {
        let playerString = matches[i][1].split("-").join(" ");
        targetArray.push({
          ligaInsiderName: playerString,
          [propertyName]: role
        });
      }
    };

    // If match is going on, dump into GameDay. Otherwise, dump into LineUp.
    if (isMatchGoingOn) {
      extractPlayers(safeRegEx, currentGameDayArray, "gameDay", "safe");
      extractPlayers(firstRegEx, currentGameDayArray, "gameDay", "first");
      extractPlayers(secondRegEx, currentGameDayArray, "gameDay", "second");
    } else {
      extractPlayers(safeRegEx, currentLineUpArray, "lineUp", "safe");
      extractPlayers(firstRegEx, currentLineUpArray, "lineUp", "first");
      extractPlayers(secondRegEx, currentLineUpArray, "lineUp", "second");
    }
  }

  // Dump expected lineup into firebase
  base.setData("currentLineUp", currentLineUpArray);
  // Optional: You can also dump the actual game day array to firebase here if needed
  // base.setData("currentGameDay", currentGameDayArray); 

  // Load all comunio players
  let comunioPlayer = base.getData("comunioPlayer");

  // Step 1: Transform Arrays into lookup objects
  const lineUpLookup = currentLineUpArray.reduce((acc, { ligaInsiderName, lineUp }) => {
    acc[ligaInsiderName] = lineUp;
    return acc;
  }, {});

  const gameDayLookup = currentGameDayArray.reduce((acc, { ligaInsiderName, gameDay }) => {
    acc[ligaInsiderName] = gameDay;
    return acc;
  }, {});

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

    // Format the name as it appears in the LigaInsider URL to check if their team is playing
    let urlFormattedName = player.ligaInsiderName.split(" ").join("-");
    
    // If the player's profile URL snippet exists in active match HTML, their team is currently playing
    let isTeamPlaying = playingTeamsHtml.includes('href="/' + urlFormattedName + '_');

    if (isTeamPlaying) {
      // Set the actual game result (safe, first, second, or bench)
      // We DO NOT change player.lineUp here.
      player.gameDay = gameDayLookup[player.ligaInsiderName] || "bench";
    } else {
      // Set the expected lineup (safe, first, second, or bench)
      player.lineUp = lineUpLookup[player.ligaInsiderName] || "bench";
      
      // Optional: Clear out gameDay if the team is no longer playing
      // player.gameDay = null; 
    }
  }

  // Save back to firebase
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
