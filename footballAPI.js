// API-Football
//api-football.com/documentation#available-releases-v239

const footballUrl = "https://api-football-v1.p.rapidapi.com/v3/";
const options = {
  method: "GET",
  headers: {
    "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
    "x-rapidapi-key": PropertiesService.getScriptProperties().getProperty(
      "API_FOOTBALL_API_KEY",
    ),
  },
};

const season = "2025";
const buli_ID = "78";
const buli2_ID = "79";

const europeTimeZone = "Europe/Berlin"; // Adjust to the desired timezone

const helperRequest = () => {
  let response = UrlFetchApp.fetch(
    footballUrl + "leagues?search=Germany",
    options,
  );
  JSON.parse(response).response.forEach((entry) => {
    Logger.log(entry);
    const leagueId = entry.league.id;
    const leagueName = entry.league.name;

    entry.seasons.forEach((season) => {
      if (season.year === 2024 || season.year === 2025) {
        Logger.log(
          "Year: %s, League ID: %s, League Name: %s",
          season.year,
          leagueId,
          leagueName,
        );
      }
    });
  });
};

const addTeams = () => {
  let response = UrlFetchApp.fetch(
    footballUrl + "teams?league=" + buli2_ID + "&season=" + season,
    options,
  );
  let teams = JSON.parse(response).response;
  //base.setData("teams", {});
  teams.forEach((team) => {
    Logger.log(JSON.stringify(team));
    let teamImport = {};
    teamImport[team.team.id] = team;
    base.updateData("teams", teamImport);
  });
};

const getAllPlayer = () => {
  let allTeams = base.getData("teams");
  base.setData("player", {});
  for (const [key, value] of Object.entries(allTeams)) {
    let response = UrlFetchApp.fetch(
      footballUrl + "players/squad/" + key + "/2020-2021",
      options,
    );
    let players = JSON.parse(response).api.players;
    players.forEach((player) => {
      let playerImport = {};
      playerImport[player.player_id] = player;
      playerImport[player.player_id]["team_id"] = key;
      base.updateData("player", playerImport);
    });
  }

  playerCounter();
};
const playerCounter = () => {
  let allPlayer = base.getData("player");
  let playerCount = 0;
  for (let i in allPlayer) {
    playerCount++;
  }
  sendMessage(
    "Insgesamt gespeicherte Spieler von Football-API: " + playerCount,
    566125713,
  );
};

const getTeamStats = (league = buli_ID, team = null) => {
  if (team === null) {
    let allTeams = base.getData("teams");
    for (const [key, value] of Object.entries(allTeams)) {
      let response = UrlFetchApp.fetch(
        footballUrl +
          "teams/statistics?league=" +
          league +
          "&team=" +
          key +
          "&season=" +
          season,
        options,
      );
      let statistics = sanitizeKeysForFirebase(JSON.parse(response).response);
      if (statistics.fixtures.played.total !== 0) {
        base.updateData("teamStats/" + key, statistics);
        Utilities.sleep(6000); // 6 seconds delay
      }
    }
  } else {
    let response = UrlFetchApp.fetch(
      footballUrl + "statistics/" + league + "/" + team,
      options,
    );
    base.updateData("teamStats/" + team, JSON.parse(response).api.statistics);
  }
  sendMessage("TeamStats geupdatet!");
};

const getOneTeamStats = () => {
  //getTeamStats(buli_ID, 176)
  let key = 157;
  let statistics = { failed_to_score: { total: 1.0, home: 0.0, away: 1.0 } };
  base.updateData("teamStats/" + key, statistics);
};

const executeOffers = (league = buli_ID, seasonYear = season) => {
  let requestDate = getRequestDate(0);
  let response = UrlFetchApp.fetch(
    footballUrl +
      "fixtures?league=" +
      league +
      "&season=" +
      seasonYear +
      "&date=" +
      requestDate +
      "&timezone=" +
      europeTimeZone,
    options,
  );
  let responseDataToday = JSON.parse(response).response;

  if (responseDataToday.length === 0) {
    return true;
  } else {
    requestDate = getRequestDate(-1);
    response = UrlFetchApp.fetch(
      footballUrl +
        "fixtures?league=" +
        league +
        "&season=" +
        seasonYear +
        "&date=" +
        requestDate +
        "&timezone=" +
        europeTimeZone,
      options,
    );
    let responseDataYesterday = JSON.parse(response).response;

    if (responseDataYesterday.length === 0) {
      return false;
    } else {
      if (
        responseDataToday[0].league.round ===
        responseDataYesterday[0].league.round
      ) {
        return true;
      } else {
        return false;
      }
    }
  }
};

const getAcceptOffersMode = (league = buli_ID, seasonYear = season) => {
  let acceptOffersMode = "acceptOffersNonStarter";

  let requestDate = getRequestDate(0);
  let response = UrlFetchApp.fetch(
    footballUrl +
      "fixtures?league=" +
      league +
      "&season=" +
      seasonYear +
      "&date=" +
      requestDate +
      "&timezone=" +
      europeTimeZone,
    options,
  );
  let responseDataToday = JSON.parse(response).response;

  if (responseDataToday.length > 0) {
    let round = responseDataToday[0].league.round;
    requestDate = getRequestDate(-1);
    response = UrlFetchApp.fetch(
      footballUrl +
        "fixtures?league=" +
        league +
        "&season=" +
        seasonYear +
        "&date=" +
        requestDate +
        "&timezone=" +
        europeTimeZone,
      options,
    );
    responseDataYesterday = JSON.parse(response).response;

    if (
      responseDataYesterday.length === 0 ||
      (responseDataYesterday.length > 0 &&
        responseDataYesterday[0].league.round !== round)
    ) {
      acceptOffersMode = "acceptOffersAll";
    }
  }

  // Logger.log(acceptOffersMode)
  return acceptOffersMode;
};

//{"api":{"results":1,"fixtures":[{"fixture_id":1049139,"league_id":5348,"league":{"name":"Bundesliga","country":"Germany","logo":"https:\/\/media.api-sports.io\/football\/leagues\/78.png","flag":"https:\/\/media.api-sports.io\/flags\/de.svg"},"event_date":"2024-04-12T20:30:00+02:00","event_timestamp":1712946600,"firstHalfStart":null,"secondHalfStart":null,"round":"Regular Season - 29","status":"Not Started","statusShort":"NS","elapsed":0,"venue":"WWK Arena","referee":null,"homeTeam":{"team_id":170,"team_name":"FC Augsburg","logo":"https:\/\/media.api-sports.io\/football\/teams\/170.png"},"awayTeam":{"team_id":182,"team_name":"Union Berlin","logo":"https:\/\/media.api-sports.io\/football\/teams\/182.png"},"goalsHomeTeam":null,"goalsAwayTeam":null,"score":{"halftime":null,"fulltime":null,"extratime":null,"penalty":null}}]}}

const getRequestDate = (offset = 0) => {
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + offset);

  // Format the current date and time with timezone
  let requestDate = Utilities.formatDate(
    currentDate,
    europeTimeZone,
    "yyyy-MM-dd",
  );

  return requestDate;
};

function sanitizeKeysForFirebase(data) {
  if (typeof data === "object" && data !== null) {
    if (Array.isArray(data)) {
      // If it's an array, process each element
      return data.map((item) => sanitizeKeysForFirebase(item));
    } else {
      // If it's an object, process its keys and values
      const newObject = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          let newKey = key;

          // 1. Replace specific problematic characters
          if (newKey === "=") {
            newKey = "_equal_";
          } else {
            // 2. Replace dots with underscores (as per original request)
            newKey = newKey.replace(/\./g, "_");
            // 3. Replace any other non-alphanumeric, non-underscore characters with an underscore.
            // This regex [^a-zA-Z0-9_] matches anything NOT a-z, A-Z, 0-9, or underscore.
            newKey = newKey.replace(/[^a-zA-Z0-9_]/g, "_");
          }

          // Ensure the key doesn't start or end with an underscore if it was just special chars
          newKey = newKey.replace(/^_|_$/g, "");
          // Avoid multiple underscores in a row (e.g., "ab--cd" -> "ab_cd")
          newKey = newKey.replace(/__+/g, "_");

          // If after all replacements, the key becomes empty,
          // or is just an underscore, assign a default like 'unknown_key'
          if (newKey === "" || newKey === "_") {
            newKey = "unknown_key";
          }

          newObject[newKey] = sanitizeKeysForFirebase(data[key]);
        }
      }
      return newObject;
    }
  }
  // Return primitive values as they are
  return data;
}
