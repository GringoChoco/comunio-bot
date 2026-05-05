// Regressionsfunktion
const regression = (Y, X) => {
  var YMatrix = math.matrix(Y)

  var XMatrix = math.matrix(X)

  var Xtransposed = math.transpose(X)

  var regParams = math.multiply(math.multiply(math.inv(math.multiply(Xtransposed, XMatrix)), Xtransposed), YMatrix)
  return regParams["_data"]
}

//Regression mit Comuniodaten
const comunioRegression = () => {

  //Y und X Arrays unterteilt nach Position vorbereiten
  let Y = {
    keeper: [],
    defender: [],
    midfielder: [],
    striker: []
  };
  let X = {
    keeper: [],
    defender: [],
    midfielder: [],
    striker: []
  };

  //Daten von Firebase laden
  let comunioPlayer = base.getData("comunioPlayer")
  let elo = base.getData("elo")
  let teamStats = base.getData("teamStats")


  for (const [key, value] of Object.entries(comunioPlayer)) {
    
    if (value.points !== undefined && value.quotedprice !== undefined) {

      //Elo Rating zuordnenconst
      teamId = Object.keys(elo).find(key => elo[key].comunioName === value.club);
      if(teamId !== "" && elo[teamId].elo !== undefined) {

        //In Regressions Array einfügen
        Y[value.position].push([parseFloat(value.averagePoints)])
        X[value.position].push(Array(
          1,
          value.quotedprice,
          elo[teamId].elo,
          parseFloat(teamStats[teamId].goals.for.average.total),
          parseFloat(teamStats[teamId].goals.against.average.total)
        ))
        
      }
    }
  }
  
  //Regression und Speicherug der Parameter
  for (const [key, value] of Object.entries(Y)) {
    let comunioRegParams = regression(value, X[key])
    let comunioRegParamsInput = {
      b: comunioRegParams[0],
      quotedprice: comunioRegParams[1],
      elo: comunioRegParams[2],
      goalsFor: comunioRegParams[3],
      goalsAgainst: comunioRegParams[4]
    }
    base.setData("comunioRegParams/" + key, comunioRegParamsInput)
  }

}

//Regression für alle ComunioPlayer durchführen
const estimates = () => {

  //Firebase Daten laden
  let comunioPlayer = base.getData("comunioPlayer")
  let regParamsAll = base.getData("comunioRegParams")
  let elo = base.getData("elo")
  let teamStats = base.getData("teamStats")

  //Loop durch alles comunioPlayer
  for (const [key, value] of Object.entries(comunioPlayer)) {

  //Elo zuordnen
    let teamId = ""
    for (const [key2, value2] of Object.entries(elo)) {
      if (value2.comunioName === value.team) {
        teamId = key2
        break
      }
    }

    //Postition zuordnen
    let position = ""
    switch (value.position) {
      case "Torhüter":
        position = "keeper"
        break;
      case "Abwehr":
        position = "defender"
        break;
      case "Mittelfeld":
        position = "midfielder"
        break;
      case "Stürmer":
        position = "striker"
        break;
    }

    // Regression
    let regParams = regParamsAll[position]
    let psEstimate = (regParams.b[0] + regParams.quotedprice * value.mv + regParams.elo * elo[teamId].elo + regParams.goalsFor * teamStats[teamId].goalsAvg.goalsFor.total + regParams.goalsAgainst * teamStats[teamId].goalsAvg.goalsAgainst.total)
    let fairvalue = ((regParams.b[0] + regParams.elo * elo[teamId].elo + regParams.goalsFor * teamStats[teamId].goalsAvg.goalsFor.total + regParams.goalsAgainst * teamStats[teamId].goalsAvg.goalsAgainst.total - value.averagePoints) / (-regParams.quotedprice))

    Logger.log(value.name + " Estimate.  " + psEstimate + ".   Fairr:  " + fairvalue)

    base.updateData("comunioPlayer/" + key, {
      psEstimate: psEstimate,
      fairvalue: fairvalue
    })

  }

}

const insertComunioRegParams =() => {
  const comunioRegParams = base.getData("comunioRegParams")
  Logger.log(JSON.stringify(comunioRegParams))
  for(const [key, value] of Object.entries(comunioRegParams)) {
    comunioRegParamsRow = {
      position: key,
      b: value.b[0],
      quotedprice: value.quotedprice[0],
      elo: value.elo[0],
      goalsFor: value.goalsFor[0],
      goalsAgainst: value.goalsAgainst[0]
    }
    insertRow(comunioRegParamsRow, "comunioRegParams")
  }

}

