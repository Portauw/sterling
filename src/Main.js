/**
 * Main entry point for the AI assistant processor
 *
 * @param {Object} config - Configuration object
 * @param {string} config.gTaskListId - Google Tasks list ID
 * @param {string} config.calendarId - Google Calendar ID (e.g., 'primary')
 * @param {string} config.geminiApiKey - Gemini API key
 * @param {string} config.geminiModel - Gemini model name
 * @param {string} config.todoistApiKey - Todoist API key
 * @param {string} config.label - Label for task filtering
 * @param {string} config.todoistProjectId - Todoist project ID
 * @param {Object} config.promptInstructions - Drive file IDs for prompts
 * @param {Array} config.driveFolders - Array of Drive folder objects (default: [])
 * @param {Array<{start: string, end: string}>} config.workTimeBlocks - Work time blocks (default: 09:00-12:00, 13:00-17:00)
 *   - Format: [{start: "HH:MM", end: "HH:MM"}, ...]
 *   - Both "9:00" and "09:00" formats accepted
 *   - Blocks define when tasks can be scheduled
 *   - Gaps between blocks become break periods
 *   - LIMITATION: Blocks must be within same day (00:00-23:59), no midnight-spanning
 * @param {number} config.bufferMinutes - Buffer time in minutes to add after each event (default: 0)
 *   - Adds transition time between events and prep tasks
 *   - Example: With 5 min buffer, if meeting ends at 13:00, prep can't start until 13:05
 *   - Applied to calendar events and scheduled prep tasks, not to work time blocks
 * @return {Object} Processor instance
 */
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
  workTimeBlocks = [
    { start: "09:00", end: "12:00" },
    { start: "13:00", end: "17:00" }
  ],
  bufferMinutes = 0
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
    workTimeBlocks,
    bufferMinutes
  });
  return processor;
}