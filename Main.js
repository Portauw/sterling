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