const getAllComunioPlayer = () => {
  const GAMES_IN_SEASON = 34;

  // get accessToken
  const accessToken = getAccessToken();

  // Set up squad GET request
  const getOptions = {
    method: "get",
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  };

  const getResultAllComunioPlayer = UrlFetchApp.fetch(
    "https://www.comunio.de/api/communities/" +
      community +
      "/players?start=0&limit=800",
    getOptions,
  );
  const getAllComunioPlayerData = JSON.parse(getResultAllComunioPlayer);

  // get data from firebase
  const elo = base.getData("elo");
  const teamStats = base.getData("teamStats");
  const regParamsAll = base.getData("comunioRegParams");
  const ligaInsiderNames = base.getData("ligaInsiderNames");

  //base.removeData("comunioPlayer");
  let comunioPlayer = base.getData("comunioPlayer");

  getAllComunioPlayerData.tradables.forEach((item) => {
    if (comunioPlayer[item.playerId] === undefined) {
      try {
        const {
          id: playerId,
          name,
          club: playerClub,
          quotedprice,
          position,
          lastPoints,
          trend,
          status,
          statusInfo,
          owner,
        } = item;

        let determinedTeamId = "0"; // Default or placeholder if not found
        let determinedTeamElo = 0;

        //Elo zuordnen
        const teamEntry = Object.entries(elo).find(
          ([, teamData]) => teamData.comunioName === playerClub.name,
        );

        if (teamEntry) {
          determinedTeamId = teamEntry[0];
          determinedTeamElo = teamEntry[1].elo;
        } else {
          Logger.log(
            `ELO data not found for club: ${playerClub.name} (player: ${name}). Using default ELO ${determinedTeamElo} and teamId ${determinedTeamId}.`,
          );
        }

        let getResultPlayer = UrlFetchApp.fetch(
          "https://www.comunio.de/api/communities/" +
            community +
            "/users/" +
            userid +
            "/players/" +
            item.id,
          getOptions,
        );
        let playerData = JSON.parse(getResultPlayer.getContentText());

        let points = 0;
        let averagePoints = 0;
        if (preseason) {
          playerData.historical.points.forEach((e) => {
            if (e.eventId === eventId24) {
              points = e.points;
              averagePoints = points / 34;
              return;
            }
          });
        } else {
          points = playerData.totalPoints;
          averagePoints =
            playerData.general.ratedGames > 0
              ? playerData.totalPoints / playerData.general.ratedGames
              : 0;
        }
        const regParams = regParamsAll[position];
        if (!regParams) {
          Logger.log(
            `Regression parameters not found for position: ${position} (player: ${name}). Skipping player.`,
          );
          return; // Skip this player
        }

        const currentTeamClubStats = teamStats[determinedTeamId];

        if (
          !currentTeamClubStats ||
          !currentTeamClubStats.goals ||
          !currentTeamClubStats.goals.for ||
          !currentTeamClubStats.goals.against
        ) {
          Logger.log(
            `Team statistics incomplete or missing for teamId: ${determinedTeamId} (player: ${name}). psEstimate/fairvalue will be null.`,
          );
          // Proceed to save player with null psEstimate/fairvalue
          const playerDataObject = {
            id: playerId,
            name,
            clubId: playerClub.id,
            club: playerClub.name,
            team: playerClub.name,
            quotedprice,
            averagePoints,
            psEstimate: null,
            fairvalue: null,
            points,
            position,
            lastPoints,
            trend,
            status,
            statusInfo,
            ownerId: owner?.id ?? null,
            owner: owner?.name ?? "Computer",
            ligaInsiderName: ligaInsiderNames[item.id]
              ? ligaInsiderNames[item.id].ligaInsiderName
              : null,
          };
          base.updateData(`comunioPlayer/${playerId}`, playerDataObject);
          return; // Skip calculations if stats are bad
        }

        const goalsForAverage = currentTeamClubStats.goals.for.average.total;
        const goalsAgainstAverage =
          currentTeamClubStats.goals.against.average.total;

        const psEstimate =
          regParams.b[0] +
          regParams.quotedprice * quotedprice +
          regParams.elo * determinedTeamElo +
          regParams.goalsFor * goalsForAverage +
          regParams.goalsAgainst * goalsAgainstAverage;

        const fairvalueDenominator = regParams.quotedprice;
        const fairvalue =
          fairvalueDenominator !== 0
            ? (averagePoints -
                regParams.b[0] -
                regParams.elo * determinedTeamElo -
                regParams.goalsFor * goalsForAverage -
                regParams.goalsAgainst * goalsAgainstAverage) /
              fairvalueDenominator
            : null; // Avoid division by zero

        const playerDataObject = {
          id: playerId,
          name,
          clubId: playerClub.id,
          club: playerClub.name,
          quotedprice,
          fairvalue,
          averagePoints,
          psEstimate,
          complementedAveragePoints:
            averagePoints === 0 ? psEstimate : averagePoints,
          points,
          position,
          lastPoints,
          trend,
          status,
          statusInfo,
          ownerId: owner?.id ?? null,
          owner: owner?.name ?? "Computer",
          ligaInsiderName: ligaInsiderNames[item.id]
            ? ligaInsiderNames[item.id].ligaInsiderName
            : null,
        };
        base.updateData(`comunioPlayer/${playerId}`, playerDataObject);
      } catch (error) {
        console.error(
          `Skipping player ${item.id} due to error: ${error.message}`,
        );
        return; // <-- Skip this iteration, continue with the next player
      }
    }
  });
};

// Alle Spieler von Player importieren
const comunioPlayerToSheet = () => {
  deleteOldPlayers("comunioPlayer"); // Clear old data

  const comunioPlayer = base.getData("comunioPlayer");
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("comunioPlayer");

  if (!comunioPlayer || Object.keys(comunioPlayer).length === 0) {
    Logger.log("No data to import.");
    return;
  }

  // Extract column headers
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Prepare data for bulk insertion
  const rowsToInsert = Object.values(comunioPlayer).map((value) => [
    value.name,
    value.club,
    value.position,
    value.lineUp,
    value.quotedprice,
    value.averagePoints,
    value.complementedAveragePoints,
    value.points,
    value.psEstimate,
    value.fairvalue,
    value.lastPoints,
    value.trend,
    value.status,
    value.statusInfo,
    value.owner,
    value.id,
    value.clubId,
  ]);

  // Insert all rows in a single operation
  const startRow = 2; // Assuming row 1 is headers
  const startColumn = 1;
  const rowCount = rowsToInsert.length;
  const columnCount = headers.length;

  sheet
    .getRange(startRow, startColumn, rowCount, columnCount)
    .setValues(rowsToInsert);
};

const offerToOpponent = (opponent = "Snave Rave") => {};
