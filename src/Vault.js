const Vault = (function ({ }) {

  const logger = Telemetry.getLogger('Vault');

  function getFiles(folderId) {
    var filesResult = [];
    var filesIterator = DriveApp.getFolderById(folderId).getFiles();
    while (filesIterator.hasNext()) {
      const file = filesIterator.next();
      filesResult.push(file);
    }
    return filesResult;
  }

  function getFile(fileId) {
    logger.info(`Getting drive file by id: ${fileId} `)
    try {
      const file = DriveApp.getFileById(fileId);
      // Assumes the file is a text-based format.
      const content = file.getBlob().getDataAsString();
      return content;
    } catch (e) {
      return "Error: File not found or could not be read.";
    }
  }

  function wasUpdated(file) {
    var fileProperty = PropertiesService.getScriptProperties().getProperty(file.getName());
    let date = new Date();
    date.setMinutes(date.getMinutes() - 10);
    return !fileProperty || new Date(JSON.parse(fileProperty).updateTime) < file.getLastUpdated() || new Date(JSON.parse(fileProperty).expirationTime) < date;
  }

  return {
    getFiles,
    getFile,
    wasUpdated
  }
})

