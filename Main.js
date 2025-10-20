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
  const processor = Processor({
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
  return processor;
}