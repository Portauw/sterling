# Sterling Library Examples

This directory contains usage examples for integrating Sterling Library into your Google Apps Script project.

## Prerequisites

Before using these examples, you must first deploy Sterling as a Google Apps Script library.

📚 **[Complete setup instructions →](../README.md#quick-start)**

The main README covers:
- Prerequisites (Node.js, clasp, Google Cloud Project)
- Cloning and deploying Sterling as a library
- Getting your Script ID

Once Sterling is deployed, return here to learn how to use it in your own projects.

---

## Using Sterling in Your Own Project

Once Sterling is deployed as a library, you can use it in any of your Apps Script projects:

#### Step 1: Create Your Own Apps Script Project

Create a new Apps Script project for your automation workflows:

```bash
clasp create --type standalone --title "My Sterling Automation"
```

Or create one directly in the [Apps Script editor](https://script.google.com).

#### Step 2: Add the Sterling Library

1. In your Apps Script project editor, click the **+** next to **Libraries** in the left sidebar
2. Paste the **Sterling Script ID** (from the deployment step in the main README)
3. Select the latest version from the dropdown
4. Set the identifier to `Sterling`
5. Click **Add**

#### Step 3: Write Your Automation Code

See **Example.js** below for a complete working example showing how to:
- Initialize Sterling with your configuration
- Create workflow functions
- Set up time-driven triggers

---

## Example.js

Complete example showing how to use Sterling Library in your own Google Apps Script project.

### Code Overview:

```javascript
// Initialize the Sterling library
var processor = Sterling.main({
    gTaskListId: 'YOUR_GTASK_LIST_ID',
    geminiApiKey: 'YOUR_GEMINI_API_KEY',
    geminiModel: 'gemini-3-flash-preview',
    calendarId: 'primary',
    // ... see Example.js for full configuration
});

// Create workflow functions that use the library
function syncAndEnrich() {
    processor.processGoogleTasks();
    processor.enrichTodoistTasks();
}
```

### Configuration:

Replace the placeholder values in Example.js with your actual credentials:

- `gTaskListId` - Your Google Tasks list ID
- `geminiApiKey` - Your Gemini API key from Google AI Studio
- `calendarId` - Your Google Calendar ID (e.g., 'primary')
- `todoistApiKey` - Your Todoist API token
- `todoistProjectId` - Your Todoist project ID
- `driveFolders[].id` - Your Google Drive folder IDs for AI context
- `promptInstructions.agents_prompt` - Drive file ID containing agent system prompts
- `promptInstructions.calendar_instructions_prompt` - Drive file ID containing calendar processing instructions

### Workflow Functions Demonstrated:

- **`syncAndEnrich()`** - Sync Google Tasks to Todoist and enrich with AI
- **`refreshContext()`** - Update Drive file context for AI
- **`handleEnrichingTasks()`** - Batch process tasks with 'enrich' label
- **`scheduledCalendarItemProcessing()`** - Create AI-powered meeting preparation tasks
- **`scheduledJustInTimeProcessing()`** - Just-in-time task preparation
- **`doPost(e)`** - Webhook endpoint for external triggers

### Setting Up Triggers:

Set up time-driven triggers in your Google Apps Script project:

1. Click **Triggers** (clock icon) in the left sidebar
2. Click **Add Trigger** and configure:
   - `syncAndEnrich()` - Every 10 minutes
   - `refreshContext()` - Every 5 minutes
   - `scheduledCalendarItemProcessing()` - Daily, 6-7 AM
   - `scheduledJustInTimeProcessing()` - Daily, 7-8 AM

---

## Additional Resources:

- [Sterling API Documentation](../docs/API.md) - Detailed API reference for all methods
- [Architecture Documentation](../docs/ARCHITECTURE.md) - System flows and architecture
- [Google Apps Script Library Guide](https://developers.google.com/apps-script/guides/libraries) - Official documentation on using libraries
