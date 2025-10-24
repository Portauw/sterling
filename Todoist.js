const Todoist = (function ({ todoistApiKey, label }) {

  const SYNC_TOKEN = 'TODOIST_LAST_SYNC_TOKEN';

  /**
 * Builds a complete URL from a base URL and a map of URL parameters.
 * @param {string} url The base URL.
 * @param {Object.<string, string>} queryParams The URL parameters and values.
 * @return {string} The complete URL.
 * @private
 */
  function buildUrl_(url, queryParams) {
    var paramString = Object.keys(queryParams).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(queryParams[key]);
    }).join('&');
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + paramString;
  }

  function log(message) {
    console.log(`Todoist: ${message ? JSON.stringify(message, null, 2) : 'null'}`);
  }

  function createTask(task) {
    log(`Creating task ${JSON.stringify(task)}`);
    var params = {
      method: "POST",
      contentType: 'application/json',
      headers: { Authorization: "Bearer " + todoistApiKey },
      muteHttpExceptions: false
    };
    var url = 'https://api.todoist.com/rest/v2/tasks'
    try {
      var link = task.link
      var description = link ? '[' + link.description + '](' + link.url + ')' + (task.description || '') : (task.description || '');
      params.payload = JSON.stringify({
        content: task.title,
        description: description,
        labels: [...task.labels, label],
        ...(task.due_date && {due_date: task.due_date}),
        project_id: task.project_id
      });

      var result = JSON.parse(UrlFetchApp.fetch(url, params));
      log(`Task created ${result.id} - ${result.content}`);
      return result;
    } catch (err) {
      log(`Failed to create tasks with error ${err.message}`);
      return false;
    }
  }

  function getTasksByFilter(filter) {
    var params = {
      method: "GET",
      contentType: 'application/json',
      headers: { Authorization: "Bearer " + todoistApiKey },
      muteHttpExceptions: false
    };
    var queryParams = {
      filter: filter
    }
    var url = `https://api.todoist.com/rest/v2/tasks/`;
    log(buildUrl_(url, queryParams));
    try {
      var result = UrlFetchApp.fetch(buildUrl_(url, queryParams), params);
      return JSON.parse(result);
    } catch (err) {
      log(`Failed to get tasks with filter "${filter}" with error ${err.message}`);
      return false;
    }
  }

  function getTask(taskId) {
    var params = {
      method: "GET",
      contentType: 'application/json',
      headers: { Authorization: "Bearer " + todoistApiKey },
      muteHttpExceptions: false
    };
    var url = `https://api.todoist.com/rest/v2/tasks/${taskId}`;
    try {
      var result = UrlFetchApp.fetch(url, params);
      return JSON.parse(result);
    } catch (err) {
      log(`Failed to get task ${taskId} with error ${err.message}`);
      return false;
    }
  }

  function updateTask(task) {
    var params = {
      method: "POST",
      contentType: 'application/json',
      headers: { Authorization: "Bearer " + todoistApiKey },
      muteHttpExceptions: false,
      payload: JSON.stringify({
        content: task.content,
        description: task.description,
        labels: task.labels,
      })
    };
    var url = `https://api.todoist.com/rest/v2/tasks/${task.id}`
    try {
      var result = UrlFetchApp.fetch(url, params);
      return JSON.parse(result);;
    } catch (err) {
      log(`Failed to update tasks with error ${err.message}`);
      return false;
    }
  }

  function createComment(taskId, comment) {
    var params = {
      method: "POST",
      contentType: 'application/json',
      headers: { Authorization: "Bearer " + todoistApiKey },
      muteHttpExceptions: false
    };
    var url = 'https://api.todoist.com/rest/v2/comments'
    try {
      params.payload = JSON.stringify({
        task_id: taskId,
        content: `${comment}`
      });

      var result = UrlFetchApp.fetch(url, params);
      return JSON.parse(result);
    } catch (err) {
      log(`Failed to create comment with error ${err.message}`);
      return false;
    }
  }

  function getCommentsForTask(taskId) {
    var params = {
      method: "GET",
      contentType: 'application/json',
      headers: { Authorization: "Bearer " + todoistApiKey },
      muteHttpExceptions: false
    };
    var url = 'https://api.todoist.com/rest/v2/comments?task_id=' + taskId;
    try {
      var result = UrlFetchApp.fetch(url, params);
      return JSON.parse(result);
    } catch (err) {
      log(`Failed to get comments with error ${err.message}`);
      return false;
    }
  }

  function deleteComments(commentIds = []) {
    var params = {
      method: "DELETE",
      //contentType: 'application/json',
      headers: { Authorization: "Bearer " + todoistApiKey },
      muteHttpExceptions: false
    };
    log(`Deleting ${commentIds.length} comments`);
    var results = [];
    commentIds.forEach((id) => {
      var url = `https://api.todoist.com/rest/v2/comments/${id}`;
      log(url);
      try {
        var result = UrlFetchApp.fetch(url, params);
        results.push({
          id: id,
          result: 'OK'
        });
      } catch (err) {
        log(`Failed to delete comments with error ${err.message}`);
        results.push({
          id: id,
          result: 'FAIL'
        });
      }
    });
  }


  function getUpdatedTasks() {
    log('Start retrieval of updated tasks');
    var scriptProperties = PropertiesService.getScriptProperties();
    var syncToken = scriptProperties.getProperty(SYNC_TOKEN) ?? '*';
    log(`Synctoken present: ${syncToken}`);
    var url = 'https://api.todoist.com/sync/v9/sync';
    var params = {
      method: "POST",
      contentType: 'application/json',
      headers: { Authorization: "Bearer " + todoistApiKey },
      muteHttpExceptions: false,
      payload: JSON.stringify({
        sync_token: syncToken,
        resource_types: `["items", "notes"]`
      })
    };
    try {
      var result = JSON.parse(UrlFetchApp.fetch(url, params));
      var tasks = result.items;
      result.notes.forEach((note) => {
        tasks.push(getTask(note.item_id));
      });
      var uniqueTasks = Array.from(
        tasks.reduce((map, task) => map.set(task.id, task), new Map()).values()
      );
      log(`${uniqueTasks.length} updated items.`);
      scriptProperties.setProperty(SYNC_TOKEN, result.sync_token);
      return uniqueTasks;
    } catch (err) {
      log(`Failed to get updated tasks with error ${err.message}`);
      return false;
    }

  }
  return {
    getTask,
    createTask,
    createComment,
    deleteComments,
    updateTask,
    getCommentsForTask,
    getUpdatedTasks,
    getTasksByFilter
  }
})