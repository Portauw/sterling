# System Architecture

<!-- Generated on: 2025-10-24 -->
<!-- Last updated: 2025-10-24 -->

## Architecture Pattern

**Pattern**: Service-Oriented with Central Orchestrator

**Description**: The system uses a central Processor that orchestrates multiple service clients (AI, Todoist, GoogleTask, Calendar, Vault). Each service is self-contained and communicates only through the Processor, which implements the business logic and workflows.

---

## High-Level Architecture

```
┌─────────────────────────────────────┐
│     Main.js (Entry Point)           │
│     Provides configuration          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Processor.js (Orchestrator)     │
│     Business logic & workflows      │
└──────┬────┬────┬────┬────┬──────────┘
       │    │    │    │    │
   ┌───▼┐ ┌─▼─┐ ┌▼──┐ ┌▼──┐ ┌▼─────┐
   │ AI │ │Tod│ │Cal│ │GT │ │Vault │
   └────┘ └───┘ └───┘ └───┘ └──────┘
     │      │     │     │       │
   Gemini Todoist GCal GTasks Drive
   (API)   (API) (API) (API)  (API)
```

**Key principles:**
- **Single Responsibility**: Each service handles one external integration
- **Dependency Injection**: Configuration flows from Main → Processor → Services
- **Separation of Concerns**: Business logic in Processor, API interaction in services
- **Stateless Services**: State managed via PropertiesUtil, not in services

---

## Directory Structure

```
/
├── Main.js                 # Entry point, configuration provider
├── Processor.js            # Central orchestrator, business logic
├── AI.js                   # Gemini API client
├── Todoist.js              # Todoist API client
├── Calendar.js             # Google Calendar client
├── GoogleTask.js           # Google Tasks client
├── Vault.js                # Google Drive file manager
├── PropertiesUtil.js       # Properties Service wrapper
├── test.js                 # Test configuration and functions
├── appsscript.json         # Google Apps Script configuration
└── ai-assistant/           # AI learning framework (not part of runtime)
```

**Organization principle**: Service-based organization

**Why we organize this way**: Each file is a self-contained service that can be understood independently, making it easy to locate functionality and maintain code.

---

## Key Components/Layers

### Component 1: Main.js (Entry Point)

**Location**: `Main.js`

**Responsibility**: Provides centralized configuration and initializes the Processor

**Key files**:
- `Main.js:1`: Configuration and Processor initialization

**Depends on**: Nothing (entry point)

**Used by**: Called manually via Apps Script triggers or editor

### Component 2: Processor.js (Central Orchestrator)

**Location**: `Processor.js`

**Responsibility**: Orchestrates all services, implements business logic for task enrichment, calendar processing, and Google Tasks sync

**Key files**:
- `Processor.js:1-35`: Initialization and service client setup
- `Processor.js:38-60`: Context data processing (Drive file uploads)
- `Processor.js:98-121`: Todoist task enrichment workflow
- `Processor.js:123-136`: Google Tasks to Todoist sync
- `Processor.js:251-329`: Calendar event processing and prep task creation

**Depends on**: All service clients (AI, Todoist, Calendar, GoogleTask, Vault)

**Used by**: Main.js and test.js

### Component 3: AI.js (Gemini Client)

**Location**: `AI.js`

**Responsibility**: Manages Gemini API interactions, file uploads, content caching, and AI content generation

**Key files**:
- `AI.js:8`: File upload endpoint
- `AI.js:27-36`: File deletion
- `AI.js:9-12`: Retry configuration

**Depends on**: Gemini API (external), UrlFetchApp (Apps Script service)

**Used by**: Processor.js

### Component 4: Todoist.js (Todoist Client)

**Location**: `Todoist.js`

**Responsibility**: Manages Todoist tasks, comments, and synchronization using sync tokens

**Key files**:
- `Todoist.js:23-50`: Task creation
- `Todoist.js:3`: Sync token constant

**Depends on**: Todoist REST API v2 (external)

**Used by**: Processor.js

### Component 5: Calendar.js (Google Calendar Client)

**Location**: `Calendar.js`

**Responsibility**: Retrieves and processes Google Calendar events

**Depends on**: Google Calendar API v3 (Advanced Service)

**Used by**: Processor.js (processCalendarItems)

### Component 6: GoogleTask.js (Google Tasks Client)

**Location**: `GoogleTask.js`

**Responsibility**: Retrieves Google Tasks within a time interval and marks them complete

**Depends on**: Google Tasks API v1 (Advanced Service)

**Used by**: Processor.js (processGoogleTasks)

### Component 7: Vault.js (Drive File Manager)

**Location**: `Vault.js`

**Responsibility**: Manages Google Drive file retrieval, modification tracking, and provides file context to AI

**Depends on**: Google Drive API v3 (Advanced Service)

**Used by**: Processor.js for context file uploads

### Component 8: PropertiesUtil.js (State Manager)

**Location**: `PropertiesUtil.js`

**Responsibility**: Wrapper around Properties Service for persistent key-value storage with expiration tracking

**Key files**:
- `PropertiesUtil.js:8-31`: Get/set methods
- `PropertiesUtil.js:45-56`: File expiration checking

**Depends on**: PropertiesService (Apps Script service)

**Used by**: All components that need persistent state

---

## Data Flow

### Example 1: Task Enrichment Flow (Core Feature)

**Flow:**
1. **Trigger enrichment** (`Processor.js:98-121`)
   - Get updated Todoist tasks with "enrich" label or "@ai" comment
   - Todoist API returns tasks via sync endpoint

2. **Prepare context** (`Processor.js:78-96`)
   - Build conversation content with task title and description
   - Include existing comments (differentiate user vs AI comments)
   - Get uploaded file context from Properties Service

3. **AI Processing** (`AI.js` - processCall method)
   - Send content + system instructions + file context to Gemini
   - Gemini generates enrichment using uploaded Drive files as context
   - Return AI-generated content

4. **Update task** (`Processor.js:92-95`)
   - Add AI response as comment to Todoist task
   - Remove "enrich" label
   - Update task in Todoist

**Data transformations:**
- Todoist Task → AI Prompt → Gemini Response → Todoist Comment
- Properties Service tracks which files are uploaded to avoid re-uploads

### Example 2: Context File Upload Flow

**Flow:**
1. **Check files** (`Processor.js:38-60`)
   - Get files from configured Drive folders
   - For each file, check if updated or expired

2. **Expiration check** (`PropertiesUtil.js:45-56`)
   - Check file metadata in Properties Service
   - 10-minute buffer before expiration
   - Return true if expired or no metadata exists

3. **Upload to Gemini** (`AI.js` - uploadFile method)
   - Upload file blob to Gemini Files API
   - Receive file metadata with expiration time
   - Store metadata in Properties Service

4. **Cache metadata** (`Processor.js:48`)
   - Save file metadata (includes Gemini file ID and expiration)
   - Used in future AI calls for context

**Data transformations:**
- Drive File → Blob → Gemini File Upload → File Metadata → Properties Service

### Example 3: Calendar Event Preparation

**Flow:**
1. **Retrieve events** (`Processor.js:251-329`)
   - Get today's calendar events
   - Filter: work hours only (7am-8pm), has attendees, not all-day

2. **AI Analysis** (`Processor.js:202-217`)
   - Batch events (3 per batch) to reduce API calls
   - Send events + calendar instructions to Gemini
   - AI determines which events need preparation tasks

3. **Create prep tasks** (`Processor.js:288-317`)
   - For events needing prep, create Todoist task
   - Due time: 2 hours before event start
   - Add "enrich_scheduled" label
   - Include AI-generated preparation prompt

4. **Result** (`Processor.js:307`)
   - Todoist tasks created for meeting preparation
   - Tasks will be enriched later when processed

**Data transformations:**
- Calendar Events → Filtered Events → AI Analysis → Preparation Tasks → Todoist

---

## Key Entry Points

**Most important files for understanding the system:**

1. `Main.js:1`: Application entry point - shows all configuration needed
2. `Processor.js:1-35`: Central orchestrator initialization - shows all service dependencies
3. `Processor.js:98-121`: Task enrichment - core business logic
4. `AI.js:1-12`: AI client setup - shows retry config and API endpoints
5. `test.js:1`: Test configuration - example of how to configure the system

**Suggested learning path:**
1. Start with `AGENTS.md` to understand the project overview
2. Then look at `Main.js` to see the entry point and configuration
3. Read `Processor.js` to understand the three main workflows (context, tasks, calendar)
4. Explore individual services (`AI.js`, `Todoist.js`) to understand API interactions
5. Finally look at `PropertiesUtil.js` to understand state management

---

## Integration Points

### External Service 1: Gemini AI API

**Purpose**: AI-powered task enrichment and calendar analysis

**Integration point**: `AI.js:8` (file upload), processCall method (content generation)

**Authentication**: API key passed in URL query parameter

**Error handling**: Retry logic with 3 attempts, 30-second intervals

**Key features used**:
- File context uploads
- Cached content (600s TTL)
- Tool calling (google_search, url_context)
- Multi-turn conversations

### External Service 2: Todoist REST API v2

**Purpose**: Task management and synchronization

**Integration point**: `Todoist.js:31` (task creation), sync endpoints

**Authentication**: Bearer token in Authorization header

**Sync strategy**: Uses sync tokens (stored in Properties Service) for incremental updates

**Key features used**:
- Task CRUD operations
- Comments on tasks
- Labels for workflow management
- Project organization

### External Service 3: Google Calendar API

**Purpose**: Retrieve calendar events for preparation task creation

**Integration point**: `Calendar.js` (getEventsForDate method)

**Configuration**: Uses Advanced Services (enabled in appsscript.json)

**Authentication**: Automatic via Apps Script

### External Service 4: Google Tasks API

**Purpose**: Retrieve tasks from Google Tasks for Todoist sync

**Integration point**: `GoogleTask.js` (listTaskLists method)

**Configuration**: Time interval filtering (35 minutes)

**Authentication**: Automatic via Apps Script

### External Service 5: Google Drive API

**Purpose**: Retrieve context files to upload to Gemini

**Integration point**: `Vault.js` (getFiles, getFile methods)

**Configuration**: Folder IDs configured in Main.js

**Authentication**: Automatic via Apps Script

---

## Performance Considerations

### Caching Strategy

**What we cache**:
- Uploaded file metadata (file ID, expiration time)
- Todoist sync tokens
- File properties list

**How**: `PropertiesUtil.js:29-30` (setPropertyValue)

**Invalidation**:
- File cache: 10-minute expiration check before TTL
- Sync tokens: Updated after each successful sync
- Automatic cleanup available (PropertiesUtil.cleanUpProperties)

### Optimization Patterns

- **Batch processing**: Calendar events processed in batches of 3 (`Processor.js:267`)
- **Rate limiting**: 20-second sleep between task enrichments (`Processor.js:74`)
- **Conditional uploads**: Only upload files if modified or expired (`Processor.js:45`)
- **Incremental sync**: Todoist sync tokens prevent re-processing tasks

---

## Architectural Decisions

### Decision 1: Central Orchestrator Pattern

**Decision**: Use Processor.js as single orchestrator instead of distributed event system

**Reasoning**:
- Simpler debugging and logging
- Clear execution flow
- No need for event bus in Google Apps Script environment
- Easier to understand for maintenance

**Alternatives considered**:
- Event-driven architecture: Too complex for serverless environment
- Separate scripts per workflow: Would duplicate configuration and service setup

### Decision 2: IIFE Module Pattern

**Decision**: Use IIFEs for all service modules instead of ES6 modules

**Reasoning**:
- Google Apps Script doesn't support ES6 imports/exports
- IIFE provides encapsulation without build step
- Works directly in Apps Script environment
- Clear dependency injection pattern

**Trade-offs**:
- We accept manual dependency management for no build step requirement

### Decision 3: Properties Service for State

**Decision**: Use Properties Service instead of external database

**Reasoning**:
- Native to Google Apps Script (no external dependencies)
- Free and serverless
- Sufficient for key-value storage needs
- Automatic persistence across executions

**Trade-offs**:
- We accept quota limitations (9KB per property) for simplicity
- Cannot do complex queries, only key-value lookups

### Decision 4: File-Based AI Context

**Decision**: Upload Drive files to Gemini for persistent context instead of including in every prompt

**Reasoning**:
- Reduces token usage per API call
- Gemini caches file content (600s TTL)
- Context persists across enrichment operations
- Files can be updated without changing code

**Trade-offs**:
- We accept file management complexity for token cost savings
- Requires expiration tracking and re-upload logic

---

*To update this file: Edit directly when architecture changes significantly*
