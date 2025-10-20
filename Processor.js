const Processor = (function ({
  todoistApiKey,
  gTaskListId,
  calendarId,
  geminiApiKey,
  geminiModel,
  label,
  todoistProjectId,
  driveFolders,
  promptInstructions
}) {

  const TodoistClient = Todoist({ todoistApiKey: todoistApiKey, label: label });
  const GoogleTaskClient = GoogleTask({ gTaskListId: gTaskListId, minuteInterval: 35 });
  const VaultClient = Vault({});
  const AGENTS_PROMPTS =
    VaultClient.getFile(promptInstructions.agents_prompt);
  const CALENDAR_INSTRUCTIONS_PROMPT =
    VaultClient.getFile(promptInstructions.calendar_instructions_prompt);
  const DRIVE_FUNCTIONS = VaultClient.getDriveTools([VaultClient.getFileFunction()]);
  const AiClient = AI(
    { geminiApiKey: geminiApiKey,
      geminiModel: geminiModel,
      AGENTS_PROMPTS
    });
  const CalendarClient = Calendar({ defaultCalendarId: calendarId })

  const AI_RESULT_PREFIX = 'AI:';
  const ENRICHT_LABEL = 'enrich';
  const ENRICH_SCHEDULED = 'enrich_scheduled';

  function log(message) {
    console.log(`Processor: ${message !== null ? JSON.stringify(message, null, 2) : 'null'}`);
  }

  function processContextData(forceUpdate = false) {
    var propertyNamesPropertyValue = [];
    var needsCacheUpdate = forceUpdate;
    for (const driveFolderInfo of driveFolders) {
      var files = VaultClient.getFiles(driveFolderInfo.id);
      for (const file of files) {
        propertyNamesPropertyValue.push(file.getName());
        if (VaultClient.wasUpdated(file) || PropertiesUtil.isFileExpired(file.getName()) || forceUpdate) {
          var fileResult = AiClient.uploadFile(file.getName(), file.getBlob());
          if (fileResult) {
            PropertiesUtil.setPropertyValue(file.getName(), fileResult);
            log(`Updated file ${file.getName()}`);
            needsCacheUpdate = true;
          } else {
            log(`Something went wrong with the file upload for ${file.getName()}`);
          }
        } else {
          log(`No need to update file ${file.getName()}`);
        }
      }
    }
    PropertiesUtil.saveFilesPropertyValue(propertyNamesPropertyValue);
  }

  function enrichTodaysTasksForLabel(label) {
    log(`Enrichting for label: ${label}`);
    var result = TodoistClient.getTasksByFilter(`today&@${label}`);
    log(`Enriching ${result.length} tasks`);
    for (const task of result) {
      var comments = TodoistClient.getCommentsForTask(task.id);
      if (comments.length > 0) {
        TodoistClient.deleteComments(comments.map(c => c.id));
      }
      enrichTodoistTask(task);
      Utilities.sleep(10 * 1000);
    }
  }

  function enrichTodoistTask(task, comments) {
    var content = [];
    content.push(AiClient.buildTextContent('user', `Given this task with title ${task.content} and optional description ${task.description}`));
    if (comments?.length > 0) {
      content.push(AiClient.buildTextContent('user', `Take following comments into consideration.`));
      for (const c of comments) {
        content.push(AiClient.buildTextContent(c.content.includes(AI_RESULT_PREFIX) ? 'model' : 'user', c.content));
      }
    }
    const systemInstruction = AGENTS_PROMPTS;
    const files = AiClient.getFiles();
    //const tools = [AiClient.SEARCH_TOOL, AiClient.URL_TOOL];

    var aiResult = AiClient.processCall(content, systemInstruction, files, [], DRIVE_FUNCTIONS, 0);
    aiResult.forEach((item) => {
      TodoistClient.createComment(task.id, `${AI_RESULT_PREFIX} ${item}`);
    });
    log(`Task ${task.id} was enriched`);
  }

  function enrichTodoistTasks() {
    log('Enriching todoist tasks');
    var tasks = TodoistClient.getUpdatedTasks();
    for (const task of tasks) {
      try {
        var comments = TodoistClient.getCommentsForTask(task.id);
        // We check if the last comment has @AI
        var lastCommentContainsAI = comments.length > 0 ? comments.slice(-1)[0].content.includes('@ai') : false;
        var taskHasEnrichLabel = task.labels.includes(ENRICHT_LABEL);
        if (taskHasEnrichLabel || lastCommentContainsAI) {
          enrichTodoistTask(task, comments);
          if (taskHasEnrichLabel) {
            task.labels.splice(task.labels.indexOf(ENRICHT_LABEL), 1);
            TodoistClient.updateTask(task);
          }
        } else {
          log(`Task ${task.id} not to be enriched`);
        }
      } catch (err) {
        log(`Failed to enrich task with error ${err.message}`);
      }
    }
    return true;
  }

  function processGoogleTasks() {
    var tasks = GoogleTaskClient.listTaskLists();
    if (!tasks) {
      log('Failed to get tasks');
    } else {
      var result = createTodoistTasks(tasks);
      if (!result) {
        log('Failed to create tasks in todoist');
      } else {
        log(`Created: ${tasks.length} tasks in Todoist`);
        GoogleTaskClient.markGoogleTasksDone(tasks);
      }
    }
  }

  function createTodoistTasks(tasks) {
    try {
      const tasksResult = [];
      for (const task of tasks) {
        if (!task.labels){
          task.labels = [];
        }
        switch (task.type) {
          case 'EMAIL':
            task.labels.push('email')
            break;
          default:
            break;
        }
        var todoisTask = TodoistClient.createTask(task);
        tasksResult.push(todoisTask);
      }
      return {
        succes: true,
        result: tasks
      };
    } catch (err) {
      log(`Failed with error ${err.message}`);
      return {
        succes: false,
        error: err.message
      };
    }
  }

  function filterEventsForProcessing(events) {
    log(`Filtering ${events.length} events for processing`);
    const now = new Date();
    const workHourStart = 7; // 7am
    const workHourEnd = 20; // 8pm

    const filtered = events.filter(event => {
      // Skip all-day events
      if (event.isAllDay) {
        log(`Skipping all-day event: ${event.title}`);
        return false;
      }

      // Check if event is within work hours
      const eventStart = new Date(event.startTime);
      const eventHour = eventStart.getHours();
      if (eventHour < workHourStart || eventHour >= workHourEnd) {
        log(`Skipping event outside work hours: ${event.title} at ${eventHour}:00`);
        return false;
      }

      // Only process events with attendees (more than just the user)
      if (!event.attendees || event.attendees.length <= 0) {
        log(`Skipping event with no other attendees: ${event.title}`);
        return false;
      }

      return true;
    });

    log(`Filtered to ${filtered.length} events for processing`);
    return filtered;
  }

  function prepareCalendarEventsContext(events) {
    log(`Preparing events with context`);
    const systemInstruction = AGENTS_PROMPTS;

    var contents = [
      AiClient.buildTextContent('user', JSON.stringify(events)),
      AiClient.buildTextContent('user', CALENDAR_INSTRUCTIONS_PROMPT)
    ];
    const files = [];
    // const tools = [AiClient.SEARCH_TOOL, AiClient.URL_TOOL];
    // const functions = DRIVE_FUNCTIONS;
    // Not passing the tools or functions along since not needed for this.
    var result = extractJsonFromResponse(AiClient.processCall(contents, systemInstruction, files, [], [], 0)[0]);
    log(`Done preparing events.`);
    return result;
  }

  // Extract proper JSON from the response of determineContext.
  function extractJsonFromResponse(response) {
    try {
      // First try to parse directly (in case it's already clean JSON)
      return JSON.parse(response);
    } catch (e) {
      // Extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch (parseError) {
          console.error('Failed to parse extracted JSON:', parseError);
        }
      }

      // Try to find JSON array or object in the text
      const jsonStart = response.indexOf('[') !== -1 ? response.indexOf('[') : response.indexOf('{');
      const jsonEnd = response.lastIndexOf(']') !== -1 ? response.lastIndexOf(']') : response.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1) {
        try {
          return JSON.parse(response.substring(jsonStart, jsonEnd + 1));
        } catch (parseError) {
          console.error('Failed to parse substring JSON:', parseError);
        }
      }

      throw new Error('No valid JSON found in response');
    }
  }

  function processCalendarItems() {
    log(`Processing calendar items`);
    const result = CalendarClient.getEventsForDate(calendarId, new Date());
    if (result.success) {
      const returnValue = [];
      try {
        if (result.events.length > 0) {
          log(`Retrieved ${result.events.length} calendar items`);
          const filteredEvents = filterEventsForProcessing(result.events);

          if (filteredEvents.length === 0) {
            log(`No events to process after filtering`);
            return returnValue;
          }

          // Process events in batches of 3-5 to reduce token usage per API call
          const batchSize = 3;
          const batches = [];
          for (let i = 0; i < filteredEvents.length; i += batchSize) {
            batches.push(filteredEvents.slice(i, i + batchSize));
          }

          log(`Processing ${filteredEvents.length} events in ${batches.length} batches of ${batchSize}`);

          // Process each batch
          for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} events`);

            const eventsWithContext = prepareCalendarEventsContext(batch);

            // Sleep between batches to give AI breathing room
            if (batchIndex < batches.length - 1) {
              Utilities.sleep(10 * 1000);
            }

            // Process each event in the batch results
            for (const event of eventsWithContext.events) {
              try {
                log(`Processing event: ${event.title}, Data: ${JSON.stringify(event)}`);
                if (event.preparation) {
                  var date = new Date();
                  try {
                    date = new Date(event.startTime);
                    date.setHours(date.getHours() - 2);
                  }catch (err){
                    log(`Error during parsing date based on ${event.startTime}`);
                  }
                  const task = {
                    title: `Prepare for ${event.title}`,
                    description: event.meeting_preparation_prompt,
                    labels: [ENRICH_SCHEDULED],
                    due_date: date ? date.toISOString() : new Date().toISOString(),
                    // The TODOIST ProjectID is linked to the Project the item must be created in.
                    project_id: todoistProjectId
                  }
                  const todoistTask = createTodoistTasks([task]);
                  returnValue.push(todoistTask);
                  // Lets give some room to AI to process them all.
                  Utilities.sleep(20 * 1000);
                } else {
                  log(`Not processing event ${event.title} since not needed.`);
                }
              } catch (err) {
                log(`Error during processing event ${event.title}. Due to ${err}`);
              }
            }
          }
        } else {
          log(`No events found.`);
        }
      } catch (err) {
        log(`Error during processing calendar result ${JSON.stringify(result)} due to error: ${err}`);
      }
      return returnValue;
    } else {
      log(`Error occured during retrieval of calendarEvents ${result.error}`);
    }
  }

  function aiFilesListing() {
    const grouping ={};
    const aifiles = AiClient.getFiles();
    //AiClient.deleteFile('files/m6aal2coocv4');
    for (const file of aifiles){
      log(`${file.name} - ${file.displayName}`);
      if (!grouping[file.displayName]){
        grouping[file.displayName] = [file];
      }else {
        grouping[file.displayName] = [...grouping[file.displayName], file];
      }
    }
    // for (const [key, value] of Object.entries(grouping)) {
    //   if (value.length > 1){
    //     log(`size: ${value.length} - ${value.slice(1)}`)
    //     const sliced = value.slice(1);
    //     for (const f of sliced){
    //       //log(AiClient.deleteFile(f.name));
    //     }
    //   }
    // }

    //log(grouping);
  }

  return {
    processGoogleTasks,
    enrichTodoistTasks,
    processContextData,
    enrichTodaysTasksForLabel,
    processCalendarItems
  }
});




