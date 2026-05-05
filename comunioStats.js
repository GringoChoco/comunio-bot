function getDelta30DayTrend() {
  // Calculate yesterday's date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate());

  // Format the date as YYYYMMDD
  const formattedDate = yesterday.toISOString().split("T")[0].replace(/-/g, "");

  // Construct the URL with the formatted date
  const url = `https://stats.comunio.de/data/overallvalues_100d.js?${formattedDate}`;

  Logger.log("URL: " + url);

  try {
    // Fetch the URL content
    const response = UrlFetchApp.fetch(url);
    const data = response.getContentText();

    // Extract arrays using regex
    const overallValuesMatch = data.match(
      /overallvalues_100d\s*=\s*(\[{.*?}\]);/s,
    );
    const overallIntValuesMatch = data.match(
      /overallintvalues_100d\s*=\s*(\[{.*?}\]);/s,
    );

    if (!overallValuesMatch || !overallIntValuesMatch) {
      throw new Error("Could not extract arrays from the response");
    }

    // Fix the shorthand JavaScript object format to valid JSON
    const overallValuesJson = overallValuesMatch[1].replace(/(\w+):/g, '"$1":');
    const overallIntValuesJson = overallIntValuesMatch[1].replace(
      /(\w+):/g,
      '"$1":',
    );

    // Parse the corrected JSON strings
    const overallValues = JSON.parse(overallValuesJson);
    const overallIntValues = JSON.parse(overallIntValuesJson);

    // Get the last y values from both arrays
    const lastOverallValueY =
      overallValues[overallValues.length - 1]?.y || null;
    const lastOverallIntValueY =
      overallIntValues[overallIntValues.length - 1]?.y || null;

    Logger.log(lastOverallValueY - lastOverallIntValueY);
    base.updateData("delta30DayTrend", {
      delta30DayTrend: lastOverallValueY - lastOverallIntValueY,
    });
  } catch (error) {
    Logger.log("Error fetching or parsing data: " + error.message);
    sendMessage("Error fetching or parsing data: " + error.message);
    return null;
  }
}
