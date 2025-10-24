# Technology Stack

<!-- Auto-generated on: 2025-10-24 -->
<!-- Last updated: 2025-10-24 -->

## Core Technologies

**Language**: JavaScript (ES6+)

**Runtime/Framework**: Google Apps Script (V8 runtime)

**Package Manager**: None (Google Apps Script manages dependencies)

## Key Dependencies

### Google Apps Script Advanced Services
- **Services**: Tasks API v1, Gmail API v1, Drive API v3, Calendar API v3
- **Purpose**: Access Google Workspace services (Tasks, Gmail, Drive, Calendar)
- **Why we chose it**: Native integration with Google services, serverless execution, no hosting required
- **Configuration**: Enabled in `appsscript.json`

### Gemini AI API
- **Version**: v1beta
- **Purpose**: AI-powered task enrichment and content generation
- **Why we chose it**: Advanced AI capabilities, file context upload, caching for performance
- **Features used**: File uploads, cached content, multi-turn conversations, tool calling (google_search, url_context)

### Todoist REST API
- **Version**: v2
- **Purpose**: Task management and synchronization
- **Why we chose it**: Robust task management with labels, projects, and rich descriptions
- **Sync Strategy**: Uses sync tokens to track incremental changes

## Development Tools

- **Testing**: Manual testing via test.js functions in Apps Script editor
- **Deployment**: clasp (Command Line Apps Script Projects)
- **Version Control**: Git
- **Build Tool**: N/A (Apps Script handles execution)
- **CI/CD**: Manual deployment via `clasp push`

## Data Layer

- **Database**: Google Apps Script Properties Service (key-value store)
- **Purpose**: Store sync tokens, cache expiration times, and session data
- **Caching**:
  - File context caching with TTL (default 600s)
  - Sync token tracking for Todoist
  - Expiration tracking for uploaded files
- **State Management**: Properties Service with expiration utilities (PropertiesUtil.js)

## Infrastructure

- **Hosting**: Google Apps Script cloud infrastructure
- **Deployment**: Push code via clasp to Google Apps Script project
- **Monitoring**: Google Stackdriver logging (exceptionLogging: "STACKDRIVER")
- **Timezone**: Europe/Brussels

---

## Technology Decisions

### Why Google Apps Script over traditional backend?

**Benefits of Google Apps Script:**
- Zero infrastructure management - serverless by default
- Native Google Workspace integration (Tasks, Calendar, Drive, Gmail)
- Free hosting and execution
- Built-in authentication with Google services
- Automatic scaling

**Trade-offs:**
- Limited to JavaScript (no TypeScript without transpilation)
- 6-minute execution time limit per function
- Limited debugging compared to local development
- Deployment requires clasp CLI

### Why Gemini AI over other LLM providers?

**Benefits of Gemini:**
- File context upload capability (critical for providing Drive file context)
- Content caching for performance (600s TTL reduces API calls)
- Advanced tool calling (google_search, url_context)
- Competitive pricing for AI operations

**Trade-offs:**
- We accept API dependency for advanced AI enrichment features
- Requires retry logic for API reliability (3 retries with 30s intervals)

### Why Todoist over Google Tasks alone?

**Benefits of Todoist:**
- Richer task features (labels, projects, markdown descriptions)
- Better task organization and filtering
- Cross-platform availability
- API supports incremental sync (sync tokens)

**Trade-offs:**
- Requires separate API integration
- Both Google Tasks and Todoist must be maintained

---

## Version Constraints

**Important version requirements:**
- **Google Apps Script Runtime**: Must use V8 for modern JavaScript features (const, arrow functions, etc.)
- **Gemini API**: Using v1beta for advanced features (file upload, caching)
- **Todoist API**: Using REST v2 for current task creation and sync endpoints

---

## Learning Resources

For engineers new to our stack:

- **Google Apps Script**: https://developers.google.com/apps-script
- **Apps Script Services**: https://developers.google.com/apps-script/reference
- **Gemini API**: https://ai.google.dev/gemini-api/docs
- **Todoist API**: https://developer.todoist.com/rest/v2/
- **clasp CLI**: https://github.com/google/clasp

---

*To update this file: Edit directly with your project's technology details*
