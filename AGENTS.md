# Sterling Library: Personal AI Assistant

## Project Overview

This Google Apps Script project acts as a personal AI assistant integrating Google Tasks, Google Calendar, and Todoist with Gemini AI. The system automates task creation, enriches tasks with AI-generated content, and helps prepare for calendar events.

**Core Functionality:**

*   **Google Tasks to Todoist:** Automatically converts Google Tasks into Todoist tasks
*   **AI-Powered Task Enrichment:** Uses Gemini to add context and information to Todoist tasks labeled with "enrich"
*   **Calendar Event Preparation:** Analyzes Google Calendar events and creates preparatory tasks in Todoist 2 hours before events
*   **File-based Context:** Leverages files from Google Drive to provide context to the AI

## Key Components

*   **`Main.js`:** Entry point that initializes the `Processor` with configuration parameters (API keys, folder IDs, etc.)
*   **`Processor.js`:** Central orchestrator coordinating all services and implementing core business logic
*   **`AI.js`:** Gemini API client handling file uploads, content generation, caching, and retry logic
*   **`Todoist.js`:** Todoist API client managing tasks and comments with sync token tracking
*   **`Calendar.js`:** Google Calendar API client managing calendar events and date processing
*   **`GoogleTask.js`:** Google Tasks API client with interval-based processing
*   **`Vault.js`:** Google Drive utility for file interactions and context management
*   **`PropertiesUtil.js`:** Script properties management with expiration tracking

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
*   Consistent logging with module-specific prefixes
*   Graceful API error handling with `muteHttpExceptions`
*   Retry mechanisms for critical operations (AI client with 3 retries)
*   Utilities.sleep() for rate limiting between AI operations

### Data Processing Flow
1. **Context Update:** Drive files processed and uploaded to Gemini for context
2. **Task Synchronization:** Google Tasks converted to Todoist tasks
3. **AI Enrichment:** Tasks with "enrich" label enhanced with AI-generated content
4. **Calendar Processing:** Events analyzed for preparation task creation

### Key Implementation Details
*   Properties Service used for caching and sync token management
*   File expiration tracking prevents unnecessary AI uploads
*   Calendar preparation tasks created 2 hours before event start time
*   Drive files provide persistent context for AI operations
