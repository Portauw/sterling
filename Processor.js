const Processor = (function ({
  todoistApiKey,
  gTaskListId,
  calendarId,
  geminiApiKey,
  geminiModel,
  label,
  todoistProjectId,
  driveFolders,
  promptInstructions,
  workDayStartHour,
  workDayEndHour
}) {

  function log(message) {
    console.log(`Processor: ${message !== null ? JSON.stringify(message, null, 2) : 'null'}`);
  }
  log('Initialising processor');

  const AI_RESULT_PREFIX = 'AI:';
  const ENRICHT_LABEL = 'enrich';
  const ENRICH_SCHEDULED = 'enrich_scheduled';

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
  const CalendarClient = Calendar({ defaultCalendarId: calendarId, workDayStartHour: workDayStartHour, workDayEndHour: workDayEndHour });

  log('Initialising processor completed');
  

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
      task.labels.splice(task.labels.indexOf(label), 1);
      TodoistClient.updateTask(task);
      Utilities.sleep(20 * 1000);
    }
  }

  function enrichTodoistTask(task, comments) {
    log(`Enrichting task: ${JSON.stringify(task)}`)
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
        success: true,
        result: tasks
      };
    } catch (err) {
      log(`Failed with error ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }

  function filterEventsForProcessing(events) {
    log(`Filtering ${events.length} events for processing`);
    const now = new Date();

    const filtered = events.filter(event => {
      // Skip all-day events
      if (event.isAllDay) {
        log(`Skipping all-day event: ${event.title}`);
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
    const files = AiClient.getFiles();
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

          // 1. Identification Phase: Gather all tasks needing preparation
          // Process all filtered events in one go
          log(`Processing ${filteredEvents.length} events for identification`);
          
          const eventsWithContext = prepareCalendarEventsContext(filteredEvents);
          const tasksToSchedule = [];

          // Collect prep tasks
          for (const event of eventsWithContext.events) {
             if (event.preparation) {
                tasksToSchedule.push(event);
             } else {
                log(`Not processing event ${event.title} since not needed.`);
             }
          }

          // 2. Scheduling Phase: Plan tasks to avoid overlaps
          if (tasksToSchedule.length > 0) {
             log(`Identified ${tasksToSchedule.length} tasks to schedule. Starting planning phase.`);
             
             // Sort tasks by event start time to schedule earlier meetings first
             tasksToSchedule.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

             // Track newly scheduled slots to include in both strict and lenient checks
             const newlyScheduledSlots = [];

             for (const event of tasksToSchedule) {
                try {
                    log(`Scheduling preparation for: ${event.title}`);
                    var date = new Date();
                    const eventStart = new Date(event.startTime);
                    // Use AI estimated duration or default to 45
                    log(`Estimated duration: ${event.duration_estimation}`);
                    const duration = event.duration_estimation || 45;
                    
                    // Strategy 1: Strict - Avoid ALL events (filtered + skipped/placeholders)
                    const allEventsBusyList = [...result.events, ...newlyScheduledSlots].map(e => ({
                        startTime: e.startTime,
                        endTime: e.endTime,
                        title: e.title
                    }));

                    let scheduledTime = CalendarClient.findOpenSlot(allEventsBusyList, eventStart, duration);
                    let schedulingStrategy = "Strict (Clean slot)";

                    // Strategy 2: Lenient - Avoid ONLY processed events (allow overlap with skipped/placeholders)
                    if (!scheduledTime) {
                        log(`No strict slot found for ${event.title}. Trying lenient strategy (overlapping skipped events).`);
                        const lenientBusyList = [...filteredEvents, ...newlyScheduledSlots].map(e => ({
                            startTime: e.startTime,
                            endTime: e.endTime,
                            title: e.title
                        }));
                        
                        scheduledTime = CalendarClient.findOpenSlot(lenientBusyList, eventStart, duration);
                        schedulingStrategy = "Lenient (Overlapping skipped events)";
                    }

                    if (scheduledTime) {
                      date = scheduledTime;
                      const endTime = new Date(date.getTime() + duration * 60000);
                      log(`Scheduled (${schedulingStrategy}) preparation for ${event.title} at ${date.toISOString()} - ${endTime.toISOString()} (${duration} mins)`);
                      
                      // Add this new slot to our tracker
                      newlyScheduledSlots.push({
                          startTime: date.toISOString(),
                          endTime: endTime.toISOString(),
                          title: `Reserved: Prep for ${event.title}`
                      });
                    } else {
                      // Strategy 3: Fallback
                      date = new Date(eventStart);
                      date.setHours(date.getHours() - 2);
                      log(`No open slot found (Strict or Lenient). Scheduled preparation for ${event.title} at fallback time: ${date.toISOString()}`);
                    }

                    const task = {
                        title: `Prepare for ${event.title}`,
                        description: event.meeting_preparation_prompt,
                        labels: [ENRICH_SCHEDULED],
                        due_date: date ? date.toISOString() : new Date().toISOString(),
                        project_id: todoistProjectId,
                        duration: duration,
                        duration_unit: 'minute'
                    }

                    const todoistTask = createTodoistTasks([task]);
                    returnValue.push(todoistTask);
                    
                    // Rate limiting for task creation
                    Utilities.sleep(2 * 1000);

                } catch (err) {
                    log(`Error during scheduling event ${event.title}. Due to ${err}`);
                }
             }
          } else {
             log("No preparation tasks identified.");
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

  function aiFileManagement() {
    const grouping ={};
    const aifiles = AiClient.getFiles();
    log(`Amount of files: ${aifiles.length}`);
    for (const file of aifiles){
      log(`${file.name} - ${file.displayName}`);
      if (!grouping[file.displayName]){
        grouping[file.displayName] = [file];
      }else {
        grouping[file.displayName] = [...grouping[file.displayName], file];
      }
    }
    for (const [key, value] of Object.entries(grouping)) {
      if (value.length > 1){
        log(`size: ${value.length} - ${JSON.stringify(value.slice(1))}`)
        const sliced = value.slice(1);
        for (const f of sliced){
          log(AiClient.deleteFile(f.name));
        }
      }
    }

    //log(grouping);
  }

  return {
    processGoogleTasks,
    enrichTodoistTasks,
    processContextData,
    enrichTodaysTasksForLabel,
    processCalendarItems,
    aiFileManagement
  }
});




