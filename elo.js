//Elo Rating

const getElo = () => {
  let eloURL = "api.clubelo.com/";
  let eloDate = getAPIDate();
  var response = UrlFetchApp.fetch(eloURL + eloDate);
  let currentElo = base.getData("elo");
  for (const [key, value] of Object.entries(currentElo)) {
    Logger.log(value.eloName);
    let teamEloRegExpTerm = "(" + value.eloName + ",GER,)(.*?)(,)(.*?)(,)";
    let teamEloRegExp = new RegExp(teamEloRegExpTerm);
    let teamElo = teamEloRegExp.exec(response);
    value["elo"] = teamElo[4];
  }
  base.updateData("elo", currentElo);
  sendMessage("Elo Rating geupdatet!");
};

const getAPIDate = () => {
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, "0");
  var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  var yyyy = today.getFullYear();

  today = yyyy + "-" + mm + "-" + dd;
  return today;
};

const addEloTeam = () => {
  base.updateData("elo/" + 175, {
    eloName: "Hamburg",
    comunioName: "Hamburger SV",
  });
};
