function main({
  gTaskListId,
  calendarId,
  geminiApiKey,
  geminiModel,
  todoistApiKey,
  label,
  todoistProjectId,
  promptInstructions,
  driveFolders = [],
  workDayStartHour = 9,
  workDayEndHour = 17
}) {
  Telemetry.init({
    todoistApiKey: todoistApiKey, // For error notifications to Todoist
    adminTodoistProjectId: todoistProjectId, // Assuming errors go to the main project
    env: 'PROD' // Or dynamically determine 'DEV' / 'PROD'
  });

  const processor = Processor({
    gTaskListId,
    calendarId,
    geminiApiKey,
    geminiModel,
    promptInstructions,
    todoistApiKey,
    label,
    todoistProjectId,
    driveFolders,
    workDayStartHour,
    workDayEndHour
  });
  return processor;
}

/**
 * Trigger function for Daily Briefing.
 * Configure a Time-driven trigger to run this function daily (e.g., 7:00 AM).
 */
function generateDailyBriefingTrigger() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const config = scriptProperties.getProperties();

  // Parse config values
  const gTaskListId = config.G_TASK_LIST_ID;
  const calendarId = config.CALENDAR_ID;
  const geminiApiKey = config.GEMINI_API_KEY;
  const geminiModel = config.GEMINI_MODEL;
  const todoistApiKey = config.TODOIST_API_KEY;
  const label = config.TODOIST_DEFAULT_LABEL || 'gemini';
  const todoistProjectId = config.TODOIST_PROJECT_ID;
  
  // Prompt instructions are stored as file IDs
  const promptInstructions = {
    agents_prompt: config.PROMPT_INSTRUCTIONS_FOLDER_ID,
    calendar_instructions_prompt: config.CALENDAR_INSTRUCTIONS_PROMPT_ID
  };

  const driveFolders = config.DRIVE_FOLDERS ? JSON.parse(config.DRIVE_FOLDERS) : [];
  const workDayStartHour = config.WORK_DAY_START_HOUR ? parseInt(config.WORK_DAY_START_HOUR) : 9;
  const workDayEndHour = config.WORK_DAY_END_HOUR ? parseInt(config.WORK_DAY_END_HOUR) : 17;

  // Re-use the main function logic to initialize processor
  const processor = main({
    gTaskListId,
    calendarId,
    geminiApiKey,
    geminiModel,
    todoistApiKey,
    label,
    todoistProjectId,
    promptInstructions,
    driveFolders,
    workDayStartHour,
    workDayEndHour
  });

  processor.generateDailyBriefing();
}