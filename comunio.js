const userid =
  PropertiesService.getScriptProperties().getProperty("COMUNIO_USERID");
const community =
  PropertiesService.getScriptProperties().getProperty("COMUNIO_COMMUNITY");
const username =
  PropertiesService.getScriptProperties().getProperty("COMUNIO_USERNAME");
const password =
  PropertiesService.getScriptProperties().getProperty("COMUNIO_PASSWORD");
const eventId24 = 391571;
const upgradeDifference = 0.25;
const buffer = 120000;
const preseason = false;
const subs = 3;
const extraPlayer = 1;

// Rule: gekauf - 0.005 nicht gekauft = + 0.001
const offerPriceFactorStriker = 0.515
const offerPriceFactorMidfielder = 0.341
const offerPriceFactorDefender = 0.003
const offerPriceFactorKeeper = 0.001

// postOffers acceptOffersAll acceptOffersNonStarter update
const optimizeLineup = (mode = "update", execute = false, insert = true) => {
  // get accessToken
  let accessToken = getAccessToken();

  // Set up squad GET request
  var getOptions = {
    method: "get",
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  };

  // apiData
  var getResultApi = UrlFetchApp.fetch(
    "https://www.comunio.de/api/",
    getOptions,
  );
  let apiData = JSON.parse(getResultApi.getContentText()).user;

  // Save team data
  let budget = parseFloat(apiData.budget);
  let teamCount = apiData.teamCount;
  let teamValue = apiData.teamValue;
  let points = apiData.points;

  //Define Credit
  let credit = Math.floor(teamValue / 4 + budget);

  let playerData = getPlayerData("withComputer", insert, accessToken);

  let delta30DayTrend = base.getData("delta30DayTrend").delta30DayTrend;

  let squad = [];
  let allPlayer = [];
  let notConsideredMsg = [
    "💲 <b>Zu teuer</b> 💲\nKredit: " + numberWithCommas(credit) + "\n",
  ];
  playerData.forEach((player) => {
    if (player.owner === "Computer") {
      if (
        (player.lineUp === "safe" || player.lineUp === "first") &&
        (player.status == "ACTIVE" || player.status == "WEAKENED")
      ) {
        if (player.offerPrice > credit) {
          notConsideredMsg.push(
            player.name + " | " + numberWithCommas(player.quotedPrice),
          );
        } else {
          allPlayer.push(player);
        }
      }
    } else if (player.owner === "myTeam") {
      allPlayer.push(player);
      squad.push(player);
    }
  });

  // Count Budget Price
  //Define maxMarketValue
  let totalBudget = budget - buffer;

  squad.forEach((player) => {
    // Add correct price to budget
    let budgetPrice =
      player.price !== undefined ? player.price : player.quotedPrice;
    totalBudget = totalBudget + budgetPrice;
  });

  const optimizationFormations = [
    [3, 4, 3],
    [3, 3, 4],
    [2, 5, 3],
    [2, 4, 4],
    [1, 5, 4],
  ];

  let myTeamSolutionAvgPoints = 0;
  let bestMyTeamSolution = {};

  optimizationFormations.forEach((formation) => {
    // LinearOptimizationService
    var engine = LinearOptimizationService.createEngine();

    var constraintPrice = engine.addConstraint(0, totalBudget);
    var constraintStr = engine.addConstraint(
      formation[0] + (subs > 3),
      formation[0] + subs,
    );
    var constraintMid = engine.addConstraint(
      formation[1] + (subs > 4),
      formation[1] + subs,
    );
    var constraintDef = engine.addConstraint(formation[2], formation[2] + subs);
    var constraintKeeper = engine.addConstraint(1, 1);
    var constraintTeam = engine.addConstraint(11 + subs, 11 + subs + extraPlayer);

    squad.forEach((player) => {
      // set binary variable
      engine.addVariable(
        player.name,
        0,
        1,
        LinearOptimizationService.VariableType.INTEGER,
      );

      // Set objective coefficient by ps
      engine.setObjectiveCoefficient(player.name, player.averagePointsCombined);

      // set price coeffcient
      constraintPrice.setCoefficient(
        player.name,
        player.price !== undefined ? player.price : player.quotedPrice,
      );

      //set coeffcient by position
      switch (player.position) {
        case "striker":
          constraintStr.setCoefficient(player.name, 1);
          break;
        case "midfielder":
          constraintMid.setCoefficient(player.name, 1);
          break;
        case "defender":
          constraintDef.setCoefficient(player.name, 1);
          break;
        case "keeper":
          constraintKeeper.setCoefficient(player.name, 1);
          break;
        default:
          break;
      }

      constraintTeam.setCoefficient(player.name, 1)

    });


    // Engine should maximize the objective.
    engine.setMaximization();

    // Solve the linear program
    var solution = engine.solve();

    //return solution
    if (!solution.isValid()) {
      Logger.log("No solution for " + formation);
    } else {
      if (solution.getObjectiveValue() > myTeamSolutionAvgPoints) {
        myTeamSolutionAvgPoints = solution.getObjectiveValue();
        bestMyTeamSolution = solution;
      }
    }
  });

  //Messages
  let strMsg = ["🌪 <b>Im Sturm</b> 🌪\n"];
  let midMsg = ["🕹 <b>Im Mittelfeld</b> 🕹\n"];
  let defMsg = ["🧱 <b>In der Abwehr</b> 🧱\n"];
  let keeperMsg = ["🥅 <b>Im Tor</b> 🥅\n"];
  let benchMsg = [
    "🪑 <b>Auf der Bank</b> 🪑\nBudget: " +
    budget +
    "\nMarket Delta: " +
    numberWithCommas(Math.round(delta30DayTrend)) +
    "\n",
  ];
  let sellMsg = [
    "🏷 <b>Verkaufen</b> (wenn nötig) 🏷\nBudget: " + budget + "\n",
  ];
  let soldMsg = ["🏷 <b>Wurde verkauft</b>\n"];

  if (myTeamSolutionAvgPoints > 0) {
    squad.forEach((player) => {
      let playerMsg =
        "<b>" +
        player.name +
        "</b> | " +
        player.lineUp +
        " | MW: " +
        numberWithCommas(player.quotedPrice) +
        "\n" +
        player.club +
        "\nP/S: " +
        player.averagePoints.toFixed(2) +
        " | Schätzung: " +
        player.psEstimate.toFixed(2) +
        " | Schnitt: " +
        player.averagePointsCombined.toFixed(2) +
        "\n";
      if (player.lineUp === "bench" || player.lineUp === "second") {
        playerMsg =
          playerMsg +
          "❌ <b>NON STARTER</b> ❌\n" +
          'Verkaufen?  <a href="https://www.comunio.de/exchangemarket" target="_blank">Zum Transfermarkt</a>\n';
      } else if (player.lineUp === "No lIName") {
        playerMsg =
          playerMsg +
          "❌ <b>NO LI-NAME</b> ❌\n" +
          'Jetzt hinzufügen: <a href="https://docs.google.com/spreadsheets/d/18Lot2om9wkSaRDZqnBDpp1kbt2mFPGZ6HJ9nF-mX9OI/edit#gid=1869405801" target="_blank">Zum Match Sheet</a>\n';
      }

      player.statusInfo
        ? (playerMsg = playerMsg + player.statusInfo + "\n")
        : "";

      if (bestMyTeamSolution.getVariableValue(player.name) === 1) {
        switch (player.position) {
          case "striker":
            strMsg.push(playerMsg);
            break;
          case "midfielder":
            midMsg.push(playerMsg);
            break;
          case "defender":
            defMsg.push(playerMsg);
            break;
          case "keeper":
            keeperMsg.push(playerMsg);
            break;
          default:
            break;
        }
      } else {
        switch (mode) {
          case "update":
            benchMsg.push(playerMsg);
            break;
          case "acceptOffersNonStarter":
            if (player.lineUp === "bench" || player.lineUp === "No lIName") {
              if (execute === true) {
                if (player.tradableid !== undefined) {
                  let offers = {
                    offers: [
                      {
                        price: player.price,
                        type: "ACCEPT",
                        offerid: player.offerid,
                        tradableid: player.tradableid,
                      },
                    ],
                  };

                  let sold = acceptOffers(offers, accessToken);
                  if (sold === true) soldMsg.push(playerMsg);
                } else {
                  sendMessage(
                    "WARNUNG: kann nicht verkauft werden aber müsste:   " +
                    player.name,
                  );
                }
              }
            } else {
              sellMsg.push(playerMsg);
            }
            break;
          case "acceptOffersAll":
            if (execute === true) {
              if (player.tradableid !== undefined) {
                let offers = {
                  offers: [
                    {
                      price: player.price,
                      type: "ACCEPT",
                      offerid: player.offerid,
                      tradableid: player.tradableid,
                    },
                  ],
                };

                acceptOffers(offers, accessToken);
                soldMsg.push(playerMsg);
              } else {
                sendMessage(
                  "WARUNUNG: kann nicht verkauft werden. Kontostand checken!!!: " +
                  player.name +
                  "  MW: " +
                  player.quotedPrice,
                );
              }
            }
            break;
          default:
            break;
        }
      }
    });
  } else {
    sendMessage(
      "❌ <b>NICHT SPIELFÄHIG</b> ❌\n" +
      'Jetzt aktiv werden: <a href="https://www.comunio.de/exchangemarket" target="_blank">Zum Transfermarkt</a>',
    );
  }

  let allUpgradesMsg = [];
  // linear optimization with Computer
  optimizationFormations.forEach((formation) => {
    // LinearOptimizationService
    var engine = LinearOptimizationService.createEngine();

    var constraintPrice = engine.addConstraint(0, totalBudget);
    var constraintStr = engine.addConstraint(
      formation[0] + (subs > 3),
      formation[0] + subs,
    );
    var constraintMid = engine.addConstraint(
      formation[1] + (subs > 4),
      formation[1] + subs,
    );
    var constraintDef = engine.addConstraint(formation[2], formation[2] + subs);
    var constraintKeeper = engine.addConstraint(1, 1);
    var constraintComputer = engine.addConstraint(1, 1);
    var constraintTeam = engine.addConstraint(11 + subs, 11 + subs + extraPlayer);

    allPlayer.forEach((player) => {
      // set binary variable
      engine.addVariable(
        player.name,
        0,
        1,
        LinearOptimizationService.VariableType.INTEGER,
      );

      // Set objective coefficient by ps
      engine.setObjectiveCoefficient(player.name, player.averagePointsCombined);

      switch (player.owner) {
        case "Computer":
          // set price coeffcient
          constraintPrice.setCoefficient(player.name, player.offerPrice);
          // set Computer coeffcient
          constraintComputer.setCoefficient(player.name, 1);
          break;
        case "myTeam":
          // set price coeffcient
          constraintPrice.setCoefficient(
            player.name,
            player.price !== undefined ? player.price : player.quotedPrice,
          );
          break;
        default:
          break;
      }

      //set coeffcient by position
      switch (player.position) {
        case "striker":
          constraintStr.setCoefficient(player.name, 1);
          break;
        case "midfielder":
          constraintMid.setCoefficient(player.name, 1);
          break;
        case "defender":
          constraintDef.setCoefficient(player.name, 1);
          break;
        case "keeper":
          constraintKeeper.setCoefficient(player.name, 1);
          break;
        default:
          break;
      }

      constraintTeam.setCoefficient(player.name, 1)

    });

    // Engine should maximize the objective.
    engine.setMaximization();

    // Solve the linear program
    var solution = engine.solve();

    //return solution
    if (!solution.isValid()) {
      Logger.log("No solution for " + formation);
    } else {
      if (
        solution.getObjectiveValue() >
        myTeamSolutionAvgPoints + upgradeDifference
      ) {
        let offersArray = [];

        let upgradeMsg = [
          "⭐️⚽️ <b>Upgrade möglich</b> ⚽️⭐️\n" +
          "Punkteschnitt: " +
          solution.getObjectiveValue().toFixed(2) +
          "(> " +
          myTeamSolutionAvgPoints.toFixed(2) +
          ")",
        ];
        let buyMsg = ["💲 <b>zu Kaufen</b> 💲\n"];
        let sellMsg = ["🏷 <b>zu Verkaufen</b> 🏷\n"];
        let postOffersMsg = ["💸 <b>Gebot(e) abgegeben</b> 💸\n"];

        allPlayer.forEach((player) => {
          let playerMsg =
            "<b>" +
            player.name +
            "</b> | " +
            player.lineUp +
            " | MW: " +
            numberWithCommas(player.quotedPrice) +
            "\n" +
            player.club +
            "\nP/S: " +
            player.averagePoints.toFixed(2) +
            " | Schätzung: " +
            player.psEstimate.toFixed(2) +
            " | Schnitt: " +
            player.averagePointsCombined.toFixed(2) +
            "\n";
          if (player.statusInfo != "") {
            playerMsg = playerMsg + player.statusInfo + "\n";
          }
          switch (player.owner) {
            case "Computer":
              if (solution.getVariableValue(player.name) === 1) {
                offersArray.push({
                  price: player.offerPrice,
                  type: "NEW",
                  tradableid: player.id,
                });

                buyMsg.push(playerMsg);
                postOffersMsg.push(playerMsg);
              }
              postOffersMsg;
              break;
            case "myTeam":
              if (solution.getVariableValue(player.name) === 0) {
                sellMsg.push(playerMsg);
              }
            default:
              break;
          }
        });

        allUpgradesMsg.push(upgradeMsg, buyMsg.join("\n"), sellMsg.join("\n"));

        if (mode === "postOffers") {
          if (execute) {
            let offers = { offers: offersArray };
            postOffers(offers, accessToken);
            sendMessage(postOffersMsg.join("\n"));
          }
        }
      }
    }
  });

  switch (mode) {
    case "acceptOffersAll":
    case "acceptOffersNonStarter":
    case "update":
      sendMessage(
        "⚽️ <b>FC UWE Update</b> ⚽️\n\n" +
        teamCount +
        " Spieler | Punkte: " +
        points +
        "\n" +
        "Marktwert: " +
        numberWithCommas(teamValue) +
        "\n" +
        "Cash: " +
        numberWithCommas(budget) +
        " (Kreditrahmen: " +
        numberWithCommas(credit) +
        ")",
      );

      if (strMsg.length > 1) {
        sendMessage(
          "⚽️ <b>Optimierter FC UWE " +
          myTeamSolutionAvgPoints.toFixed(2) +
          " </b> ⚽️",
        );
        sendMessage(strMsg.join("\n"));
        sendMessage(midMsg.join("\n"));
        sendMessage(defMsg.join("\n"));
        sendMessage(keeperMsg.join("\n"));
        if (benchMsg.length > 1) sendMessage(benchMsg.join("\n"));
        if (sellMsg.length > 1) sendMessage(sellMsg.join("\n"));
        if (soldMsg.length > 1) sendMessage(sellMsg.join("\n"));
        if (notConsideredMsg.length > 1)
          sendMessage(notConsideredMsg.join("\n"));
        if (allUpgradesMsg.length > 0) {
          allUpgradesMsg.forEach((msg) => {
            sendMessage(msg);
          });
        }
      }
      break;
  }
};

const postOffers = (
  offers,
  accessToken = "1aa76f120f1ce9a82bdec5af89ba4d6ded13fda6",
) => {
  if (offers === undefined) {
    // Offers Data
    offers = {
      offers: [
        {
          price: 12000000,
          type: "NEW",
          tradableid: 32272,
        },
      ],
    };
  }

  try {
    // Set up the options for the HTTP request
    var postOptions = {
      method: "post",
      headers: {
        Authorization: "Bearer " + accessToken,
      },
      contentType: "application/json",
      payload: JSON.stringify(offers),
    };

    var postResultOffers = UrlFetchApp.fetch(
      "https://www.comunio.de/api/communities/" +
      community +
      "/users/" +
      userid +
      "/offers",
      postOptions,
    );

    let postOffersResponseData = JSON.parse(postResultOffers.getContentText());
    postOffersResponseData.response.forEach((offer) => {
      if (offer.status === "ERROR") {
        sendMessage(
          "🚨🚨<b>Angebot fehlgeschlagen!!!!</b>🚨🚨\n" + JSON.stringify(offer),
        );
      }
    });
    Logger.log(JSON.stringify(postResultOffers.getContentText()));
  } catch (e) {
    sendMessage("🚨🚨<b>postOffers Error!!!!</b>🚨🚨\n" + JSON.stringify(e));
  }
};

const acceptOffers = (
  offers,
  accessToken = "045a7f254398defacfb8cebc25b5b68c84d8b212",
) => {
  if (offers === undefined) {
    offers = {
      offers: [
        {
          price: 168000,
          type: "ACCEPT",
          offerid: 1882753768,
          tradableid: 33396,
        },
      ],
    };
  }

  try {
    // Set up the options for the HTTP request
    let postOptions = {
      method: "post",
      headers: {
        Authorization: "Bearer " + accessToken,
      },
      contentType: "application/json",
      payload: JSON.stringify(offers),
    };

    var postResultOffers = UrlFetchApp.fetch(
      "https://www.comunio.de/api/communities/" +
      community +
      "/users/" +
      userid +
      "/offers",
      postOptions,
    );

    //sendMessage(JSON.stringify(postResultOffers.getContentText()))
  } catch (e) {
    sendMessage(JSON.stringify(e));
  }
};

// matches

const getPlayerData = (
  mode = "withComputer",
  insert = true,
  accessToken = "692e8be1230bf845b6abc0ef4faaf8f72acbbac2",
) => {
  // Set up squad GET request
  var getOptions = {
    method: "get",
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  };

  switch (mode) {
    case "withComputer":
      var getResultXChange = UrlFetchApp.fetch(
        "https://www.comunio.de/api/communities/" +
        community +
        "/users/" +
        userid +
        "/exchangemarket?include=trend,direct",
        getOptions,
      );

      let xChangeData = JSON.parse(getResultXChange.getContentText());

      // get data from firebase
      let elo = base.getData("elo");
      let comunioPlayer = base.getData("comunioPlayer");
      let teamStats = base.getData("teamStats");
      let regParamsAll = base.getData("comunioRegParams");
      let delta30DayTrend = base.getData("delta30DayTrend").delta30DayTrend;
      let delta30DayFactor = delta30DayTrend / 1000 + 175000;

      let xChange = xChangeData.items
        .map((item) => {
          if (
            item._embedded.owner.name === "Computer" &&
            item._embedded.player.club.name !== "Nicht-Bundesligist"
          ) {
            // Add LigaInsider LineUp to Squad
            let playerLineUp = "No lIName";
            if (
              comunioPlayer[item._embedded.player.id] !== undefined &&
              comunioPlayer[item._embedded.player.id].ligaInsiderName !==
              undefined
            ) {
              playerLineUp =
                comunioPlayer[item._embedded.player.id].lineUp !== undefined
                  ? comunioPlayer[item._embedded.player.id].lineUp
                  : "bench";
            }

            let getResultPlayer = UrlFetchApp.fetch(
              "https://www.comunio.de/api/communities/" +
              community +
              "/users/" +
              userid +
              "/players/" +
              item._embedded.player.id,
              getOptions,
            );

            let playerData = JSON.parse(getResultPlayer.getContentText());

            let teamId = 0;
            let teamElo = 0;
            //Elo zuordnen
            for (const [key, value] of Object.entries(elo)) {
              if (value.comunioName === item._embedded.player.club.name) {
                teamElo = value.elo;
                teamId = key;
                break;
              }
            }

            let averagePoints = 0;
            let points = 0;
            if (preseason) {
              playerData.historical.points.forEach((e) => {
                if (e.eventId === eventId24) {
                  points = e.points;
                  averagePoints = points / 34;
                  return; // Stops further iteration
                }
              });
            } else {
              points = item._embedded.player.points;
              averagePoints =
                item._embedded.player.points === "-"
                  ? 0
                  : parseInt(item._embedded.player.points) /
                  playerData.general.ratedGames;
            }

            let regParams = regParamsAll[item._embedded.player.position];
            let psEstimate =
              regParams.b[0] +
              regParams.quotedprice * item._embedded.player.quotedPrice +
              regParams.elo * teamElo +
              regParams.goalsFor * teamStats[teamId].goals.for.average.total +
              regParams.goalsAgainst *
              teamStats[teamId].goals.against.average.total;
            let fairvalue =
              (averagePoints -
                regParams.b[0] -
                regParams.elo * teamElo -
                regParams.goalsFor * teamStats[teamId].goals.for.average.total -
                regParams.goalsAgainst *
                teamStats[teamId].goals.against.average.total) /
              regParams.quotedprice;

            let averagePointsCombined =
              item._embedded.player.points === "-"
                ? (psEstimate + 0) / 2
                : (psEstimate + averagePoints) / 2;

            let offerPrice;

            switch (item._embedded.player.position) {
              case "striker":
                offerPrice = Math.round(
                  item._embedded.player.recommendedPrice +
                  Math.max(
                    101000,
                    delta30DayFactor * offerPriceFactorStriker * psEstimate,
                  ),
                );
                break;
              case "midfielder":
                offerPrice = Math.round(
                  item._embedded.player.recommendedPrice +
                  Math.max(
                    61000,
                    delta30DayFactor *
                    offerPriceFactorMidfielder *
                    psEstimate,
                  ),
                );
                break;
              case "defender":
                offerPrice = Math.round(
                  item._embedded.player.recommendedPrice +
                  Math.max(
                    1000,
                    delta30DayFactor * offerPriceFactorDefender * psEstimate,
                  ),
                );
                break;
              case "keeper":
                offerPrice = Math.round(
                  item._embedded.player.recommendedPrice +
                  Math.max(
                    500,
                    delta30DayFactor * offerPriceFactorKeeper * psEstimate,
                  ),
                );
                break;
              default:
                offerPrice = 0; // Default price if the position doesn't match any case
                break;
            }

            let playerDataObject = {
              id: item._embedded.player.id,
              name: item._embedded.player.name,
              club: item._embedded.player.club.name,
              status: item._embedded.player.status,
              statusInfo: item._embedded.player.statusInfo,
              quotedPrice: item._embedded.player.quotedPrice,
              recommendedPrice: item._embedded.player.recommendedPrice,
              offerPrice: offerPrice,
              fairvalue: fairvalue,
              averagePoints: averagePoints,
              psEstimate: psEstimate,
              averagePointsCombined: averagePointsCombined,
              points: points,
              lastPoints: playerData.lastPoints,
              position: item._embedded.player.position,
              lineUp: playerLineUp,
              trend: item._embedded.player.trend,
              owner: item._embedded.owner.name,
              elo: teamElo,
              goalsFor: teamStats[teamId].goals.for.average.total,
              goalsAgainst: teamStats[teamId].goals.against.average.total,
            };

            base.updateData(
              "comunioPlayer/" + item._embedded.player.id,
              playerDataObject,
            );

            return playerDataObject;
          }
        })
        .filter(Boolean);

    case "myTeam":
      // Make the GET request to the specified URL
      var getResultSquad = UrlFetchApp.fetch(
        "https://www.comunio.de/api/users/" + userid + "/squad?state=lineup",
        getOptions,
      );

      // Save Squad data
      let squadData = JSON.parse(getResultSquad.getContentText());

      const squad = squadData.items
        .map((item) => {
          if (item.club.name !== "Nicht-Bundesligist") {
            let averagePoints = 0;
            let points = 0;
            if (preseason) {
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

              playerData.historical.points.forEach((e) => {
                if (e.eventId === eventId24) {
                  points = e.points;
                  averagePoints = points / 34;
                  return;
                }
              });
            } else {
              points = parseFloat(item.points);
              averagePoints = parseFloat(item.averagePoints);
            }

            let teamId = 0;
            let teamElo = 0;
            //Elo zuordnen
            for (const [key, value] of Object.entries(elo)) {
              if (value.comunioName === item.club.name) {
                teamElo = value.elo;
                teamId = key;
                break;
              }
            }

            let regParams = regParamsAll[item.position];
            let psEstimate =
              regParams.b[0] +
              regParams.quotedprice * item.quotedprice +
              regParams.elo * teamElo +
              regParams.goalsFor * teamStats[teamId].goals.for.average.total +
              regParams.goalsAgainst *
              teamStats[teamId].goals.against.average.total;
            let fairvalue =
              (averagePoints -
                regParams.b[0] -
                regParams.elo * teamElo -
                regParams.goalsFor * teamStats[teamId].goals.for.average.total -
                regParams.goalsAgainst *
                teamStats[teamId].goals.against.average.total) /
              regParams.quotedprice;

            averagePointsCombined =
              item.points === "-"
                ? (psEstimate + 0) / 2
                : (psEstimate + averagePoints) / 2;

            let playerDataObject = {
              id: item.id,
              name: item.name,
              club: item.club.name,
              quotedPrice: item.quotedprice,
              recommendedPrice: item.recommendedprice,
              fairvalue: fairvalue,
              averagePoints: averagePoints,
              psEstimate: psEstimate,
              averagePointsCombined: averagePointsCombined,
              points: points,
              position: item.position,
              lastPoints: item.lastPoints,
              status: item.status,
              statusInfo: item.statusInfo,
              elo: teamElo,
              owner: "myTeam",
              goalsFor: teamStats[teamId].goals.for.average.total,
              goalsAgainst: teamStats[teamId].goals.against.average.total,
            };
            base.updateData("comunioPlayer/" + item.id, playerDataObject);
            return playerDataObject;
          }
        })
        .filter(Boolean);

      // offersData
      var getResultOffers = UrlFetchApp.fetch(
        "https://www.comunio.de/api/communities/" +
        community +
        "/users/" +
        userid +
        "/offers?current",
        getOptions,
      );
      let offersData = JSON.parse(getResultOffers.getContentText());

      // match offers prices to player
      const priceArray = [];
      const idPriceMap = {};

      offersData.items.forEach((item) => {
        let offerid = item.id;
        let tradableid = item.tradable.id;
        let price = item.price;

        // Check if the tradableId is already in the map
        if (
          idPriceMap[tradableid] === undefined ||
          price > idPriceMap[tradableid].price
        ) {
          // If not present or higher price, update the entry in the map
          idPriceMap[tradableid] = { tradableid, price, offerid };
        }
      });

      // Extract the values from the map to the priceArray
      Object.values(idPriceMap).forEach((entry) => {
        priceArray.push({
          tradableid: entry.tradableid,
          price: entry.price,
          offerid: entry.offerid,
        });
      });

      // Update squad array objects with prices from priceArray and count budget and LineUp
      squad.forEach((player) => {
        // Check if there is a corresponding entry in priceArray
        if (idPriceMap[player.id] !== undefined) {
          // Update the player object with the price
          player.price = idPriceMap[player.id].price;
          player.tradableid = idPriceMap[player.id].tradableid;
          player.offerid = idPriceMap[player.id].offerid;
        }

        // Add LigaInsider LineUp to Squad
        let playerLineUp = "No lIName";
        if (
          comunioPlayer[player.id] !== undefined &&
          comunioPlayer[player.id].ligaInsiderName !== undefined
        ) {
          playerLineUp =
            comunioPlayer[player.id].lineUp !== undefined
              ? comunioPlayer[player.id].lineUp
              : "bench";
        }

        player.lineUp = playerLineUp;
      });

      let playerData = [...squad, ...xChange];
      if (insert) {
        // Sheet vorbereiten
        clearFilter("allPlayer");
        deleteOldPlayers("allPlayer");
        playerData.forEach((player) => {
          insertRow(player, "allPlayer");
        });
      }
      return playerData;
    case "xChange":
      let xChangePlayer = getPlayerData("withComputer", false, accessToken);
      let xChangeObj = {
        MW: "335902",
        player: {},
      };
      xChangePlayer.forEach((player) => {
        xChangeObj.player[player.id] = {
          MW: player.price,
          owner: player.owner,
          status: "Fit",
        };
      });
      getXChangeData(xChangeObj);
      break;
    default:
      // Code to execute if mode doesn't match any case
      break;
  }
};

//Tausendertrenner
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getAccessToken() {
  // Set the API endpoint URL
  var apiUrl = "https://www.comunio.de/api/login"; // Replace with your actual API endpoint URL

  // Prepare the data to be sent in the request
  var requestData = {
    username: username,
    password: password,
  };

  // Set up the options for the HTTP request
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(requestData),
  };

  // Make the HTTP request
  var postResponse = UrlFetchApp.fetch(apiUrl, options);

  // Parse the response to get the accessToken
  var accessToken = JSON.parse(postResponse.getContentText()).access_token;
  Logger.log(accessToken);
  return accessToken;
}

const addPlayerToXChange = () => {
  // get accessToken
  let accessToken = getAccessToken();

  // Set up squad GET request
  var getOptions = {
    method: "get",
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  };

  // Make the GET request to the specified URL
  var getResult = UrlFetchApp.fetch(
    "https://www.comunio.de/api/users/" + userid + "/squad",
    getOptions,
  );

  // Save Squad data
  let data = JSON.parse(getResult.getContentText());

  // Map items to create addPlayer item
  let addPlayerItemObject = {
    items: data.items.map((item) => ({
      tradableId: item.id,
      price: item.quotedprice,
    })),
  };

  let addPlayerRequestOptions = {
    method: "POST",
    headers: {
      "content-type": "application/json;charset=UTF-8",
      Authorization: "Bearer " + accessToken,
    },
    payload: JSON.stringify(addPlayerItemObject),
  };

  var postResult = UrlFetchApp.fetch(
    "https://www.comunio.de/api/communities/" +
    community +
    "/users/" +
    userid +
    "/exchangemarket/addplayer",
    addPlayerRequestOptions,
  );

  let addPlayerRsponseData = JSON.parse(postResult.getContentText());

  if (addPlayerRsponseData.status !== "OK") {
    sendMessage(
      "🚨🚨<b>addPlayerToXChange Error!!!!</b>🚨🚨\n" + addPlayerRsponseData,
    );
  } else {
    Logger.log("Response from addPlayer: " + postResult.getContentText());
  }
};
