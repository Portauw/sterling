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
  workTimeBlocks = [
    { start: "09:00", end: "12:00" },
    { start: "13:00", end: "17:00" }
  ],
  bufferMinutes = 0
}) {

  // Validate configuration before any initialization
  validateConfiguration({
    todoistApiKey, gTaskListId, calendarId, geminiApiKey,
    todoistProjectId, promptInstructions, label, driveFolders, workTimeBlocks
  });

  const logger = Telemetry.getLogger('Processor');

  logger.info('Initialising processor');

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
  const AiClient = AI(
    { geminiApiKey: geminiApiKey,
      geminiModel: geminiModel
    });
  const CalendarClient = Calendar({ defaultCalendarId: calendarId });

  logger.info('Initialising processor completed');
  

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
            logger.info(`Updated file ${file.getName()}`);
            needsCacheUpdate = true;
          } else {
            logger.error(`Something went wrong with the file upload for ${file.getName()}`);
          }
        } else {
          logger.info(`No need to update file ${file.getName()}`);
        }
      }
    }
    PropertiesUtil.saveFilesPropertyValue(propertyNamesPropertyValue);
  }

  function enrichTodaysTasksForLabel(label) {
    logger.info(`Enrichting for label: ${label}`);
    var result = TodoistClient.getTasksByFilter(`today&@${label}`);
    logger.info(`Enriching ${result.length} tasks`);
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
    logger.info(`Enrichting task: ${JSON.stringify(task)}`)
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
    var aiResult = AiClient.processCall(content, systemInstruction, files);
    aiResult.forEach((item) => {
      TodoistClient.createComment(task.id, `${AI_RESULT_PREFIX} ${item}`);
    });
    logger.info(`Task ${task.id} was enriched`);
  }

  function enrichTodoistTasks() {
    logger.info('Enriching todoist tasks');
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
          logger.info(`Task ${task.id} not to be enriched`);
        }
      } catch (err) {
        logger.error(`Failed to enrich task with error ${err.message}`);
      }
    }
    return true;
  }

  function processGoogleTasks() {
    var tasks = GoogleTaskClient.listTaskLists();
    if (!tasks) {
      logger.error('Failed to get tasks');
    } else {
      var result = createTodoistTasks(tasks);
      if (!result) {
        logger.error('Failed to create tasks in todoist');
      } else {
        logger.info(`Created: ${tasks.length} tasks in Todoist`);
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
      logger.error(`Failed with error ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }

  function filterEventsForProcessing(events) {
    logger.info(`Filtering ${events.length} events for processing`);

    const filtered = events.filter(event => {
      // Skip all-day events
      if (event.isAllDay) {
        logger.info(`Skipping all-day event: ${event.title}`);
        return false;
      }

      // Skip events with no attendees
      if (!event.attendees || event.attendees.length <= 1) {
        logger.info(`Skipping event with no attendees: ${event.title}`);
        return false;
      }
      return true;
    });

    logger.info(`Filtered to ${filtered.length} events for processing`);
    return filtered;
  }

  function prepareCalendarEventsContext(events) {
    logger.info(`Preparing events with context`);
    const systemInstruction = AGENTS_PROMPTS;

    var contents = [
      AiClient.buildTextContent('user', JSON.stringify(events)),
      AiClient.buildTextContent('user', CALENDAR_INSTRUCTIONS_PROMPT)
    ];
    const files = AiClient.getFiles();
    var result = extractJsonFromResponse(AiClient.processCall(contents, systemInstruction, files)[0]);
    logger.info(`Done preparing events.`);
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
    logger.info(`Processing calendar items`);
    const result = CalendarClient.getEventsForDate(calendarId, new Date());
    if (result.success) {
      const returnValue = [];
      try {
        if (result.events.length > 0) {
          logger.info(`Retrieved ${result.events.length} calendar items`);
          const filteredEvents = filterEventsForProcessing(result.events);

          if (filteredEvents.length === 0) {
            logger.info(`No events to process after filtering`);
            return returnValue;
          }

          // 1. Identification Phase: Gather all tasks needing preparation
          // Process all filtered events in one go
          logger.info(`Processing ${filteredEvents.length} events for identification`);
          
          const eventsWithContext = prepareCalendarEventsContext(filteredEvents);
          const tasksToSchedule = [];

          // Collect prep tasks
          for (const event of eventsWithContext.events) {
             if (event.preparation) {
                tasksToSchedule.push(event);
             } else {
                logger.info(`Not processing event ${event.title} since not needed.`);
             }
          }

          // 2. Scheduling Phase: Plan tasks to avoid overlaps
          if (tasksToSchedule.length > 0) {
             const scheduledTasks = schedulePreparationTasks(tasksToSchedule, result.events, filteredEvents, bufferMinutes);
             returnValue.push(...scheduledTasks);
          } else {
             logger.info("No preparation tasks identified.");
          }

        } else {
          logger.info(`No events found.`);
        }
      } catch (err) {
        logger.error(`Error during processing calendar result ${JSON.stringify(result)} due to error: ${err}`);
      }
      return returnValue;
    } else {
      logger.error(`Error occured during retrieval of calendarEvents ${result.error}`);
    }
  }

  /**
   * Create blocked period events from work time blocks
   * Converts available work periods into unavailable/blocked periods for the entire day
   *
   * IMPORTANT LIMITATIONS:
   * - Work blocks must be within a single calendar day (00:00-23:59)
   * - Blocks spanning midnight (e.g., night shifts 22:00-02:00) are NOT supported
   * - All times are interpreted within the same 24-hour period
   * - For 24/7 operations or night shifts, consider using separate blocks per day
   *
   * Algorithm:
   * 1. Sorts work blocks by start time
   * 2. Creates blocked periods BEFORE first block (00:00 to first start)
   * 3. Creates blocked periods BETWEEN blocks (breaks/lunch)
   * 4. Creates blocked periods AFTER last block (last end to 23:59)
   *
   * Example:
   *   Input:  [{start: "09:00", end: "12:00"}, {start: "13:00", end: "17:00"}]
   *   Output: [
   *     {startTime: "00:00", endTime: "09:00", title: "Outside work hours"},
   *     {startTime: "12:00", endTime: "13:00", title: "Break time"},
   *     {startTime: "17:00", endTime: "23:59", title: "Outside work hours"}
   *   ]
   *
   * @param {Date} date - The date to create blocked periods for
   * @param {Array} workTimeBlocks - Array of work blocks: [{start: "09:00", end: "12:00"}, ...]
   * @return {Array} Array of event-like objects representing blocked times
   */
  function createBlockedPeriodsFromWorkBlocks(date, workTimeBlocks) {
    if (!workTimeBlocks || workTimeBlocks.length === 0) {
      return [];
    }

    const blockedPeriods = [];
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Parse and sort work blocks by start time
    const parsedBlocks = workTimeBlocks
      .map(block => {
        const start = CalendarClient.parseTimeString(block.start);
        const end = CalendarClient.parseTimeString(block.end);
        if (!start || !end) {
          logger.error(`Invalid work time block: ${JSON.stringify(block)}`);
          return null;
        }
        return { start, end };
      })
      .filter(block => block !== null)
      .sort((a, b) => {
        if (a.start.hour !== b.start.hour) {
          return a.start.hour - b.start.hour;
        }
        return a.start.minute - b.start.minute;
      });

    if (parsedBlocks.length === 0) {
      logger.error('No valid work time blocks found');
      return [];
    }

    // Create blocked period from start of day to first work block
    const firstBlock = parsedBlocks[0];
    const firstBlockStart = new Date(date);
    firstBlockStart.setHours(firstBlock.start.hour, firstBlock.start.minute, 0, 0);

    if (firstBlockStart > dayStart) {
      blockedPeriods.push({
        startTime: dayStart.toISOString(),
        endTime: firstBlockStart.toISOString(),
        title: 'Outside work hours'
      });
    }

    // Create blocked periods between work blocks
    for (let i = 0; i < parsedBlocks.length - 1; i++) {
      const currentBlockEnd = new Date(date);
      currentBlockEnd.setHours(parsedBlocks[i].end.hour, parsedBlocks[i].end.minute, 0, 0);

      const nextBlockStart = new Date(date);
      nextBlockStart.setHours(parsedBlocks[i + 1].start.hour, parsedBlocks[i + 1].start.minute, 0, 0);

      if (nextBlockStart > currentBlockEnd) {
        blockedPeriods.push({
          startTime: currentBlockEnd.toISOString(),
          endTime: nextBlockStart.toISOString(),
          title: 'Break time'
        });
      }
    }

    // Create blocked period from last work block to end of day
    const lastBlock = parsedBlocks[parsedBlocks.length - 1];
    const lastBlockEnd = new Date(date);
    lastBlockEnd.setHours(lastBlock.end.hour, lastBlock.end.minute, 0, 0);

    if (lastBlockEnd < dayEnd) {
      blockedPeriods.push({
        startTime: lastBlockEnd.toISOString(),
        endTime: dayEnd.toISOString(),
        title: 'Outside work hours'
      });
    }

    logger.info(`Created ${blockedPeriods.length} blocked periods from ${parsedBlocks.length} work blocks`);
    return blockedPeriods;
  }

  function schedulePreparationTasks(tasksToSchedule, allEvents, filteredEvents, bufferMinutes = 0) {
    logger.info(`Identified ${tasksToSchedule.length} tasks to schedule. Starting planning phase.`);
    if (bufferMinutes > 0) {
      logger.info(`Using ${bufferMinutes} min buffer between events.`);
    }
    const scheduledTasks = [];

    // Sort tasks by event start time to schedule earlier meetings first
    tasksToSchedule.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    // Create blocked periods from work time blocks
    const blockedPeriods = createBlockedPeriodsFromWorkBlocks(new Date(), workTimeBlocks);

    // Helper function to apply buffer to events
    const applyBuffer = (events) => {
      return events.map(e => {
        const bufferedEndTime = new Date(new Date(e.endTime).getTime() + bufferMinutes * 60 * 1000);
        return {
          startTime: e.startTime,
          endTime: bufferedEndTime.toISOString(),
          title: e.title
        };
      });
    };

    // Track newly scheduled slots to include in both strict and lenient checks
    const newlyScheduledSlots = [];

    for (const event of tasksToSchedule) {
      try {
          logger.info(`Scheduling preparation for: ${event.title}`);
          var date = new Date();
          const eventStart = new Date(event.startTime);
          // Use AI estimated duration or default to 45
          logger.info(`Estimated duration: ${event.duration_estimation}`);
          const duration = event.duration_estimation || 45;
          
          // Build busy lists with buffer applied (pre-build for performance)
          // Apply buffer to calendar events and newly scheduled slots, but not to blocked periods
          const allEventsBusyList = [
            ...applyBuffer(allEvents),
            ...applyBuffer(newlyScheduledSlots),
            ...blockedPeriods.map(e => ({ startTime: e.startTime, endTime: e.endTime, title: e.title }))
          ];

          const lenientBusyList = [
            ...applyBuffer(filteredEvents),
            ...applyBuffer(newlyScheduledSlots),
            ...blockedPeriods.map(e => ({ startTime: e.startTime, endTime: e.endTime, title: e.title }))
          ];

          // Strategy 1: Strict - Avoid ALL events (filtered + skipped/placeholders) + blocked periods
          let scheduledTime = CalendarClient.findOpenSlot(allEventsBusyList, eventStart, duration);
          let schedulingStrategy = "Strict (Clean slot)";

          // Strategy 2: Lenient - Avoid ONLY processed events (allow overlap with skipped/placeholders) + blocked periods
          if (!scheduledTime) {
              logger.info(`No strict slot found for ${event.title}. Trying lenient strategy (overlapping skipped events).`);
              scheduledTime = CalendarClient.findOpenSlot(lenientBusyList, eventStart, duration);
              schedulingStrategy = "Lenient (Overlapping skipped events)";
          }

          // Strategy 3: Reduced duration fallback - Try 30min, 15min, 10min with both strict and lenient
          let actualDuration = duration;
          if (!scheduledTime) {
              logger.info(`No slot found with ${duration} min duration. Trying reduced durations.`);
              const fallbackDurations = [30, 15, 10];

              for (const reducedDuration of fallbackDurations) {
                  // Skip if reduced duration is same or larger than original
                  if (reducedDuration >= duration) continue;

                  logger.info(`Trying ${reducedDuration} min duration...`);

                  // Try strict strategy with reduced duration
                  scheduledTime = CalendarClient.findOpenSlot(allEventsBusyList, eventStart, reducedDuration);
                  if (scheduledTime) {
                      actualDuration = reducedDuration;
                      schedulingStrategy = `Strict (Reduced to ${reducedDuration} min)`;
                      logger.info(`Found strict slot with ${reducedDuration} min duration`);
                      break;
                  }

                  // Try lenient strategy with reduced duration (reuse pre-built list)
                  scheduledTime = CalendarClient.findOpenSlot(lenientBusyList, eventStart, reducedDuration);
                  if (scheduledTime) {
                      actualDuration = reducedDuration;
                      schedulingStrategy = `Lenient (Reduced to ${reducedDuration} min)`;
                      logger.info(`Found lenient slot with ${reducedDuration} min duration`);
                      break;
                  }
              }
          }

          if (scheduledTime) {
            date = scheduledTime;
            const endTime = new Date(date.getTime() + actualDuration * 60000);
            logger.info(`Scheduled (${schedulingStrategy}) preparation for ${event.title} at ${date.toISOString()} - ${endTime.toISOString()} (${actualDuration} mins)`);

            // Add this new slot to our tracker
            newlyScheduledSlots.push({
                startTime: date.toISOString(),
                endTime: endTime.toISOString(),
                title: `Reserved: Prep for ${event.title}`
            });
          } else {
            // Final fallback: Schedule 30 min before meeting
            logger.warn(`No slot found even with reduced durations. Scheduling 30 min before meeting as last resort.`);
            date = new Date(eventStart);
            date.setMinutes(date.getMinutes() - 30);
            actualDuration = 30;
            schedulingStrategy = "Last resort (30 min before)";
          }

          const task = {
              title: `Prepare for ${event.title}`,
              description: event.meeting_preparation_prompt,
              labels: [ENRICH_SCHEDULED],
              due_date: date ? date.toISOString() : new Date().toISOString(),
              project_id: todoistProjectId,
              duration: actualDuration,
              duration_unit: 'minute'
          }

          const todoistTask = createTodoistTasks([task]);
          scheduledTasks.push(todoistTask);
          
          // Rate limiting for task creation
          Utilities.sleep(2 * 1000);

      } catch (err) {
          logger.error(`Error during scheduling event ${event.title}. Due to ${err}`);
      }
    }
    return scheduledTasks;
  }

  function generateDailyBriefing() {
    logger.info('Generating Daily Briefing...');

    try {
      // 1. Gather Data
      const today = new Date();
      const calendarResult = CalendarClient.getEventsForDate(calendarId, today);

      // Filter: Today's tasks, Overdue tasks, or Priority 1 tasks
      // Todoist API: P1 is priority 4, P2 is 3, etc.
      // We fetch a broad range to give the AI context
      const tasks = TodoistClient.getTasksByFilter("today | overdue | p1");

      const calendarData = calendarResult.success ? calendarResult.events : [];
      const taskData = tasks ? tasks.map(t => ({
        content: t.content,
        description: t.description,
        priority: t.priority,
        due: t.due ? t.due.string : 'no date'
      })) : [];

      logger.info(`Gathered ${calendarData.length} events and ${taskData.length} tasks.`);

      // 2. Synthesize with AI
      const promptData = JSON.stringify({
        date: today.toLocaleDateString(),
        events: calendarData,
        tasks: taskData
      }, null, 2);

      const prompt = `
      You are an elite Executive Assistant.
      Date: ${today.toLocaleDateString()}

      ## Inputs
      ${promptData}

      ## Instruction
      Analyze the schedule and tasks. Produce a "Daily Briefing" in succinct Markdown.

      Structure:
      1. **🛑 Critical Focus**: The 1-2 absolute must-do items (meetings or tasks) today.
      2. **🗓️ Schedule Highlights**: Brief timeline. Flag tight transitions or conflicts.
      3. **⚡ Quick Wins**: Tasks that can be knocked out in 15 mins.
      4. **🧠 Prep Notes**: Mention any meeting that lacks a "preparation task" or agenda (based on title/description).

      Keep it concise, professional, and action-oriented.
      `;

      const systemInstruction = "You are a helpful, concise executive assistant.";
      const files = []; // No file context needed for speed/cost

      const aiResponse = AiClient.processCall(
        [AiClient.buildTextContent('user', prompt)],
        systemInstruction,
        files
      );

      if (!aiResponse || aiResponse.length === 0) {
        throw new Error("AI failed to generate briefing content.");
      }

      const briefingContent = aiResponse[0];

      // 3. Delivery to Todoist
      const briefingTask = {
        title: `📅 Daily Briefing: ${today.toLocaleDateString()}`,
        description: briefingContent,
        priority: 4, // P1
        due_string: "today",
        project_id: todoistProjectId,
        labels: []
      };

      TodoistClient.createTask(briefingTask);
      logger.info('Daily Briefing created successfully.');
      return true;

    } catch (err) {
      logger.error(`Error generating daily briefing: ${err.message}`);
      return false;
    }
  }

  function generateQuickWinsSummary() {
    logger.info('Generating Quick Wins Summary from Inbox...');

    try {
      // 1. Fetch inbox tasks
      const inboxTasks = TodoistClient.getTasksByFilter("#Inbox");

      if (!inboxTasks || inboxTasks.length === 0) {
        logger.info('No inbox tasks found');
        return false;
      }

      logger.info(`Found ${inboxTasks.length} inbox tasks`);

      // 2. Prepare task data for AI analysis
      const taskData = inboxTasks.map(t => ({
        id: t.id,
        content: t.content,
        description: t.description || '',
        priority: t.priority,
        labels: t.labels || []
      }));

      const prompt = `
      You are an elite productivity assistant specialized in time estimation and task prioritization.

      ## Task
      Analyze the following inbox tasks and identify which ones can be completed in LESS THAN 2 MINUTES.

      ## Inbox Tasks
      ${JSON.stringify(taskData, null, 2)}

      ## Instructions
      1. Carefully evaluate each task based on its title and description
      2. Consider complexity, dependencies, and typical execution time
      3. Be CONSERVATIVE - only mark tasks as "2-minute tasks" if they truly can be done quickly
      4. Common 2-minute tasks include:
         - Quick emails or messages
         - Simple yes/no decisions
         - Filing/organizing a single item
         - Quick lookups or checks
         - Short phone calls
      5. Exclude tasks that are vague, require research, coordination, or creative work

      ## Output Format
      Provide your response as a JSON object with this structure:
      {
        "quick_tasks": [
          {
            "id": "task_id",
            "content": "task title",
            "reason": "brief reason why this is a 2-minute task"
          }
        ],
        "summary": "A brief motivational summary (2-3 sentences) about these quick wins"
      }

      Return ONLY the JSON object, no markdown formatting.
      `;

      const systemInstruction = "You are a helpful productivity assistant that helps identify quick, actionable tasks.";
      const files = []; // No file context needed

      const aiResponse = AiClient.processCall(
        [AiClient.buildTextContent('user', prompt)],
        systemInstruction,
        files
      );

      if (!aiResponse || aiResponse.length === 0) {
        throw new Error("AI failed to analyze inbox tasks.");
      }

      // 3. Parse AI response
      const analysisResult = extractJsonFromResponse(aiResponse[0]);

      if (!analysisResult.quick_tasks || analysisResult.quick_tasks.length === 0) {
        logger.info('No 2-minute tasks identified in inbox');
        return false;
      }

      logger.info(`Identified ${analysisResult.quick_tasks.length} quick wins`);

      // 4. Build summary description
      let summaryDescription = `${analysisResult.summary}\n\n`;
      summaryDescription += `## ⚡ Quick Wins (${analysisResult.quick_tasks.length} tasks)\n\n`;

      analysisResult.quick_tasks.forEach((task, index) => {
        summaryDescription += `${index + 1}. **${task.content}**\n`;
        summaryDescription += `   _${task.reason}_\n\n`;
      });

      summaryDescription += `\n---\n_Review your Todoist inbox to complete these tasks._`;

      // 5. Create summary task scheduled for 9 AM today
      const today = new Date();
      const scheduledTime = new Date(today);
      scheduledTime.setHours(9, 0, 0, 0);

      const summaryTask = {
        title: `⚡ Quick Wins Summary: ${analysisResult.quick_tasks.length} tasks under 2 minutes`,
        description: summaryDescription,
        priority: 3, // P2
        due_date: scheduledTime.toISOString(),
        project_id: todoistProjectId,
        labels: [],
        duration: 15,
        duration_unit: 'minute'
      };

      TodoistClient.createTask(summaryTask);
      logger.info('Quick Wins Summary created successfully.');
      return true;

    } catch (err) {
      logger.error(`Error generating quick wins summary: ${err.message}`);
      return false;
    }
  }

  function aiFileManagement() {
    const grouping ={};
    const aifiles = AiClient.getFiles();
    logger.info(`Amount of files: ${aifiles.length}`);
    for (const file of aifiles){
      logger.info(`${file.name} - ${file.displayName}`);
      if (!grouping[file.displayName]){
        grouping[file.displayName] = [file];
      }else {
        grouping[file.displayName] = [...grouping[file.displayName], file];
      }
    }
    for (const [key, value] of Object.entries(grouping)) {
      if (value.length > 1){
        logger.info(`size: ${value.length} - ${JSON.stringify(value.slice(1))}`)
        const sliced = value.slice(1);
        for (const f of sliced){
          logger.info(AiClient.deleteFile(f.name));
        }
      }
    }
  }

  function validateConfiguration(config) {
    const errors = [];

    // Validate required string fields
    const requiredStrings = [
      'todoistApiKey',
      'gTaskListId',
      'calendarId',
      'geminiApiKey',
      'todoistProjectId',
      'label'
    ];

    for (const field of requiredStrings) {
      if (!config[field] || config[field] === '') {
        errors.push(`Missing required field: ${field}`);
      } else if (typeof config[field] !== 'string') {
        errors.push(`Field '${field}' must be a string`);
      } else if (config[field].startsWith('YOUR_') || config[field] === 'FOLDER_ID') {
        errors.push(`Field '${field}' contains placeholder value: ${config[field]}`);
      }
    }

    // Validate promptInstructions object
    if (!config.promptInstructions) {
      errors.push('Missing required field: promptInstructions');
    } else if (typeof config.promptInstructions !== 'object' || Array.isArray(config.promptInstructions)) {
      errors.push('Field \'promptInstructions\' must be an object with agents_prompt and calendar_instructions_prompt properties');
    } else {
      if (!config.promptInstructions.agents_prompt) {
        errors.push('Missing required field: promptInstructions.agents_prompt');
      }
      if (!config.promptInstructions.calendar_instructions_prompt) {
        errors.push('Missing required field: promptInstructions.calendar_instructions_prompt');
      }
    }

    // Validate driveFolders array (optional but must be array if provided)
    if (config.driveFolders !== undefined && config.driveFolders !== null) {
      if (!Array.isArray(config.driveFolders)) {
        errors.push('Field \'driveFolders\' must be an array');
      } else {
        for (let i = 0; i < config.driveFolders.length; i++) {
          if (!config.driveFolders[i] || !config.driveFolders[i].id) {
            errors.push(`driveFolders[${i}] must have an 'id' property`);
          }
        }
      }
    }

    // Validate workTimeBlocks array (optional but must be array with valid structure if provided)
    if (config.workTimeBlocks !== undefined && config.workTimeBlocks !== null) {
      if (!Array.isArray(config.workTimeBlocks)) {
        errors.push('Field \'workTimeBlocks\' must be an array');
      } else {
        for (let i = 0; i < config.workTimeBlocks.length; i++) {
          const block = config.workTimeBlocks[i];
          if (!block || typeof block !== 'object') {
            errors.push(`workTimeBlocks[${i}] must be an object`);
          } else {
            let startValid = false;
            let endValid = false;

            if (!block.start || typeof block.start !== 'string') {
              errors.push(`workTimeBlocks[${i}] must have a 'start' string property`);
            } else if (!/^\d{1,2}:\d{2}$/.test(block.start)) {
              errors.push(`workTimeBlocks[${i}].start must be in H:MM or HH:MM format (e.g., "9:00" or "09:00")`);
            } else {
              startValid = true;
            }

            if (!block.end || typeof block.end !== 'string') {
              errors.push(`workTimeBlocks[${i}] must have an 'end' string property`);
            } else if (!/^\d{1,2}:\d{2}$/.test(block.end)) {
              errors.push(`workTimeBlocks[${i}].end must be in H:MM or HH:MM format (e.g., "9:00" or "09:00")`);
            } else {
              endValid = true;
            }

            // Validate that start time is before end time (semantic validation)
            if (startValid && endValid) {
              const startMatch = block.start.match(/^(\d{1,2}):(\d{2})$/);
              const endMatch = block.end.match(/^(\d{1,2}):(\d{2})$/);

              const startHour = parseInt(startMatch[1], 10);
              const startMinute = parseInt(startMatch[2], 10);
              const endHour = parseInt(endMatch[1], 10);
              const endMinute = parseInt(endMatch[2], 10);

              // Validate hour and minute ranges
              if (startHour < 0 || startHour > 23 || startMinute < 0 || startMinute > 59) {
                errors.push(`workTimeBlocks[${i}].start has invalid time range (hours must be 0-23, minutes 0-59)`);
              }
              if (endHour < 0 || endHour > 23 || endMinute < 0 || endMinute > 59) {
                errors.push(`workTimeBlocks[${i}].end has invalid time range (hours must be 0-23, minutes 0-59)`);
              }

              // Convert to minutes for comparison
              const startMinutes = startHour * 60 + startMinute;
              const endMinutes = endHour * 60 + endMinute;

              if (endMinutes <= startMinutes) {
                errors.push(`workTimeBlocks[${i}].end must be after .start (${block.end} must be after ${block.start}). Note: Work blocks spanning midnight are not supported.`);
              }
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n  - ${errors.join('\n  - ')}\n\nPlease check your configuration file.`);
    }
  }

  return {
    processGoogleTasks,
    enrichTodoistTasks,
    processContextData,
    enrichTodaysTasksForLabel,
    processCalendarItems,
    aiFileManagement,
    generateDailyBriefing,
    generateQuickWinsSummary
  }
});




