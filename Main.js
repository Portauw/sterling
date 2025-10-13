function main({
  gTaskListId,
  calendarId,
  geminiApiKey,
  geminiModel,
  embeddingModel,
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
    embeddingModel,
    promptInstructions,
    todoistApiKey,
    label,
    todoistProjectId,
    driveFolders
  });
}