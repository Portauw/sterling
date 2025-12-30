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

## Setting Up Todoist Webhooks

The `doPost(e)` function enables real-time task enrichment triggered by Todoist webhooks. When you create or update a task in Todoist, the webhook can automatically trigger Sterling's AI enrichment.

### Step 1: Deploy Your Script as a Web App

1. In your Apps Script project editor, click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**
3. Configure the deployment:
   - **Description**: "Todoist Webhook Handler" (or any description)
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
4. Click **Deploy**
5. **Copy the Web App URL** - you'll need this for Todoist webhook configuration
   - Format: `https://script.google.com/macros/s/SCRIPT_ID/exec`

> **Note**: If you make changes to your code, you need to create a **New deployment** (not just save). Click **Deploy** → **Manage deployments** → **Edit** → **Version: New version** → **Deploy**.

### Step 2: Configure Todoist Webhook

1. Go to [Todoist App Management](https://developer.todoist.com/appconsole.html)
2. Select your app (or create a new one if you don't have one)
3. Scroll to **Webhooks** section
4. Click **Add webhook**
5. Configure the webhook:
   - **Webhook callback URL**: Paste your Web App URL from Step 1
   - **Events to watch**: Select the events that should trigger enrichment:
     - `item:added` - New tasks created
     - `item:updated` - Existing tasks updated
6. Click **Save**

### Step 3: Test the Webhook

1. Create a new task in Todoist with the "enrich" label
2. The webhook should trigger your `doPost(e)` function
3. Check your Apps Script project's **Executions** log to verify:
   - Click **Executions** (play icon) in the left sidebar
   - Look for recent executions of `doPost`
4. The task should be automatically enriched with AI-generated content

### How It Works

When Todoist sends a webhook event:

1. **Todoist** detects a task change (created/updated)
2. **Webhook fires** to your Web App URL
3. **doPost(e) receives** the webhook payload
4. **processor.enrichTodoistTasks()** runs to process tasks with the "enrich" label
5. **Sterling AI** enriches the task with context and details

The `doPost(e)` implementation in Example.js:

```javascript
function doPost(e) {
    processor.enrichTodoistTasks();
}
```

### Interactive Task Refinement with @ai Comments

You can have a **conversational back-and-forth** with Sterling AI by adding comments to your Todoist tasks that start with `@ai`:

**Example workflow:**

1. **Create a task** in Todoist: "Plan team retrospective"
2. **Add the "enrich" label** - Sterling AI automatically adds context and suggestions via a comment
3. **Ask follow-up questions** by adding a comment: `@ai What are some effective retrospective formats for remote teams?`
4. **Sterling responds** with a new comment containing AI-generated insights
5. **Continue the conversation**: `@ai Focus on time-boxed activities under 30 minutes`

**How @ai comments work:**

- **Trigger**: Adding a comment starting with `@ai` triggers the webhook (via `item:updated` event)
- **Processing**: Sterling detects the @ai comment and sends it to Gemini AI along with the task context
- **Response**: AI generates a contextual response and adds it as a new task comment
- **Conversation**: The entire comment thread becomes context for future @ai questions

**Use cases:**

- **Clarify requirements**: `@ai What resources would I need for this?`
- **Break down tasks**: `@ai Split this into smaller subtasks`
- **Get alternatives**: `@ai What are other approaches to solve this?`
- **Add context**: `@ai Consider that this needs to be done before the Friday deadline`

> **Note**: Make sure the task has the "enrich" label for @ai comments to be processed. The webhook will trigger on any task update, but only tasks with the "enrich" label will be processed by `enrichTodoistTasks()`.

### Troubleshooting

**Webhook not triggering:**
- Verify the Web App URL is correct in Todoist webhook settings
- Ensure **Who has access** is set to "Anyone" in deployment settings
- Check Apps Script **Executions** log for errors

**Enrichment not working:**
- Verify tasks have the "enrich" label
- Check your Gemini API key is valid
- Review the Apps Script logs for error messages

---

## Additional Resources:

- [Sterling API Documentation](../docs/API.md) - Detailed API reference for all methods
- [Architecture Documentation](../docs/ARCHITECTURE.md) - System flows and architecture
- [Google Apps Script Library Guide](https://developers.google.com/apps-script/guides/libraries) - Official documentation on using libraries
