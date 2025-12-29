# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

For comprehensive project overview, architecture, and implementation details, see **AGENTS.md** which contains the complete technical documentation.

This is a Google Apps Script personal AI assistant that integrates Google Tasks, Google Calendar, and Todoist with Gemini AI for task automation and enrichment.

## Development Commands

### Deployment
```bash
clasp push    # Deploy code to Google Apps Script
clasp pull    # Pull changes from Apps Script editor
clasp open    # Open project in Apps Script editor
```

### Testing
Test functions can be created and executed via Apps Script editor. Common test scenarios:
- Run task enrichment process: `processor.enrichTodoistTasks()`
- Process calendar events: `processor.processCalendarItems()`

## Key Architecture Points

### Module Pattern
All services use IIFE pattern with consistent structure:
```javascript
const ServiceName = (function ({ config }) {
  function log(message) {
    console.log(`ServiceName: ${JSON.stringify(message, null, 2)}`);
  }
  return { publicAPI };
});
```

### Entry Point
Main execution starts in `Main.js` which initializes `Processor.js` with extensive configuration including API keys, folder IDs, and prompt instruction references.

### Core Data Flow
1. Drive files → Gemini context upload
2. Google Tasks → Todoist task conversion
3. Tasks with "enrich" label → AI enhancement
4. Calendar events → Preparation task creation

### Important Files
- **Processor.js**: Central orchestrator at Processor.js:1
- **AI.js**: Gemini client with retry logic at AI.js:22
- **Main.js**: Entry point and configuration at Main.js:26

### Configuration Notes
- API keys and IDs passed to main() function in Main.js
- Drive folder IDs map to context sources for AI context
- Prompt instructions stored as Google Drive file IDs
- Properties Service handles file metadata and sync tokens