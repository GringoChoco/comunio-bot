//Get Funktion
function doGet() {
  sendMessage("Jemand ist auf deine Seite gegangen");
  return HtmlService.createHtmlOutput("Kein Get Programmiert");
}

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

const getComunioPlayerByID = (id = 33630) => {
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
  //let backUpData = base.getData("comunioPlayer");
  //let backUpData = base.getData("teamStats");
  //base.setData("comunioPlayer202526", backUpData) 
  //base.setData("teamStat202526", backUpData)
};
