//Telegram Konstanten
var telegramUrl =
  PropertiesService.getScriptProperties().getProperty("TELEGRAM_URL");
var telegramChatID =
  PropertiesService.getScriptProperties().getProperty("TELEGRAM_CHAT_ID");

//Telegram Bot
function sendMessage(text = "No message provided", chat_id = telegramChatID) {
  var url =
    telegramUrl +
    "sendMessage" +
    "?chat_id=" +
    chat_id +
    "&parse_mode=HTML" +
    "&disable_web_page_preview=True" +
    "&text=" +
    encodeURIComponent(text);
  var response = UrlFetchApp.fetch(url);
}

const setWebhook = () => {
  var url = telegramUrl + "setwebhook?url=" + "hier script url einfügen";
  var res = UrlFetchApp.fetch(url).getContentText();
  Logger.log(res);
};

const getStandings = () => {
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
    "https://www.comunio.de/api/communities/" +
      community +
      "/standings?period=total&wpe=true",
    getOptions,
  );

  let standingsData = JSON.parse(getResult.getContentText());

  let counter = 1;

  let standingsMsg = [];

  // Helper function to format a user's information
  /*const formatUserInfo = (rank, userLink, userName, totalPoints, lastPoints, teamValue, tactic) => 
    `<b>${rank}. Platz - <a href="${userLink}">${userName}</a> 🏅</b>\n` +
    `<b>Punkte:</b> ${totalPoints} 🏆\n` +
    `<b>Letzter Spieltag:</b> ${lastPoints} 🔥\n` +
    `<b>Marktwert:</b> ${teamValue.toLocaleString()} 💶  <b>Formation:</b> ${tactic} ⚽`*/
  const formatUserInfo = (
    rank,
    userLink,
    userName,
    totalPoints,
    lastPoints,
    teamValue,
    tactic,
  ) =>
    `<b>${rank}. <a href="${userLink}">${userName}</a></b> 🏆${totalPoints} 🔥${lastPoints} 💶${teamValue.toLocaleString()} Mio. ⚽${tactic}`;

  // Loop through items and generate the message with HTML markup
  standingsData.items.forEach((item) => {
    const userName = item._embedded.user.name.trim();
    const userLink = item._embedded.user._links.self.href.replace("/api", "");
    const totalPoints = item.totalPoints;
    const lastPoints = item.lastPoints;
    const teamValue = (item._embedded.teamInfo.teamValue / 1000000).toFixed(1);
    const tactic = item._embedded.teamInfo.tactic.split("").join(" | ");

    standingsMsg.push(
      formatUserInfo(
        counter,
        userLink,
        userName,
        totalPoints,
        lastPoints,
        teamValue,
        tactic,
      ),
    );

    counter++;
  });

  sendMessage(standingsMsg.join("\n"));
};

//https:\/\/www.comunio.de\/api\/communities\/2331952\/users\/13743191\/badges

const getTranfers = () => {
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
    "https://www.comunio.de/api/communities/2331952/users/13743190/news?group=true&originaltypes=true&start=0&limit=10",
    getOptions,
  );

  let newsList = JSON.parse(getResult.getContentText()).newsList.groups;
};

function getTradeReport() {
  // get accessToken
  let accessToken = "3e6956713542d220c448b5017178e29640405522"; //getAccessToken()

  // Set up squad GET request
  var getOptions = {
    method: "get",
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  };

  // Make the GET request to the specified URL
  var getResult = UrlFetchApp.fetch(
    "https://www.comunio.de/api/communities/" +
      community +
      "/users/" +
      userid +
      "/news?group=true&originaltypes=true&start=0&limit=10",
    getOptions,
  );

  const newsList = JSON.parse(getResult.getContentText()).newsList;
  Logger.log(newsList);

  const todayStr = "2025-07-16";
  const yesterdayStr = "2025-07-15";

  // Tage, die für "TO_COMPUTER" und "BETWEEN_USERS" berücksichtigt werden
  const daysToProcessForToAndBetween = [
    { dateStr: todayStr, label: "Heute" },
    { dateStr: yesterdayStr, label: "Gestern" },
  ];

  // Hilfsfunktion zur Formatierung eines einzelnen Trades
  const formatTrade = (trade) => {
    const spieler = trade.tradable.name || "N/A";
    const von = trade.from.name || "N/A";
    const an = trade.to.name || "N/A";
    const preis = trade.price ? trade.price.toLocaleString("de-DE") : "N/A";
    return `<i>Spieler:</i> ${spieler}, <i>Von:</i> ${von}, <i>An:</i> ${an}, <i>Preis:</i> ${preis}<br>`;
  };

  // 1. Trades "FROM_COMPUTER" (nur heute)
  let fromComputerHtml = "";
  let fromComputerTradesFound = false;
  if (
    newsList.groups &&
    newsList.groups[todayStr] &&
    newsList.groups[todayStr].entries
  ) {
    const todayEntries = newsList.groups[todayStr].entries;
    for (const entry of todayEntries) {
      if (
        entry.type === "TRANSACTION_TRANSFER" &&
        entry.message &&
        entry.message.FROM_COMPUTER
      ) {
        for (const trade of entry.message.FROM_COMPUTER) {
          if (!fromComputerTradesFound) {
            fromComputerHtml += `<b>Trades vom Computer (Heute):</b><br>`;
            fromComputerTradesFound = true;
          }
          fromComputerHtml += formatTrade(trade);
        }
      }
    }
  }
  if (fromComputerTradesFound) {
    sendMessage(fromComputerHtml);
  }

  // 2. Trades "TO_COMPUTER" (heute und gestern)
  let toComputerHtml = "";
  let toComputerTradesList = [];
  if (newsList.groups) {
    for (const day of daysToProcessForToAndBetween) {
      if (
        newsList.groups[day.dateStr] &&
        newsList.groups[day.dateStr].entries
      ) {
        const entries = newsList.groups[day.dateStr].entries;
        for (const entry of entries) {
          if (
            entry.type === "TRANSACTION_TRANSFER" &&
            entry.message &&
            entry.message.TO_COMPUTER
          ) {
            entry.message.TO_COMPUTER.forEach((trade) =>
              toComputerTradesList.push(trade),
            );
          }
        }
      }
    }
  }

  if (toComputerTradesList.length > 0) {
    toComputerHtml += `<b>Trades zum Computer (Heute & Gestern):</b><br>`;
    for (const trade of toComputerTradesList) {
      toComputerHtml += formatTrade(trade);
    }
    sendMessage(toComputerHtml);
  }

  // 3. Trades "BETWEEN_USERS" (heute und gestern)
  let betweenUsersHtml = "";
  let betweenUsersTradesList = [];
  if (newsList.groups) {
    for (const day of daysToProcessForToAndBetween) {
      if (
        newsList.groups[day.dateStr] &&
        newsList.groups[day.dateStr].entries
      ) {
        const entries = newsList.groups[day.dateStr].entries;
        for (const entry of entries) {
          if (
            entry.type === "TRANSACTION_TRANSFER" &&
            entry.message &&
            entry.message.BETWEEN_USERS
          ) {
            entry.message.BETWEEN_USERS.forEach((trade) =>
              betweenUsersTradesList.push(trade),
            );
          }
        }
      }
    }
  }

  if (betweenUsersTradesList.length > 0) {
    betweenUsersHtml += `<b>Trades zwischen Usern (Heute & Gestern):</b><br>`;
    for (const trade of betweenUsersTradesList) {
      betweenUsersHtml += formatTrade(trade);
    }
    sendMessage(betweenUsersHtml);
  }

  return true;
}

// Beispielhafter Aufruf (sendMessage ist eine existierende Funktion)
function sendDailyTradeReport() {
  const tradeReportHtml = getTradeReport();
  if (tradeReportHtml && tradeReportHtml.length > 0) {
    sendMessage(tradeReportHtml); // Ihre existierende Funktion zum Senden der Nachricht
  } else {
    Logger.log("Keine relevanten Trades gefunden.");
    // Optional: Senden einer "Keine Trades"-Nachricht
    // sendMessage("Heute und gestern gab es keine relevanten Trades.");
  }
}
