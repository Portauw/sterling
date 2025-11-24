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