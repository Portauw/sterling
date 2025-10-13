const AI = (function ({
  geminiApiKey,
  geminiModel,
  cacheTtl = '600s',
  AGENTS_PROMPTS
}) {

  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${geminiApiKey}`
  const RETRY_CONFIG = {
    maxTryCount: 3,
    intervalSeconds: 15
  }

  const SEARCH_TOOL = 
      {
        "google_search": {}
      };
  const URL_TOOL =
      {
        "url_context": {}
      }

  function log(message) {
    console.log(`AI: ${message ? JSON.stringify(message, null, 2) : 'null'}`);
  }

  function deleteFile(fileId){
    const params = {
      contentType: 'application/json',
      muteHttpExceptions: true,
      method: 'DELETE',
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/${fileId}?key=${geminiApiKey}`;
    const result = UrlFetchApp.fetch(url, params);
    log(result.getResponseCode() == 200 ? `Succesfully deleted ${fileId}` : `Error during deleting ${fileId} - ${result.getResponseCode()}`);
    return true;
  }

  /**
   * Gets a file stored in Gemini.
   */
  function getFile(fileId) {
    const url = `https://generativelanguage.googleapis.com/v1beta/${fileId}?key=${geminiApiKey}`;
    const res = UrlFetchApp.fetch(url).getContentText();
    return res;
  }

  function getFiles(nextPageToken) {
    var url = `https://generativelanguage.googleapis.com/v1beta/files?key=${geminiApiKey}&pageSize=100`;
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
      files = files.concat(this.getFiles(res.nextPageToken));
    }
    return files;
  }

  function updateTtlCache(cacheDisplayName) {
    var cache = getCache(cacheDisplayName);
    if (cache) {
      var url = `https://generativelanguage.googleapis.com/v1beta/${cache.name}?key=${geminiApiKey}`;
      var params = {
        contentType: 'application/json',
        muteHttpExceptions: true,
        method: 'patch',
        payload: JSON.stringify({ ttl: cacheTtl })
      }
      var result = UrlFetchApp.fetch(url, params);
      log(result.getResponseCode() == 200 ? `Succesfully updated cache TTL ${cache.displayName}` : `Error during updating cache TTL ${cache.displayName}`);
      PropertiesUtil.setPropertyValue(cacheDisplayName, getCache(cacheDisplayName));
    } else {
      // When the cache is not found we force it to update it.
      updateOrCreateCache(cacheDisplayName);
    }
  }

  function updateOrCreateCache(cacheDisplayName) {
    // Gets all the files now since in the context of ITP_CACHE
    var fileMetaPropertyKeys = PropertiesUtil.getFilesPropertyValue();
    var parts = [];
    for (const key of fileMetaPropertyKeys) {
      var fileMeta = PropertiesUtil.getScriptPropertyObject(key);
      //log(fileMeta);
      if (fileMeta) {
        if (!fileMeta.uri) {
          log(`Filemeta for ${key} incorrect, ignoring`);
          PropertiesUtil.removeProperty(key);
        } else {
          const part = { fileData: { mimeType: fileMeta.mimeType, fileUri: fileMeta.uri } };
          parts.push(part);
        }
      } else {
        log(`Filemeta not found for key ${key}`);
        fileMetaPropertyKeys.splice(fileMetaPropertyKeys.indexOf(key), 1);
        PropertiesUtil.saveFilesPropertyValue(fileMetaPropertyKeys);
      }
    }

    var cacheItem = {
      displayName: cacheDisplayName,
      model: `models/${geminiModel}`,
      contents: [
        {
          parts: parts,
          role: 'user'
        },
      ],
      systemInstruction:
      {
        parts:
          [
            {
              "text": AGENTS_PROMPTS
            }
          ]
      },
      ttl: cacheTtl
    };

    const params = {
      contentType: 'application/json',
      muteHttpExceptions: true,
      method: 'POST',
      payload: JSON.stringify(cacheItem)
    }
    var response = JSON.parse(UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${geminiApiKey}`, params));
    if (response.error) {
      log(response);
      PropertiesUtil.removeProperty(cacheDisplayName);
    } else {
      log(`Succesfully updated / created cache ${cacheDisplayName}`);
      PropertiesUtil.setPropertyValue(cacheDisplayName, response);
    }
  }

  function removeCache(cacheName) {
    UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/${cacheName}?key=${geminiApiKey}`, { method: 'delete' });
    log(`Removed cache ${cacheName}`);
  }

  function getCache(cacheDisplayName) {
    var cache = PropertiesUtil.getOptionalCache(cacheDisplayName);
    if (cache) {
      var url = `https://generativelanguage.googleapis.com/v1beta/${cache.name}?key=${geminiApiKey}`;
      var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, contentType: 'application/json', method: 'GET' });
      if (response.getResponseCode() == 200) {
        return JSON.parse(response);
      } else {
        log(`Cache ${cacheDisplayName} not found in Gemini.`);
        return null;
      }
    } else {
      log(`Cache ${cacheDisplayName} not found in properties`);
      return null;
    }


  }

  function getAllCaches() {
    return JSON.parse(UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${geminiApiKey}`));
  }

  function uploadFiles(files) {
    var result = [];
    for (const file of files) {
      result.push(uploadFile(file.fileName, file.fileBlob));
    }
    return result;
  }

  function uploadFile(fileName, fileBlob) {
    try {
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
      log(`Failed to upload file "${fileName}"`, err);
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

  function processCall(contents, systemInstruction, files = [], tools = [], functions = [], tryCount = 0){
    var params = {
      method: "POST",
      contentType: 'application/json',
      muteHttpExceptions: true,
    };

    
    if (files && files.length > 0) {
      contents.unshift(buildFileParts(files));
    } else {
      log("No files provided.");
    }

    if (!tools || tools.length == 0) {
      tools = []
    }
    params.payload = JSON.stringify({
      contents: contents,
      // ...(cacheId && {cachedContent: cacheId}),
      // tools:  [...tools, ...functions],
      tools:  functions,
      //tools:  tools,
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
      var response = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, params);
      var result = JSON.parse(response.getContentText());
      if (result.error) {
        const errorMessage = `${result.error.message} - ${result.error.status}`;
        if (tryCount >= RETRY_CONFIG.maxTryCount) {
          log(`Failed to retrieve data from ai ${errorMessage}`);
          return [errorMessage];
        } else {
          log(`Error during processing, trying again in ${RETRY_CONFIG.intervalSeconds}seconds, error: ${errorMessage}`);
          Utilities.sleep(RETRY_CONFIG.intervalSeconds * 1000);
          return processCall(contents, systemInstruction, files, tools, functions, tryCount++);
        }
      }
      const returnValue = result.candidates[0].content.parts.map((part) => part.text);
      if (!returnValue[0]){
        // check if it is a function call and take the first one.
        const functionResults = result.candidates[0].content.parts.map((part) => part.functionCall);
        for (const functionCall of functionResults){
          const functionName = functionCall.name;
          log(`Triggered function call ${functionName}`);
          const args = functionCall.args;
          const functionDef = functions[0].functionDeclarations.find(fd => fd[functionName]);
          // This will only work when the args of the function has only 1 parameter since we do Object.values(args)[0].
          const functionCallResult = functionDef[functionName](Object.values(args)[0]);
          contents.push(buildTextContent('user', JSON.stringify(functionCallResult)));
        }
        return processCall(contents, systemInstruction, files, tools, functions, 0);
      }else {
        log(`Text: ${returnValue}`);
      }
      return returnValue;
    } catch (err) {
      log(`Failed to retrieve data from AI ${err.message}`);
      return `Failed to retrieve data from AI ${err.message}`;
    }
  }

  return {
    processCall,
    uploadFile,
    uploadFiles,
    getFile,
    getFiles,
    deleteFile,
    updateOrCreateCache,
    updateTtlCache,
    buildTextContent,
    buildFileParts,
    getCache,
    getAllCaches,
    removeCache, 
    SEARCH_TOOL, 
    URL_TOOL
  }
})

