const GoogleTask = (function ({ gTaskListId, minuteInterval }) {
  
  const logger = Telemetry.getLogger('GoogleTask');

  function listTaskLists() {
    let date = new Date();
    date.setMinutes(date.getMinutes() - minuteInterval);
    const tasksOptionalArgs = {
      maxResults: 50,
      showCompleted: false,
      updatedMin: date.toISOString()
    };
    try {
      // Returns all the authenticated user's task lists.
      const response = Tasks.Tasks.list(gTaskListId, tasksOptionalArgs);
      const tasks = response.items;
      if (!tasks || tasks.length === 0) {
        logger.info('No tasks found in list.');
        return [];
      }
      for (const task of tasks) {
        logger.info(`${task.title} (${task.id} ${task.due}) ${task.notes}`);
        var link = task.links && task.links.length !== 0 ? task.links[0] : null;
        var type = link !== null ? link.type.toUpperCase() : 'ASSISTANT'
        task.type = type;
        task.description = task.notes;
        if (link) {
          task.link = {
            url: link.link,
            description: link.description,
            id: link.link.split('/').filter(Boolean).pop()
          }
        }
      }
      return tasks;
    } catch (err) {
      logger.error(`Failed with error ${err.message}`);
      return false;
    }
  }

  function markGoogleTasksDone(tasks) {
    for (const task of tasks) {
      var result = markTaskAsCompleted_(task);
      if (!result) {
        logger.warn(`Error during marking task ${task.title}`);
      }
    }
  }

  function markTaskAsCompleted_(task) {
    try {
      task.setStatus('completed')
      var result = Tasks.Tasks.patch(task, gTaskListId, task.id);
      return true;
    } catch (err) {
      logger.error(`Failed with error ${err.message}`);
      return false;
    }
  }
  return {
    listTaskLists,
    markGoogleTasksDone
  }
})