//Get Funktion
function doGet() {
  sendMessage("Jemand ist auf deine Seite gegangen");
  return HtmlService.createHtmlOutput("Kein Get Programmiert");
}

//Post Funktion
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  getXChangeData(data);
}

const allPlayerInComunioPlayer = () => {
  //let oldData = base.getData("comunioPlayer2021")
  let currentData = base.getData("comunioPlayer");
  for (const [key, value] of Object.entries(currentData)) {
    Logger.log(key + " " + value.name);
    if (value.trend == "Unbekannt<") {
      //base.removeData("comunioPlayer/" + key)
      Logger.log("Removed: " + value.name + " from " + value.team);
    }
  }
};

//Gespeicherte Spieler zählen
const comunioPlayerCounter = () => {
  var comunioPlayer = base.getData("comunioPlayer");
  let comunioPlayerCount = 0;
  for (let i in comunioPlayer) {
    comunioPlayerCount++;
  }
  Logger.log(comunioPlayerCount);
  sendMessage(
    "Insgesamt gespeicherte Spieler in comunioPlayer: " + comunioPlayerCount,
    566125713,
  );
};

// Funktion für wöchentlichen Chronjob
const weeklyUpdate = () => {
  getElo();
  getTeamStats();
};

//Welche Teams gibt es?
const getTeams = () => {
  let allTeams = base.getData("teams");
  let i = 1;
  for (const [key, value] of Object.entries(allTeams)) {
    Logger.log(value.name);
    Logger.log(i++);
  }
};

const nurMitLIName = () => {
  //let oldData = base.getData("comunioPlayer2023")
  //base.setData("comunioPlayer", {})
  return;
  for (const [key, value] of Object.entries(oldData)) {
    if (value.ligaInsiderName !== undefined) {
      base.updateData("comunioPlayer/" + key, value);
    }
  }
};

const getComunioPlayerByID = (id = 32629) => {
  let player = base.getData("comunioPlayer/" + id);
  Logger.log(JSON.stringify(player));
};

const postOffersTask = () => {
  /*let execute = executeOffers()
  if(execute) {
    optimizeLineup("postOffers", execute, false)
  }*/
  optimizeLineup("postOffers", true, false);
};

const acceptOffersTasks = () => {
  let acceptOffersMode = getAcceptOffersMode();
  optimizeLineup(acceptOffersMode, false, true);
};

const monrningUpdate = () => {
  optimizeLineup("update", false, true);
};

//Daten Backup zu  Saisonende
const backUp = () => {
  let backUpData = base.getData("comunioPlayer");
  //base.setData("comunioPlayer2025", backUpData) //startjahr der Saison
  //base.setData("teamStat2024", backUpData) //startjahr der Saison
};
