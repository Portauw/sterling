# Sterling Library API Reference

Complete API documentation for Sterling Library, a Google Apps Script library for intelligent task automation.

## Table of Contents

- [Initialization](#initialization)
- [Core Methods](#core-methods)
- [Advanced Methods](#advanced-methods)
- [Configuration Reference](#configuration-reference)
- [Usage Examples](#usage-examples)

---

## Initialization

### `Sterling.main(config)`

Initializes and returns a Processor instance with all automation methods.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `gTaskListId` | string | ✅ | Google Tasks list ID |
| `calendarId` | string | ✅ | Google Calendar ID (e.g., 'primary' or email address) |
| `geminiApiKey` | string | ✅ | Gemini API key from [Google AI Studio](https://aistudio.google.com/) |
| `geminiModel` | string | ✅ | Gemini model name (e.g., 'gemini-3-flash-preview') |
| `todoistApiKey` | string | ✅ | Todoist API token from [Todoist Settings](https://todoist.com/app/settings/integrations) |
| `label` | string | ✅ | Default label for synced tasks |
| `todoistProjectId` | string | ✅ | Todoist project ID for new tasks |
| `promptInstructions` | object | ✅ | Drive file IDs for AI prompts (see below) |
| `driveFolders` | array | Optional | Array of Drive folder objects for AI context (default: `[]`) |
| `workTimeBlocks` | array | Optional | Work hour blocks for scheduling (default: see below) |
| `bufferMinutes` | number | Optional | Buffer time between events in minutes (default: `0`) |

**promptInstructions object:**

```javascript
{
  agents_prompt: 'DRIVE_FILE_ID',              // System prompt for AI agent
  calendar_instructions_prompt: 'DRIVE_FILE_ID' // Instructions for calendar processing
}
```

**driveFolders array:**

```javascript
[
  { name: 'People', id: 'FOLDER_ID' },
  { name: 'Meetings', id: 'FOLDER_ID' },
  { name: 'Projects', id: 'FOLDER_ID' }
]
```

**workTimeBlocks array (default):**

```javascript
[
  { start: "09:00", end: "12:00" },  // Morning block
  { start: "13:00", end: "17:00" }   // Afternoon block
]
```

**Returns:** `Processor` instance with public methods

**Example:**

```javascript
const processor = Sterling.main({
  gTaskListId: 'YOUR_GTASK_LIST_ID',
  calendarId: 'primary',
  geminiApiKey: 'YOUR_GEMINI_API_KEY',
  geminiModel: 'gemini-3-flash-preview',
  todoistApiKey: 'YOUR_TODOIST_API_KEY',
  todoistProjectId: 'YOUR_PROJECT_ID',
  label: 'automation',
  promptInstructions: {
    agents_prompt: 'DRIVE_FILE_ID_1',
    calendar_instructions_prompt: 'DRIVE_FILE_ID_2'
  },
  driveFolders: [
    { name: 'Context', id: 'FOLDER_ID' }
  ],
  workTimeBlocks: [
    { start: "09:00", end: "12:00" },
    { start: "13:00", end: "17:00" }
  ],
  bufferMinutes: 5
});
```

---

## Core Methods

### `processGoogleTasks()`

Syncs Google Tasks to Todoist and marks them as complete.

**Parameters:** None

**Returns:** `void`

**Behavior:**
1. Fetches Google Tasks updated in the last 35 minutes
2. Creates corresponding tasks in Todoist
3. Adds labels based on task type (EMAIL tasks get 'email' label)
4. Marks original Google Tasks as complete

**Recommended Trigger:** Time-driven, every 10 minutes

**Example:**

```javascript
function syncTasks() {
  const processor = Sterling.main({...});
  processor.processGoogleTasks();
}
```

**Related Configuration:**
- `gTaskListId` - Which Google Tasks list to sync
- `label` - Default label for synced tasks
- `todoistProjectId` - Destination project in Todoist

---

### `enrichTodoistTasks()`

AI-enhances tasks with the 'enrich' label or tasks where the last comment contains '@ai'.

**Parameters:** None

**Returns:** `boolean` - `true` on success

**Behavior:**
1. Fetches tasks updated since last sync (incremental sync)
2. For each task with 'enrich' label OR last comment containing '@ai':
   - Sends task to Gemini AI with full context (Drive files, previous comments)
   - Creates comment with AI response (prefixed with "AI: ")
   - Removes 'enrich' label if present
3. Rate limits: 10-second sleep between tasks

**Recommended Trigger:** Time-driven, every 10 minutes

**Example:**

```javascript
function aiEnrichment() {
  const processor = Sterling.main({...});
  processor.enrichTodoistTasks();
}
```

**AI Context Includes:**
- System instructions from `promptInstructions.agents_prompt`
- All uploaded Drive files
- Task title and description
- Previous comments (maintains conversation history)
- Google Search and URL context tools

**Related Configuration:**
- `geminiApiKey` - API key for Gemini
- `geminiModel` - Which model to use
- `promptInstructions.agents_prompt` - System prompt file ID
- `driveFolders` - Context files for AI

---

### `processCalendarItems()`

Analyzes today's calendar events and creates AI-generated meeting preparation tasks.

**Parameters:** None

**Returns:** `array` - Array of created preparation tasks

**Behavior:**
1. Fetches today's calendar events (status: INVITED/MAYBE/YES/OWNER)
2. Filters events:
   - Skips all-day events
   - Skips events with ≤1 attendees (solo/no-attendee events)
3. Sends filtered events to AI for analysis (batches of 3)
4. Creates preparation tasks for meetings requiring prep
5. Smart scheduling with 3-tier strategy:
   - **Strict**: Avoids all calendar events
   - **Lenient**: Avoids only processed events
   - **Fallback**: 30 min before meeting
6. Rate limits: 10 seconds between AI calls, 2 seconds between task creation

**Recommended Trigger:** Time-driven, daily between 6-7 AM

**Example:**

```javascript
function dailyMeetingPrep() {
  const processor = Sterling.main({...});
  processor.processCalendarItems();
}
```

**Preparation Task Format:**
- **Title:** "Prepare for {event title}"
- **Description:** AI-generated preparation guidance
- **Label:** 'enrich_scheduled'
- **Duration:** AI-estimated or 45 minutes default
- **Due:** Automatically scheduled in open calendar slot

**Related Configuration:**
- `calendarId` - Which calendar to process
- `promptInstructions.calendar_instructions_prompt` - Calendar-specific instructions
- `workTimeBlocks` - Available work hours for scheduling
- `bufferMinutes` - Buffer time after events

---

### `processContextData(forceUpdate?)`

Uploads Drive files to Gemini for AI context with intelligent caching.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `forceUpdate` | boolean | Optional | `false` | Force upload all files regardless of cache status |

**Returns:** `void`

**Behavior:**
1. Iterates through all folders in `driveFolders`
2. For each file, checks if update needed:
   - File has no stored metadata
   - File modified since last upload
   - File metadata expired (>10 minutes)
   - `forceUpdate` is true
3. Uploads changed files to Gemini API
4. Stores file metadata in Script Properties
5. Maintains list of current files for deletion detection

**Recommended Trigger:** Time-driven, every 5 minutes

**Example:**

```javascript
function refreshAIContext() {
  const processor = Sterling.main({...});
  processor.processContextData();
}

// Force refresh all files
function forceRefreshContext() {
  const processor = Sterling.main({...});
  processor.processContextData(true);
}
```

**Smart Caching:**
- Only uploads changed files (checks `lastUpdated` timestamp)
- 10-minute TTL for file metadata
- Near-real-time context with minimal API costs

**Related Configuration:**
- `driveFolders` - Which folders to monitor for context files

---

## Advanced Methods

### `enrichTodaysTasksForLabel(label)`

Batch enriches all tasks due today with a specific label, deleting previous comments for a fresh start.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `label` | string | ✅ | Label to filter tasks by (e.g., 'prepare_jit') |

**Returns:** `void`

**Behavior:**
1. Fetches tasks due today with specified label
2. For each task:
   - Deletes all existing comments (fresh start)
   - Sends to AI with Drive context
   - Creates comment with AI response
   - Removes the label
3. Rate limits: 20-second sleep between tasks

**Recommended Trigger:** Time-driven, daily between 7-8 AM with label 'prepare_jit'

**Example:**

```javascript
function jitPreparation() {
  const processor = Sterling.main({...});
  processor.enrichTodaysTasksForLabel('prepare_jit');
}
```

**Use Case:** Just-in-time task preparation at start of day

**Related Configuration:**
- `geminiApiKey`, `geminiModel` - AI configuration
- `promptInstructions.agents_prompt` - System prompt
- `driveFolders` - Context files

---

### `generateDailyBriefing()`

Creates an executive summary task with today's calendar events and priority tasks.

**Parameters:** None

**Returns:** `boolean` - `true` on success, `false` on failure

**Behavior:**
1. Fetches today's calendar events
2. Fetches tasks: today, overdue, or priority 1
3. Sends to AI for analysis
4. Creates P1 task with Markdown briefing containing:
   - **Critical Focus**: 1-2 must-do items
   - **Schedule Highlights**: Timeline with conflicts/tight transitions
   - **Quick Wins**: 15-minute tasks
   - **Prep Notes**: Meetings lacking preparation/agenda

**Recommended Trigger:** Time-driven, daily between 6-7 AM

**Example:**

```javascript
function morningBriefing() {
  const processor = Sterling.main({...});
  processor.generateDailyBriefing();
}
```

**Output Task:**
- **Title:** "📅 Daily Briefing: {date}"
- **Priority:** P1 (4)
- **Due:** Today
- **Description:** AI-generated Markdown briefing

**Related Configuration:**
- `calendarId` - Calendar for events
- `todoistProjectId` - Where to create briefing task
- `geminiApiKey`, `geminiModel` - AI configuration

---

### `generateQuickWinsSummary()`

Analyzes inbox tasks to identify quick 2-minute tasks and creates a summary.

**Parameters:** None

**Returns:** `boolean` - `true` on success, `false` if no tasks/quick wins found

**Behavior:**
1. Fetches all tasks from #Inbox project
2. Sends to AI for conservative 2-minute task analysis
3. AI excludes vague tasks, research, coordination, creative work
4. Creates P2 summary task scheduled at 9 AM with:
   - Numbered list of quick wins
   - Reason for each selection
   - Motivational summary (2-3 sentences)

**Recommended Trigger:** Time-driven, daily between 6-7 AM

**Example:**

```javascript
function identifyQuickWins() {
  const processor = Sterling.main({...});
  processor.generateQuickWinsSummary();
}
```

**Output Task:**
- **Title:** "⚡ Quick Wins Summary: {count} tasks under 2 minutes"
- **Priority:** P2 (3)
- **Due:** Today 9:00 AM
- **Duration:** 15 minutes
- **Description:** Formatted list with rationale

**Common 2-Minute Tasks Identified:**
- Quick emails
- Simple yes/no decisions
- Short phone calls
- Lookups/checks

**Related Configuration:**
- `todoistProjectId` - Where to create summary task
- `geminiApiKey`, `geminiModel` - AI configuration

---

## Configuration Reference

### Required Services

Sterling uses the following Google services:

1. **Google Tasks API** - For task synchronization
2. **Google Calendar API** - For calendar event processing
3. **Google Drive API** - For context file access
4. **Generative Language API** (Gemini) - For AI features
5. **Google Apps Script API** - For library deployment

> **Note:** Apps Script will automatically request permissions for these services when you first run the script. No manual API enabling is required.

### Getting API Keys & IDs

**Gemini API Key:**
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API key"
3. Create or select GCP project
4. Copy API key

**Todoist API Token:**
1. Go to [Todoist Settings > Integrations](https://todoist.com/app/settings/integrations)
2. Scroll to "API token"
3. Copy token

**Google Tasks List ID:**
```javascript
function getTaskListId() {
  const lists = Tasks.Tasklists.list();
  lists.items.forEach(list => {
    Logger.log(`${list.title}: ${list.id}`);
  });
}
```

**Todoist Project ID:**
1. Open project in Todoist web app
2. URL format: `https://todoist.com/app/project/PROJECT_ID`
3. Copy `PROJECT_ID` from URL

**Drive Folder ID:**
1. Open folder in Google Drive
2. URL format: `https://drive.google.com/drive/folders/FOLDER_ID`
3. Copy `FOLDER_ID` from URL

**Drive File ID (for prompts):**
1. Open file in Google Drive
2. Click Share → Copy link
3. URL format: `https://drive.google.com/file/d/FILE_ID/view`
4. Copy `FILE_ID` from URL

### Work Time Blocks

Define when tasks can be scheduled. Times must be within same day (no midnight-spanning).

**Format:**
```javascript
workTimeBlocks: [
  { start: "HH:MM", end: "HH:MM" },
  { start: "HH:MM", end: "HH:MM" }
]
```

**Examples:**

```javascript
// Standard 9-5 with lunch
workTimeBlocks: [
  { start: "09:00", end: "12:00" },
  { start: "13:00", end: "17:00" }
]

// Early bird
workTimeBlocks: [
  { start: "07:00", end: "11:00" },
  { start: "12:00", end: "16:00" }
]

// Single block
workTimeBlocks: [
  { start: "09:00", end: "17:00" }
]
```

**How It Works:**
- System creates "blocked periods" for times **outside** work blocks
- Blocked periods act as unavailable time slots
- Meeting prep tasks avoid blocked periods
- Gaps between blocks (e.g., 12:00-13:00) become break time

### Buffer Minutes

Add transition time after calendar events before scheduling prep tasks.

**Default:** `0` (no buffer)

**Example Use Cases:**

```javascript
// No buffer - tasks can be scheduled immediately after events
bufferMinutes: 0

// 5-minute buffer - allows quick bio break/transition
bufferMinutes: 5

// 15-minute buffer - prevents back-to-back scheduling
bufferMinutes: 15
```

**Applies To:**
- Calendar events when finding open slots
- Previously scheduled prep tasks
- Does NOT apply to work time block boundaries

---

## Usage Examples

### Basic Task Sync

Sync Google Tasks to Todoist every 10 minutes:

```javascript
function syncTasks() {
  const processor = Sterling.main({
    gTaskListId: 'YOUR_GTASK_LIST_ID',
    calendarId: 'primary',
    geminiApiKey: 'YOUR_KEY',
    geminiModel: 'gemini-3-flash-preview',
    todoistApiKey: 'YOUR_TOKEN',
    todoistProjectId: 'PROJECT_ID',
    label: 'from-gtasks',
    promptInstructions: {
      agents_prompt: 'FILE_ID',
      calendar_instructions_prompt: 'FILE_ID'
    }
  });

  processor.processGoogleTasks();
}

// Trigger: Every 10 minutes
```

### AI-Enhanced Workflow

Full automation with AI enrichment and context sync:

```javascript
function aiWorkflow() {
  const processor = Sterling.main({
    gTaskListId: 'YOUR_GTASK_LIST_ID',
    calendarId: 'primary',
    geminiApiKey: 'YOUR_KEY',
    geminiModel: 'gemini-3-flash-preview',
    todoistApiKey: 'YOUR_TOKEN',
    todoistProjectId: 'PROJECT_ID',
    label: 'automation',
    promptInstructions: {
      agents_prompt: 'FILE_ID',
      calendar_instructions_prompt: 'FILE_ID'
    },
    driveFolders: [
      { name: 'People', id: 'FOLDER_ID_1' },
      { name: 'Projects', id: 'FOLDER_ID_2' }
    ]
  });

  // Run context refresh first (every 5 min)
  processor.processContextData();

  // Then task operations (every 10 min)
  processor.processGoogleTasks();
  processor.enrichTodoistTasks();
}
```

### Complete Daily Automation

All features with recommended scheduling:

```javascript
// Trigger: Every 5 minutes
function refreshContext() {
  const processor = Sterling.main({...});
  processor.processContextData();
}

// Trigger: Every 10 minutes
function taskSync() {
  const processor = Sterling.main({...});
  processor.processGoogleTasks();
  processor.enrichTodoistTasks();
}

// Trigger: Daily, 6-7 AM
function morningRoutine() {
  const processor = Sterling.main({...});
  processor.generateDailyBriefing();
  processor.generateQuickWinsSummary();
  processor.processCalendarItems();
}

// Trigger: Daily, 7-8 AM
function dailyPreparation() {
  const processor = Sterling.main({...});
  processor.enrichTodaysTasksForLabel('prepare_jit');
  processor.enrichTodaysTasksForLabel('enrich_scheduled');
}
```

### Custom Work Hours & Buffering

Configure work schedule and transition time:

```javascript
function customSchedule() {
  const processor = Sterling.main({
    gTaskListId: 'YOUR_GTASK_LIST_ID',
    calendarId: 'primary',
    geminiApiKey: 'YOUR_KEY',
    geminiModel: 'gemini-3-flash-preview',
    todoistApiKey: 'YOUR_TOKEN',
    todoistProjectId: 'PROJECT_ID',
    label: 'automation',
    promptInstructions: {
      agents_prompt: 'FILE_ID',
      calendar_instructions_prompt: 'FILE_ID'
    },
    // Early bird schedule
    workTimeBlocks: [
      { start: "07:00", end: "11:00" },
      { start: "12:00", end: "16:00" }
    ],
    // 10-minute buffer between events
    bufferMinutes: 10
  });

  processor.processCalendarItems();
}
```

---

## Error Handling

All methods include comprehensive error handling:

- **Try-catch blocks** around major operations
- **Structured logging** via Telemetry module
- **Retry logic** for AI calls (3 retries, 30-second intervals)
- **Rate limiting** to prevent API throttling
- **Graceful degradation** when services unavailable

**Example Error Log:**

```javascript
Processor: Failed to enrich task with error: API quota exceeded
AI: Retrying API call (attempt 2/3)
```

---

## Rate Limits & Best Practices

### API Rate Limits

| Operation | Sleep Time | Purpose |
|-----------|-----------|---------|
| AI task enrichment | 10 seconds | Prevent Gemini API throttling |
| Meeting prep creation | 2 seconds | Prevent Todoist API throttling |
| JIT preparation | 20 seconds | Spread AI load |
| AI batch calls | 10 seconds | Calendar processing rate limit |

### Best Practices

1. **Context Files:**
   - Keep Drive files concise (< 1MB each)
   - Use Markdown for better AI comprehension
   - Organize by category (People, Projects, etc.)

2. **Prompt Instructions:**
   - Store as Google Docs or Markdown files
   - Version control via Drive file history
   - Include clear, specific instructions

3. **Work Time Blocks:**
   - Align with actual availability
   - Include lunch breaks as gaps
   - Account for recurring meetings

4. **Triggers:**
   - Use recommended schedules (see each method)
   - Spread out heavy operations
   - Monitor execution logs

5. **Testing:**
   - Start with `processContextData()` alone
   - Add methods incrementally
   - Check Script Properties for proper caching

---

## Troubleshooting

### Common Issues

**"Configuration validation failed"**
- Check all required parameters are provided
- Ensure no placeholder values (YOUR_, FOLDER_ID)
- Verify parameter types match specification

**"API quota exceeded"**
- Check Gemini API quota in Google Cloud Console
- Reduce context file sizes
- Increase sleep times between operations

**"No tasks found"**
- Verify Todoist project ID is correct
- Check label exists in Todoist
- Ensure tasks meet filter criteria

**"Failed to upload file"**
- Verify Drive folder IDs are correct
- Check file permissions (must be readable)
- Ensure files aren't too large (>20MB)

### Debugging

**Enable verbose logging:**

```javascript
function debug() {
  const processor = Sterling.main({...});

  // Check what files are being tracked
  Logger.log(PropertiesService.getScriptProperties().getKeys());

  // Test context upload
  processor.processContextData(true);  // Force refresh

  // Check sync token
  Logger.log(PropertiesService.getScriptProperties().getProperty('TODOIST_LAST_SYNC_TOKEN'));
}
```

---

## Related Documentation

- **[Examples & Setup Guide](../examples/README.md)** - Complete setup and integration examples
- **[Architecture Documentation](./ARCHITECTURE.md)** - System flows and diagrams
- **[Main README](../README.md)** - Overview and features

---

## Support

- **Issues:** Report bugs and request features via [GitHub Issues](../../issues)
- **Discussions:** Ask questions in [GitHub Discussions](../../discussions)
- **Documentation:** Check [examples/](../examples/) for more code samples
