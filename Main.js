function main({
  gTaskListId,
  calendarId,
  geminiApiKey,
  geminiModel,
  todoistApiKey,
  label,
  todoistProjectId,
  promptInstructions,
  driveFolders = []
}) {
  return Processor({
    gTaskListId,
    calendarId,
    geminiApiKey,
    geminiModel,
    promptInstructions,
    todoistApiKey,
    label,
    todoistProjectId,
    driveFolders
  });
}