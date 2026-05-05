//Firebase Konstanten
const base = FirebaseApp.getDatabaseByUrl(
  PropertiesService.getScriptProperties().getProperty("FIREBASE_URL"),
  PropertiesService.getScriptProperties().getProperty("FIREBASE_SECRET"),
);

//BackUp
const backUpTable = (tableName = "comunioPlayer", year) => {
  // Fetch the data from the specified table
  let backUpData = base.getData(tableName);

  // Create the backup table name using the input year
  let backupTableName = `${tableName}${year}`;

  // Store the backup data in the newly named table
  base.setData(backupTableName, backUpData);

  // Log the action for confirmation
  Logger.log(`Backup created: ${backupTableName}`);
};
