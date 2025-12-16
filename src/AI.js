const AI = (function ({
  geminiApiKey,
  geminiModel
}) {

  // API Constants
  const API = {
    BASE: 'https://generativelanguage.googleapis.com/v1beta',
    UPLOAD_BASE: 'https://generativelanguage.googleapis.com/upload/v1beta',

    generateContent: (model) => `${API.BASE}/models/${model}:generateContent`,
    uploadFile: () => `${API.UPLOAD_BASE}/files?uploadType=multipart`,
    files: () => `${API.BASE}/files`,
    file: (name) => `${API.BASE}/${name}`,
    caches: () => `${API.BASE}/cachedContents`,
    cache: (name) => `${API.BASE}/cachedContents/${name}`
  };

  const logger = Telemetry.getLogger('AI');

  const uploadUrl = `${API.uploadFile()}&key=${geminiApiKey}`;
  const RETRY_CONFIG = {
    maxTryCount: 3,
    intervalSeconds: 30
  };

  const SEARCH_TOOL =
  {
    "google_search": {}
  };
  const URL_TOOL =
  {
    "url_context": {}
  }

  function deleteFile(fileId) {
    const params = {
      contentType: 'application/json',
      muteHttpExceptions: true,
      method: 'DELETE',
    }
    const url = `${API.file(fileId)}?key=${geminiApiKey}`;
    const result = UrlFetchApp.fetch(url, params);
    logger.info(result.getResponseCode() == 200 ? `Succesfully deleted ${fileId}` : `Error during deleting ${fileId} - ${result.getResponseCode()}`);
    return true;
  }

  /**
   * Deletes all files with a matching displayName from Gemini.
   * Returns the count of files deleted.
   */
  function deleteFileByDisplayName(displayName) {
    const allFiles = getFiles();
    const matchingFiles = allFiles.filter(file => file.displayName === displayName);

    if (matchingFiles.length > 0) {
      logger.info(`Found ${matchingFiles.length} existing file(s) with displayName "${displayName}", deleting...`);
      for (const file of matchingFiles) {
        deleteFile(file.name);
      }
    }

    return matchingFiles.length;
  }

  function getFiles(nextPageToken) {
    var url = `${API.files()}?key=${geminiApiKey}&pageSize=100`;
    const params = {
      contentType: 'application/json',
      muteHttpExceptions: true,
      method: 'GET',
    }
    if (nextPageToken) {
      url = `${url}&pageToken=${nextPageToken}`
    }
    const res = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
    var files = res.files;
    if (res.nextPageToken) {
      files = files.concat(getFiles(res.nextPageToken));
    }
    return files;
  }

  function uploadFile(fileName, fileBlob) {
    try {
      // Delete any existing files with the same displayName to prevent duplicates
      deleteFileByDisplayName(fileName);

      const metadata = {
        file: {
          displayName: fileName
        },
      };
      const payload = {
        metadata: Utilities.newBlob(JSON.stringify(metadata), "application/json"),
        file: fileBlob,
      };
      const options = {
        method: "post",
        payload: payload,
        muteHttpExceptions: true,
      };
      const res = UrlFetchApp.fetch(uploadUrl, options).getContentText();
      return JSON.parse(res).file;
    } catch (err) {
      logger.error(`Failed to upload file "${fileName}"`, err);
      return false;
    }
  }

  function buildTextContent(role = 'user' || 'model', content) {
    return {
      role: role,
      parts: [
        { text: content }
      ]
    }
  }

  function buildFileParts(files) {
    const parts = files.flatMap(({ mimeType, uri }) => ({ fileData: { fileUri: uri, mimeType } }));
    return {
      role: 'user',
      parts
    };
  }

  function processCall(contents, systemInstruction, files = [], tryCount = 0) {
    var params = {
      method: "POST",
      contentType: 'application/json',
      muteHttpExceptions: true,
    };


    if (files && files.length > 0) {
      contents.unshift(buildFileParts(files));
    } else {
      logger.info("No files provided.");
    }

    params.payload = JSON.stringify({
      contents: contents,
      tools: [SEARCH_TOOL, URL_TOOL],
      systemInstruction:
      {
        parts:
          [
            {
              "text": systemInstruction
            }
          ]
      },
      generationConfig: {
        "temperature": 0.3,
        //"maxOutputTokens": 1000,
        //"topP": 0.8,
        //"topK": 10
      }
    });
    try {
      var response = UrlFetchApp.fetch(`${API.generateContent(geminiModel)}?key=${geminiApiKey}`, params);
      var responseCode = response.getResponseCode();
      var result;

      // Check for server errors before parsing JSON
      if (responseCode >= 500) {
        result = {
          error: {
            message: `Server error: ${responseCode}, ${JSON.stringify(response.getContentText('UTF-8'))}`,
            status: 'SERVER_ERROR'
          }
        };
      } else {
        // Try to parse JSON, handle parse errors gracefully
        try {
          result = JSON.parse(response.getContentText());
        } catch (parseErr) {
          result = {
            error: {
              message: `Invalid JSON response: ${parseErr.message}`,
              status: 'PARSE_ERROR'
            }
          };
        }
      }

      // Log token usage metadata if available
      if (result.usageMetadata) {
        logger.info({
          message: "API Response Token Usage",
          model: geminiModel,
          tokenUsage: {
            promptTokens: result.usageMetadata.promptTokenCount || 0,
            candidatesTokens: result.usageMetadata.candidatesTokenCount || 0,
            totalTokens: result.usageMetadata.totalTokenCount || 0,
            cachedContentTokens: result.usageMetadata.cachedContentTokenCount || 0
          }
        });
      }

      if (result.error) {
        const errorMessage = `${result.error.message} - ${result.error.status}`;
        if (tryCount >= RETRY_CONFIG.maxTryCount) {
          logger.error(`Failed to retrieve data from ai ${errorMessage}`);
          return [errorMessage];
        } else {
          logger.warn(`Error during processing, trying again in ${RETRY_CONFIG.intervalSeconds} seconds, error: ${errorMessage}`);
          Utilities.sleep(RETRY_CONFIG.intervalSeconds * 1000);
          return processCall(contents, systemInstruction, files, tryCount + 1);
        }
      }
      var returnValue = '';
      try {
        returnValue = result.candidates[0].content.parts.map((part) => part.text);
      } catch (err) {
        logger.error(`Error reading result ${JSON.stringify(result)}`);
      }

      if (returnValue[0]) {
        logger.info(`Text: ${returnValue}`);
      }
      return returnValue;
    } catch (err) {
      logger.error(`Failed to retrieve data from AI ${err.message}`);
      return [`Failed to retrieve data from AI ${err.message}`];
    }
  }

  return {
    processCall,
    uploadFile,
    getFiles,
    deleteFile,
    deleteFileByDisplayName,
    buildTextContent,
    buildFileParts
  }
})

