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

  function searchDrive(query) {
    logger.info(`Searching in drive for ${query} `)
    const files = DriveApp.searchFiles(`title contains "${query}" or fullText contains "${query}"`);
    let fileList = [];
    let count = 0;
    while (files.hasNext() && count < 20) { // Limit to 20 results
      let file = files.next();
      fileList.push({
        name: file.getName(),
        id: file.getId(),
        url: file.getUrl(),
      });
      count++;
    }
    return JSON.stringify(fileList);
  }

  function getDriveTools(items) {
    const tools = [{
      functionDeclarations: items
    }];
    return tools;
  }

  function getSearchFunction(){
    return {
          searchDrive: searchDrive,
          name: "searchDrive",
          description: "Searches for files in Google Drive based on a search query. Uses the same query format as the Google Drive search bar. This is not the right function when looking based on an id.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description: "The search query string."
              }
            },
            required: ["query"]
          }
        }
  }

  function getFileFunction(){
    return {
          getFile: getFile,
          name: "getFile",
          description: "Retrieves the text content of a specific Google Drive file using its unique file ID.",
          parameters: {
            type: "OBJECT",
            properties: {
              fileId: {
                type: "STRING",
                description: "The unique ID of the file to read."
              }
            },
            required: ["fileId"]
          }
        }
  }

  return {
    getSearchFunction,
    getFileFunction,
    getFiles,
    getFile,
    getDriveTools,
    searchDrive,
    wasUpdated
  }
})

