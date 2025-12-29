# Sterling Library: Personal AI Assistant

## Project Overview



This Google Apps Script project acts as a personal AI assistant integrating Google Tasks, Google Calendar, and Todoist with Gemini AI. The system automates task creation, enriches tasks with AI-generated content, and helps prepare for calendar events.
For detailed information on type of data, files, update frequency look at the @context_data_analysis_insights.md file for the documentation.

**Core Functionality:**

*   **Google Tasks to Todoist:** Automatically converts Google Tasks into Todoist tasks
*   **AI-Powered Task Enrichment:** Uses Gemini to add context and information to Todoist tasks labeled with "enrich"
*   **Calendar Event Preparation:** Analyzes Google Calendar events and creates preparatory tasks in Todoist, scheduled in open slots before the event (or 30 minutes prior as fallback)
*   **File-based Context:** Leverages files from Google Drive to provide context to the AI

## Key Components

*   **`Main.js`:** Entry point that initializes the `Processor` with configuration parameters (API keys, folder IDs, etc.)
*   **`Processor.js`:** Central orchestrator coordinating all services and implementing core business logic
*   **`AI.js`:** Gemini API client handling file uploads, content generation, and retry logic (3 retries with 30-second intervals)
*   **`Todoist.js`:** Todoist API client managing tasks and comments with sync token tracking
*   **`Calendar.js`:** Google Calendar API client managing calendar events and date processing
*   **`GoogleTask.js`:** Google Tasks API client with interval-based processing
*   **`Vault.js`:** Google Drive utility for file interactions and context management
*   **`PropertiesUtil.js`:** Script properties management with expiration tracking
*   **`Telemetry.js`:** Centralized logging with sensitive data redaction and structured output

## Deployment and Testing

### Deployment Commands
```bash
clasp push    # Deploy code to Google Apps Script
clasp pull    # Pull changes from Apps Script editor
clasp open    # Open project in Apps Script editor
```

### Test Functions (via Apps Script editor)
*   `test()` - Runs task enrichment process
*   `calendar()` - Processes calendar events

### Configuration Requirements
The main function requires extensive configuration including:
*   Gemini API key and model specifications
*   Todoist API key and project ID
*   Google service IDs (Tasks list, Calendar)
*   Drive folder IDs for context files
*   Prompt instruction file IDs stored in Google Drive
*   Work time blocks (optional, default: 9-12, 13-17) - defines available scheduling periods
*   Buffer minutes (optional, default: 0) - adds transition time between events

## Architecture Patterns

### Module Structure
Each service follows IIFE pattern for encapsulation:
```javascript
const ModuleName = (function ({ config }) {
  function log(message) {
    console.log(`ModuleName: ${JSON.stringify(message, null, 2)}`);
  }

  return { publicAPI };
});
```

### Error Handling & Logging
*   Consistent logging with module-specific prefixes via Telemetry.js
*   Graceful API error handling with `muteHttpExceptions`
*   Retry mechanisms for critical operations (AI client with 3 retries, 30-second intervals)
*   Utilities.sleep() for rate limiting between AI operations

### Data Processing Flow
1. **Context Update:** Drive files processed and uploaded to Gemini for context
2. **Task Synchronization:** Google Tasks converted to Todoist tasks
3. **AI Enrichment:** Tasks with "enrich" label enhanced with AI-generated content
4. **Calendar Processing:** Events analyzed for preparation task creation

### Key Implementation Details
*   Properties Service used for file metadata and sync token management
*   File expiration tracking prevents unnecessary AI uploads
*   Calendar preparation tasks scheduled in open slots based on AI-estimated duration (default 45 mins), with multi-tier fallback strategy:
    *   Strict scheduling (avoid all events)
    *   Lenient scheduling (overlap with skipped events)
    *   Reduced duration attempts (30, 15, 10 minutes)
    *   Last resort: 30 minutes before event
*   Work time blocks define available scheduling periods (default 9-12, 13-17)
*   Optional buffer minutes add transition time between events
*   Drive files provide persistent context for AI operations
