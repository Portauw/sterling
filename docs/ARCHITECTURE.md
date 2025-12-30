# Sterling Library Architecture

Comprehensive visual documentation of all data flows in Sterling Library, with **Processor.js** as the central orchestrator.

## Table of Contents
- [System Architecture Overview](#system-architecture-overview)
- [Flow 1: Google Tasks → Todoist Conversion](#flow-1-google-tasks--todoist-conversion)
- [Flow 2: AI Task Enrichment](#flow-2-ai-task-enrichment)
- [Flow 3: Calendar Event Processing](#flow-3-calendar-event-processing)
- [Flow 4: Context Data Update](#flow-4-context-data-update)
- [Flow 5: Data & State Management](#flow-5-data--state-management)
- [Flow 6: Just-In-Time Task Preparation](#flow-6-just-in-time-task-preparation)
- [Flow 7: Daily Briefing Generation](#flow-7-daily-briefing-generation)
- [Flow 8: Quick Wins Summary](#flow-8-quick-wins-summary)

---

## System Architecture Overview

```mermaid
graph TB
    subgraph "Entry Point"
        Main[Main.js<br/>Entry Point]
    end

    subgraph "Orchestrator"
        Processor[Processor.js<br/>Central Orchestrator]
    end

    subgraph "Service Clients"
        Todoist[Todoist.js<br/>Task Management]
        GoogleTask[GoogleTask.js<br/>Google Tasks API]
        AI[AI.js<br/>Gemini API Client]
        Calendar[Calendar.js<br/>Google Calendar API]
        Vault[Vault.js<br/>Google Drive Access]
        Props[PropertiesUtil.js<br/>State Management]
    end

    subgraph "External Services"
        TodoistAPI[Todoist API]
        GeminiAPI[Gemini AI API]
        GoogleAPIs[Google APIs<br/>Tasks, Calendar, Drive]
        PropsService[Properties Service<br/>Script Storage]
    end

    Main -->|Initialize with config| Processor

    Processor -->|Manage tasks| Todoist
    Processor -->|Read Google Tasks| GoogleTask
    Processor -->|AI enrichment| AI
    Processor -->|Calendar events| Calendar
    Processor -->|Drive files| Vault
    Processor -->|Cache & state| Props

    Todoist <-->|REST API| TodoistAPI
    AI <-->|REST API| GeminiAPI
    GoogleTask <-->|Apps Script Services| GoogleAPIs
    Calendar <-->|Apps Script Services| GoogleAPIs
    Vault <-->|Apps Script Services| GoogleAPIs
    Props <-->|Script Properties| PropsService

    style Processor fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    style Main fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    style Todoist fill:#FFC107,stroke:#F57C00,stroke-width:2px
    style AI fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    style Calendar fill:#FF5722,stroke:#D84315,stroke-width:2px,color:#fff
```

## Component Responsibilities

| Component | Responsibility | Key Methods |
|-----------|---------------|-------------|
| **Main.js** | Entry point, configuration initialization | `main()` |
| **Processor.js** | Central orchestrator for all workflows | `enrichTodoistTasks()`, `processGoogleTasks()`, `processCalendarItems()`, `processContextData()`, `enrichTodaysTasksForLabel()`, `generateDailyBriefing()`, `generateQuickWinsSummary()` |
| **Todoist.js** | Todoist API integration, task & comment management | `createTask()`, `getUpdatedTasks()`, `createComment()`, `getTasksByFilter()`, `deleteComments()`, `updateTask()` |
| **GoogleTask.js** | Google Tasks API integration | `listTaskLists()`, `markGoogleTasksDone()` |
| **AI.js** | Gemini AI client with file upload and retry logic | `processCall()`, `uploadFile()`, `getFiles()`, `deleteFile()`, `deleteFileByDisplayName()`, `buildTextContent()`, `buildFileParts()` |
| **Calendar.js** | Google Calendar event management | `getEventsForDate()`, `findOpenSlot()`, `parseTimeString()` |
| **Vault.js** | Google Drive file access and management | `getFiles()`, `getFile()`, `wasUpdated()` |
| **PropertiesUtil.js** | Script properties management with expiration | `setPropertyValue()`, `getScriptPropertyObject()`, `isFileExpired()`, `getFilesPropertyValue()`, `saveFilesPropertyValue()` |
| **Telemetry.js** | Structured logging and error tracking | `init()`, `getLogger()` (returns logger with `info()`, `error()`, `warn()`, `debug()`) |

---

## Flow 1: Google Tasks → Todoist Conversion

This flow converts Google Tasks into Todoist tasks and marks them as complete.

```mermaid
sequenceDiagram
    participant User
    participant Processor
    participant GoogleTask
    participant Todoist
    participant GoogleAPI
    participant TodoistAPI

    User->>Processor: processGoogleTasks()
    activate Processor

    Processor->>GoogleTask: listTaskLists()
    activate GoogleTask
    GoogleTask->>GoogleAPI: Tasks.Tasks.list(gTaskListId, options)
    Note over GoogleTask,GoogleAPI: Filter: updatedMin = now - 35 minutes<br/>maxResults = 50, showCompleted = false
    GoogleAPI-->>GoogleTask: tasks[]

    loop For each task
        GoogleTask->>GoogleTask: Extract link metadata
        GoogleTask->>GoogleTask: Set task.type (EMAIL/ASSISTANT)
        GoogleTask->>GoogleTask: Build task.link object
    end

    GoogleTask-->>Processor: tasks[]
    deactivate GoogleTask

    Processor->>Processor: createTodoistTasks(tasks)
    activate Processor

    loop For each task
        Processor->>Processor: Add labels based on type
        Note over Processor: EMAIL type → add 'email' label

        Processor->>Todoist: createTask(task)
        activate Todoist
        Todoist->>TodoistAPI: POST /rest/v2/tasks
        Note over Todoist,TodoistAPI: Payload: title, description,<br/>labels, due_date, project_id
        TodoistAPI-->>Todoist: task created
        Todoist-->>Processor: todoist task
        deactivate Todoist
    end

    Processor-->>Processor: success result
    deactivate Processor

    Processor->>GoogleTask: markGoogleTasksDone(tasks)
    activate GoogleTask

    loop For each task
        GoogleTask->>GoogleTask: setStatus('completed')
        GoogleTask->>GoogleAPI: Tasks.Tasks.patch(task, listId, taskId)
        GoogleAPI-->>GoogleTask: task updated
    end

    deactivate GoogleTask

    Processor-->>User: Success
    deactivate Processor
```

### Key Details:
- **Trigger**: Time-driven, every 10 minutes
- **Time Window**: Tasks updated in last 35 minutes
- **Label Mapping**: EMAIL type tasks get 'email' label + configured label
- **Completion**: Google Tasks marked complete after Todoist creation
- **Error Handling**: Try-catch blocks with logging at each stage

---

## Flow 2: AI Task Enrichment

This flow enriches Todoist tasks with AI-generated content using Gemini and context from Drive files.

```mermaid
sequenceDiagram
    participant User
    participant Processor
    participant Todoist
    participant AI
    participant Vault
    participant TodoistAPI
    participant GeminiAPI
    participant PropsUtil

    User->>Processor: enrichTodoistTasks()
    activate Processor

    Processor->>Todoist: getUpdatedTasks()
    activate Todoist
    Todoist->>PropsUtil: Get sync token
    PropsUtil-->>Todoist: sync_token or '*'
    Todoist->>TodoistAPI: POST /sync/v9/sync
    Note over Todoist,TodoistAPI: Payload: sync_token,<br/>resource_types: ["items", "notes"]
    TodoistAPI-->>Todoist: {items[], notes[], sync_token}

    loop For each note
        Todoist->>TodoistAPI: GET /rest/v2/tasks/{item_id}
        TodoistAPI-->>Todoist: task details
    end

    Todoist->>Todoist: Deduplicate by task.id
    Todoist->>PropsUtil: Save new sync_token
    Todoist-->>Processor: unique tasks[]
    deactivate Todoist

    loop For each task
        Processor->>Todoist: getCommentsForTask(task.id)
        Todoist->>TodoistAPI: GET /rest/v2/comments?task_id={id}
        TodoistAPI-->>Todoist: comments[]
        Todoist-->>Processor: comments[]

        Processor->>Processor: Check enrichment triggers
        alt Has 'enrich' label OR last comment contains '@ai'
            Note over Processor: Task qualifies for enrichment

            Processor->>Processor: enrichTodoistTask(task, comments)
            activate Processor

            Processor->>Processor: Build content array
            Note over Processor: Add task title & description<br/>Add existing comments (role: user/model)

            Processor->>AI: getFiles()
            AI->>PropsUtil: Get FILE_PROPERTIES keys
            PropsUtil-->>AI: file metadata keys

            loop For each file meta
                AI->>PropsUtil: Get file metadata
                PropsUtil-->>AI: {uri, mimeType}
            end

            AI-->>Processor: files[] metadata

            Processor->>AI: processCall(content, systemInstruction, files)
            activate AI

            AI->>AI: Build request payload
            Note over AI: Add files as fileData parts<br/>Add system instruction<br/>Add Google Search & URL tools

            AI->>GeminiAPI: POST /v1beta/models/{model}:generateContent
            GeminiAPI-->>AI: response

            alt Error with retry count < 3
                AI->>AI: Sleep 30 seconds
                AI->>AI: Retry processCall()
            end

            AI-->>Processor: text responses[]
            deactivate AI

            loop For each AI response
                Processor->>Todoist: createComment(task.id, "AI: {response}")
                Todoist->>TodoistAPI: POST /rest/v2/comments
                TodoistAPI-->>Todoist: comment created
            end

            deactivate Processor

            alt Task has 'enrich' label
                Processor->>Processor: Remove 'enrich' label
                Processor->>Todoist: updateTask(task)
                Todoist->>TodoistAPI: POST /rest/v2/tasks/{id}
                TodoistAPI-->>Todoist: task updated
            end

            Processor->>Processor: Sleep 10 seconds
            Note over Processor: Rate limiting between tasks
        else Not eligible
            Note over Processor: Skip task
        end
    end

    Processor-->>User: Success
    deactivate Processor
```

### Key Details:
- **Trigger**: Time-driven, every 10 minutes
- **Enrichment Criteria**: Task has 'enrich' label OR last comment contains '@ai'
- **AI Context**:
  - System instruction from Drive file (agents_prompt)
  - All uploaded Drive files as context
  - Previous comments (maintaining conversation history)
  - Google Search and URL context tools enabled
- **Sync Token**: Incremental sync to only process changed tasks
- **Rate Limiting**: 10-second sleep between task enrichments
- **Retry Logic**: AI calls retry up to 3 times with 30-second intervals
- **Comment Prefix**: All AI responses prefixed with "AI: "

---

## Flow 3: Calendar Event Processing

This flow analyzes calendar events and creates preparation tasks in Todoist with smart filtering to reduce token usage.

```mermaid
sequenceDiagram
    participant User
    participant Processor
    participant Calendar
    participant AI
    participant Todoist
    participant CalendarAPI
    participant GeminiAPI
    participant TodoistAPI

    User->>Processor: processCalendarItems()
    activate Processor

    Processor->>Calendar: getEventsForDate(calendarId, today)
    activate Calendar
    Calendar->>CalendarAPI: CalendarApp.getCalendarById(calendarId)
    CalendarAPI-->>Calendar: calendar object
    Calendar->>CalendarAPI: calendar.getEventsForDay(date, statusFilters)
    Note over Calendar,CalendarAPI: Status filters: INVITED, MAYBE,<br/>YES, OWNER<br/>Max results: 20
    CalendarAPI-->>Calendar: events[]

    loop For each event
        Calendar->>Calendar: Get guest list with organizer
        Note over Calendar: getGuestList(true) includes organizer

        Calendar->>Calendar: Format event data (slimmed)
        Note over Calendar: Extract: title, description,<br/>startTime, endTime,<br/>attendees (incl. organizer), isAllDay<br/>Optional: location (if not empty), recurrence

        alt Event is recurring
            Calendar->>CalendarAPI: FullCalendar.Events.get(calendarId, eventId)
            CalendarAPI-->>Calendar: full event with recurrence
        end
    end

    Calendar-->>Processor: {success: true, events[], count}
    deactivate Calendar

    alt success && events.length > 0
        Processor->>Processor: filterEventsForProcessing(events)
        activate Processor
        Note over Processor: Filter criteria:<br/>- Skip all-day events<br/>- Skip events with no attendees<br/>- Skip solo events (only you as attendee)

        loop For each event
            Processor->>Processor: Apply filters
            alt Is all-day event
                Note over Processor: Skip - no prep needed
            else Has 0 or 1 attendees
                Note over Processor: Skip - no attendees or solo event<br/>(attendees.length <= 1)
            else Has 2+ attendees
                Note over Processor: Include for processing
            end
        end

        Processor-->>Processor: filteredEvents[]
        deactivate Processor

        alt filteredEvents.length == 0
            Note over Processor: No events to process, return early
        end

        Processor->>Processor: prepareCalendarEventsContext(filteredEvents)
        activate Processor

        Processor->>AI: buildTextContent('user', JSON.stringify(filteredEvents))
        Processor->>Vault: getFile(calendar_instructions_prompt)
        Vault-->>Processor: CALENDAR_INSTRUCTIONS_PROMPT
        Processor->>AI: buildTextContent('user', CALENDAR_INSTRUCTIONS_PROMPT)

        Processor->>AI: processCall(contents, AGENTS_PROMPTS, files)
        activate AI
        AI->>GeminiAPI: POST /v1beta/models/{model}:generateContent
        Note over AI,GeminiAPI: Request: events JSON,<br/>calendar instructions,<br/>system prompts, context files
        GeminiAPI-->>AI: JSON response
        AI-->>Processor: response text
        deactivate AI

        Processor->>Processor: extractJsonFromResponse(response)
        Note over Processor: Parse JSON from markdown blocks<br/>or extract from response text

        Processor-->>Processor: eventsWithContext
        deactivate Processor

        Processor->>Processor: Identify tasks needing preparation

        alt tasksToSchedule.length > 0
            Processor->>Processor: schedulePreparationTasks(tasks, allEvents, filteredEvents)
            activate Processor

            loop For each task to schedule
                Processor->>Calendar: findOpenSlot(events, start, duration)
                activate Calendar
                Note over Calendar: 3-Tier Strategy:<br/>1. Strict (All events)<br/>2. Lenient (Filtered only)<br/>3. Fallback (-2h)
                Calendar-->>Processor: openSlot or null
                deactivate Calendar

                Processor->>Processor: Build prep task
                Note over Processor: Title: "Prepare for {event.title}"<br/>Description: event.meeting_preparation_prompt<br/>Labels: ['enrich_scheduled']<br/>Project: configured todoistProjectId

                Processor->>Processor: createTodoistTasks([task])
                activate Processor
                Processor->>Todoist: createTask(task)
                activate Todoist
                Todoist->>TodoistAPI: POST /rest/v2/tasks
                TodoistAPI-->>Todoist: task created
                Todoist-->>Processor: result
                deactivate Todoist
                Processor-->>Processor: success
                deactivate Processor

                Processor->>Processor: Sleep 2 seconds
                Note over Processor: Rate limiting
            end

            deactivate Processor
        else No preparation tasks
             Note over Processor: Log and continue
        end

    else No events or error
        Note over Processor: Log and exit
    end

    Processor-->>User: returnValue[]
    deactivate Processor
```

### Key Details:
- **Trigger**: Time-driven, daily between 6 AM and 7 AM
- **Event Selection**: Today's events where user status is INVITED/MAYBE/YES/OWNER
- **Smart Filtering** (Processor.js:180):
  - Skips all-day events (no preparation needed)
  - Skips events with ≤1 attendees (no attendees or solo events)
  - Attendees list includes organizer via `getGuestList(true)`
  - Significantly reduces token usage by filtering before AI call
- **Slimmed Event Data** (Calendar.js:26):
  - Includes organizer in attendees list using `getGuestList(true)`
  - Conditional: `location` only if non-empty
  - Kept: `title`, `description`, `startTime`, `endTime`, `attendees`, `isAllDay`, `recurrence`
  - Reduces token count per event by ~20-30%
- **Batch Processing** (Processor.js:261):
  - Events processed in batches of 3
  - Multiple AI calls instead of one massive request
  - Spreads token usage across multiple requests
  - Prevents hitting free tier input token limits
  - Configurable batch size for optimization
- **AI Analysis**:
  - Determines which events need preparation
  - Generates meeting_preparation_prompt for each event
  - Estimates preparation duration (`duration_estimation`) or defaults to 45 mins
  - Uses calendar-specific instructions from Drive
  - Processes 3 events per AI call (batch size)
- **Preparation Tasks**:
  - **3-Tier Scheduling Strategy**:
    1. **Strict**: Attempts to find a slot avoiding *all* calendar events (both processed/filtered and others).
    2. **Lenient**: If strict fails, attempts to find a slot avoiding *only* processed/filtered events (allowing overlap with placeholders/personal items).
    3. **Reduced Duration**: Try 30, 15, 10 minute durations with both strict and lenient strategies.
    4. **Last Resort Fallback**: If all strategies fail, schedules 30 minutes before event start.
  - Maintains a `newlyScheduledSlots` list to ensure tasks in the same run don't overlap each other.
  - Automatically labeled with 'enrich_scheduled' for later processing
  - Contains AI-generated preparation guidance
- **Rate Limiting**:
  - 10 seconds between batch AI calls
  - 20 seconds between task creations
- **JSON Extraction**: Handles markdown code blocks and raw JSON responses
- **Token Optimization**: Combined filtering + slimming + batching reduces peak input tokens by 75-85%

---

## Flow 4: Context Data Update

This flow uploads Drive files to Gemini for AI context and manages file caching.

```mermaid
sequenceDiagram
    participant User
    participant Processor
    participant Vault
    participant AI
    participant PropsUtil
    participant DriveAPI
    participant GeminiAPI

    User->>Processor: processContextData(forceUpdate=false)
    activate Processor

    Processor->>Processor: Initialize tracking
    Note over Processor: propertyNamesPropertyValue = []<br/>needsCacheUpdate = forceUpdate

    loop For each driveFolderInfo in driveFolders
        Processor->>Vault: getFiles(driveFolderInfo.id)
        activate Vault
        Vault->>DriveAPI: DriveApp.getFolderById(folderId).getFiles()
        DriveAPI-->>Vault: filesIterator

        loop While hasNext()
            Vault->>DriveAPI: next()
            DriveAPI-->>Vault: file
        end

        Vault-->>Processor: files[]
        deactivate Vault

        loop For each file
            Processor->>Processor: Track file name
            Note over Processor: propertyNamesPropertyValue.push(file.getName())

            Processor->>Vault: wasUpdated(file)
            activate Vault
            Vault->>PropsUtil: getProperty(file.getName())
            PropsUtil-->>Vault: fileProperty or null

            alt No property exists
                Vault-->>Processor: true (needs update)
            else Property exists
                Vault->>Vault: Check lastUpdated vs stored updateTime
                Vault->>Vault: Check expirationTime < now - 10 min
                Vault-->>Processor: update needed?
            end
            deactivate Vault

            Processor->>PropsUtil: isFileExpired(file.getName())
            PropsUtil-->>Processor: expired?

            alt wasUpdated OR expired OR forceUpdate
                Processor->>AI: uploadFile(file.getName(), file.getBlob())
                activate AI

                AI->>AI: Build multipart payload
                Note over AI: metadata: {file: {displayName}}<br/>file: blob

                AI->>GeminiAPI: POST /upload/v1beta/files?uploadType=multipart
                GeminiAPI-->>AI: {file: {name, uri, mimeType, ...}}

                AI-->>Processor: file metadata
                deactivate AI

                alt Upload successful
                    Processor->>PropsUtil: setPropertyValue(file.getName(), fileResult)
                    Note over Processor,PropsUtil: Stores: uri, mimeType,<br/>name, updateTime, expirationTime
                    Processor->>Processor: needsCacheUpdate = true
                    Note over Processor: Log: Updated file {fileName}
                else Upload failed
                    Note over Processor: Log: Upload error for {fileName}
                end
            else File is current
                Note over Processor: Log: No need to update {fileName}
            end
        end
    end

    Processor->>PropsUtil: saveFilesPropertyValue(propertyNamesPropertyValue)
    Note over Processor,PropsUtil: Stores array of all current file names<br/>in FILE_PROPERTIES key

    alt needsCacheUpdate == true
        Note over Processor: Cache refresh needed<br/>(handled separately by AI client)
    end

    Processor-->>User: Complete
    deactivate Processor
```

### Key Details:
- **Trigger**: Time-driven, every 5 minutes
- **Drive Folders**: Array of Google Drive folder IDs to use for AI context
- **Update Criteria**:
  - File has no stored metadata
  - File's lastUpdated > stored updateTime
  - File metadata expired (>10 minutes old)
  - forceUpdate parameter is true
- **File Metadata Stored**:
  - Gemini file URI and MIME type
  - Original file name
  - Update and expiration timestamps
- **Cache Management**: Uploaded files available to AI via getFiles()
- **Property Tracking**: Maintains list of all current files to detect deletions

---

## Flow 5: Data & State Management

This flow shows how the system manages persistent state and caching.

```mermaid
graph TB
    subgraph "Script Properties Storage"
        FileProps["FILE_PROPERTIES<br/>Array of file names"]
        SyncToken["TODOIST_LAST_SYNC_TOKEN<br/>Incremental sync"]
        FileMeta1["File Name 1<br/>{uri, mimeType, updateTime, expirationTime}"]
        FileMeta2["File Name 2<br/>{uri, mimeType, updateTime, expirationTime}"]
        FileMetaN["File Name N<br/>..."]
        CacheMeta["ITP Cache<br/>{name, model, displayName, createTime, updateTime, expireTime}"]
    end

    subgraph "Processor Operations"
        ProcessContext[processContextData<br/>Updates file metadata]
        EnrichTasks[enrichTodoistTasks<br/>Uses sync token]
        AICall[AI.processCall<br/>Uses cached files]
    end

    subgraph "AI Client Operations"
        UploadFile[uploadFile<br/>Stores file metadata]
        GetFiles[getFiles<br/>Retrieves file URIs]
        CacheOps[updateOrCreateCache<br/>Manages AI cache]
    end

    subgraph "Todoist Operations"
        GetUpdated[getUpdatedTasks<br/>Reads & updates sync token]
    end

    ProcessContext -->|Write| FileMeta1
    ProcessContext -->|Write| FileMeta2
    ProcessContext -->|Write| FileMetaN
    ProcessContext -->|Write| FileProps

    UploadFile -->|Write| FileMeta1
    UploadFile -->|Write| FileMeta2

    GetFiles -->|Read| FileProps
    GetFiles -->|Read| FileMeta1
    GetFiles -->|Read| FileMeta2

    AICall --> GetFiles

    CacheOps -->|Write| CacheMeta
    CacheOps -->|Read| FileProps
    CacheOps -->|Read| FileMeta1
    CacheOps -->|Read| FileMeta2

    EnrichTasks --> GetUpdated
    GetUpdated -->|Read & Write| SyncToken

    style FileProps fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    style SyncToken fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    style CacheMeta fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    style ProcessContext fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    style EnrichTasks fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
```

### Property Keys & Data

| Key | Type | Purpose | Managed By |
|-----|------|---------|------------|
| `FILE_PROPERTIES` | Array | List of all current file names | Processor.processContextData() |
| `TODOIST_LAST_SYNC_TOKEN` | String | Incremental sync token from Todoist | Todoist.getUpdatedTasks() |
| `{fileName}` | Object | File metadata: uri, mimeType, updateTime, expirationTime | AI.uploadFile() |
| `ITP Cache` | Object | Gemini cache metadata | AI.updateOrCreateCache() |

### State Flow Details:

1. **File Metadata Lifecycle**:
   - Created when file uploaded to Gemini
   - Read when building AI context
   - Expires after 10 minutes
   - Updated when file changes in Drive

2. **Sync Token Management**:
   - Starts with '*' (full sync)
   - Updated after each successful sync
   - Enables incremental task updates
   - Reduces API calls and processing

3. **Cache Management**:
   - Aggregates all file contexts
   - TTL: 600 seconds (10 minutes)
   - Reduces Gemini API costs
   - Auto-refreshes when files updated

4. **Expiration Strategy**:
   - Files: 10 minutes since last check
   - Cache: 10 minutes (600s TTL)
   - Balances freshness vs API calls

---

## Error Handling & Retry Logic

### AI Client Retry Mechanism
```mermaid
graph TB
    Start[AI.processCall] --> APICall[Call Gemini API]
    APICall --> Check{Response<br/>has error?}
    Check -->|No| Success[Return results]
    Check -->|Yes| RetryCheck{tryCount <br/> maxTryCount?}
    RetryCheck -->|Yes, retry| Sleep[Sleep 30 seconds]
    Sleep --> Increment[tryCount++]
    Increment --> APICall
    RetryCheck -->|No, give up| Error[Return error message]

    style Success fill:#4CAF50,color:#fff
    style Error fill:#f44336,color:#fff
```

**Retry Configuration**:
- Max retries: 3
- Interval: 30 seconds
- Applies to: All Gemini API calls

### Rate Limiting
- **Task Enrichment**: 10 seconds between tasks (Flow 2)
- **Calendar Processing**:
  - 2 seconds between preparation task creation (Flow 3)
- **Just-In-Time Preparation**: 20 seconds between tasks (Flow 6)
- **Purpose**: Prevent API throttling, give AI processing time

---

## Summary: Processor.js as Orchestrator

**Processor.js** coordinates all system flows by:

1. **Managing Service Clients**: Initializes and maintains references to all service clients
2. **Orchestrating Workflows**: Implements high-level business logic across multiple services
3. **Handling Errors**: Wraps operations in try-catch blocks with comprehensive logging
4. **Rate Limiting**: Controls timing between operations to prevent API throttling
5. **Context Management**: Ensures AI has current context from Drive files
6. **State Coordination**: Works with PropertiesUtil to maintain persistent state

### Processor Public API

```javascript
{
  processGoogleTasks,        // Flow 1: Google Tasks → Todoist
  enrichTodoistTasks,        // Flow 2: AI Task Enrichment
  processCalendarItems,      // Flow 3: Calendar Event Processing
  processContextData,        // Flow 4: Context Data Update
  enrichTodaysTasksForLabel, // Flow 6: Just-In-Time Task Preparation
  generateDailyBriefing,     // Generate daily briefing task
  generateQuickWinsSummary   // Generate quick wins summary from inbox
}
```

All flows are triggered through Processor methods, making it the single point of coordination for the entire system.

---

## Flow 6: Just-In-Time Task Preparation

This flow enriches Todoist tasks with a specific label (e.g., 'prepare_jit') using AI, preparing them for the day ahead.

```mermaid
sequenceDiagram
    participant User
    participant Processor
    participant Todoist
    participant AI
    participant TodoistAPI
    participant GeminiAPI

    User->>Processor: enrichTodaysTasksForLabel(label)
    activate Processor

    Processor->>Todoist: getTasksByFilter(`today&@${label}`)
    activate Todoist
    Todoist->>TodoistAPI: GET /rest/v2/tasks?filter={filter}
    Note over Todoist,TodoistAPI: Filter: today & specific label<br/>(e.g., 'prepare_jit')
    TodoistAPI-->>Todoist: tasks[]
    Todoist-->>Processor: tasks[]
    deactivate Todoist

    loop For each task
        Processor->>Todoist: getCommentsForTask(task.id)
        activate Todoist
        Todoist->>TodoistAPI: GET /rest/v2/comments?task_id={id}
        TodoistAPI-->>Todoist: comments[]
        Todoist-->>Processor: comments[]
        deactivate Todoist

        alt Comments exist
            Processor->>Todoist: deleteComments(commentIds[])
            activate Todoist
            loop For each comment
                Todoist->>TodoistAPI: DELETE /rest/v2/comments/{id}
                TodoistAPI-->>Todoist: deleted
            end
            deactivate Todoist
        end

        Processor->>Processor: enrichTodoistTask(task)
        activate Processor

        Processor->>Processor: Build content array
        Note over Processor: Add task title & description

        Processor->>AI: getFiles()
        AI-->>Processor: files[] metadata

        Processor->>AI: processCall(content, systemInstruction, files)
        activate AI
        AI->>GeminiAPI: POST /v1beta/models/{model}:generateContent
        GeminiAPI-->>AI: response
        AI-->>Processor: text responses[]
        deactivate AI

        loop For each AI response
            Processor->>Todoist: createComment(task.id, "AI: {response}")
            Todoist->>TodoistAPI: POST /rest/v2/comments
            TodoistAPI-->>Todoist: comment created
        end

        deactivate Processor

        Processor->>Processor: Remove label from task
        Processor->>Todoist: updateTask(task)
        activate Todoist
        Todoist->>TodoistAPI: POST /rest/v2/tasks/{id}
        TodoistAPI-->>Todoist: task updated
        deactivate Todoist

        Processor->>Processor: Sleep 20 seconds
        Note over Processor: Rate limiting between tasks
    end

    Processor-->>User: Complete
    deactivate Processor
```

### Key Details:
- **Trigger**: Time-driven, daily between 7 AM and 8 AM, calling `enrichTodaysTasksForLabel` with the parameter `'prepare_jit'`.
- **Purpose**: Prepare tasks labeled 'prepare_jit' for the current day.
- **Task Selection**: Tasks due today with specific label (e.g., 'prepare_jit')
- **Comment Handling**: Deletes all existing comments before enrichment (fresh start)
- **AI Context**:
  - System instruction from Drive file (agents_prompt)
  - All uploaded Drive files as context
  - Task title and description
- **Label Removal**: Automatically removes the trigger label after enrichment
- **Rate Limiting**: 20-second sleep between task enrichments
- **Use Case**: Batch preparation of daily tasks at start of day

---

## Flow 7: Daily Briefing Generation

This flow generates a comprehensive daily briefing task that summarizes calendar events and tasks.

```mermaid
sequenceDiagram
    participant User
    participant Processor
    participant Calendar
    participant Todoist
    participant AI
    participant CalendarAPI
    participant TodoistAPI
    participant GeminiAPI

    User->>Processor: generateDailyBriefing()
    activate Processor

    Processor->>Calendar: getEventsForDate(calendarId, today)
    activate Calendar
    Calendar->>CalendarAPI: Get today's events
    CalendarAPI-->>Calendar: events[]
    Calendar-->>Processor: {success: true, events[]}
    deactivate Calendar

    Processor->>Todoist: getTasksByFilter("today | overdue | p1")
    activate Todoist
    Todoist->>TodoistAPI: GET /rest/v2/tasks?filter={filter}
    TodoistAPI-->>Todoist: tasks[]
    Todoist-->>Processor: tasks[]
    deactivate Todoist

    Processor->>Processor: Build prompt with events and tasks
    Note over Processor: Creates structured JSON with:<br/>- Today's date<br/>- Calendar events<br/>- Tasks (today, overdue, P1)

    Processor->>AI: processCall(prompt, systemInstruction)
    activate AI
    AI->>GeminiAPI: POST /v1beta/models/{model}:generateContent
    Note over AI,GeminiAPI: Request briefing in Markdown:<br/>- Critical Focus<br/>- Schedule Highlights<br/>- Quick Wins<br/>- Prep Notes
    GeminiAPI-->>AI: briefing content (Markdown)
    AI-->>Processor: briefing text
    deactivate AI

    Processor->>Processor: Build briefing task
    Note over Processor: Title: "📅 Daily Briefing: {date}"<br/>Description: AI-generated content<br/>Priority: P1 (4)<br/>Due: today

    Processor->>Todoist: createTask(briefingTask)
    activate Todoist
    Todoist->>TodoistAPI: POST /rest/v2/tasks
    TodoistAPI-->>Todoist: task created
    Todoist-->>Processor: success
    deactivate Todoist

    Processor-->>User: Success
    deactivate Processor
```

### Key Details:
- **Trigger**: Manual or scheduled (recommended: daily between 6 AM and 7 AM)
- **Data Sources**:
  - Calendar events for today
  - Tasks due today, overdue, or priority 1
- **AI Analysis**:
  - Identifies critical focus items (1-2 must-dos)
  - Highlights schedule with tight transitions/conflicts
  - Lists quick wins (15-min tasks)
  - Notes meetings lacking preparation or agenda
- **Output**: Single P1 Todoist task with Markdown briefing
- **Purpose**: Executive summary to start the day with clarity

---

## Flow 8: Quick Wins Summary

This flow analyzes inbox tasks to identify quick 2-minute tasks and creates a summary.

```mermaid
sequenceDiagram
    participant User
    participant Processor
    participant Todoist
    participant AI
    participant TodoistAPI
    participant GeminiAPI

    User->>Processor: generateQuickWinsSummary()
    activate Processor

    Processor->>Todoist: getTasksByFilter("#Inbox")
    activate Todoist
    Todoist->>TodoistAPI: GET /rest/v2/tasks?filter=%23Inbox
    TodoistAPI-->>Todoist: inboxTasks[]
    Todoist-->>Processor: tasks[]
    deactivate Todoist

    alt No inbox tasks
        Note over Processor: Log and return false
        Processor-->>User: No tasks found
    end

    Processor->>Processor: Build analysis prompt
    Note over Processor: Include task data:<br/>- id, content, description<br/>- priority, labels

    Processor->>AI: processCall(analysisPrompt, systemInstruction)
    activate AI
    AI->>GeminiAPI: POST /v1beta/models/{model}:generateContent
    Note over AI,GeminiAPI: Request JSON analysis:<br/>- Identify < 2 min tasks<br/>- Provide reason for each<br/>- Generate motivational summary
    GeminiAPI-->>AI: JSON response
    AI-->>Processor: analysis JSON
    deactivate AI

    Processor->>Processor: extractJsonFromResponse(response)
    Note over Processor: Parse: quick_tasks[], summary

    alt No quick tasks identified
        Note over Processor: Log and return false
        Processor-->>User: No quick wins found
    end

    Processor->>Processor: Build summary task
    Note over Processor: Title: "⚡ Quick Wins Summary: {count} tasks"<br/>Description: Formatted list with reasons<br/>Priority: P2 (3)<br/>Due: today 9:00 AM<br/>Duration: 15 minutes

    Processor->>Todoist: createTask(summaryTask)
    activate Todoist
    Todoist->>TodoistAPI: POST /rest/v2/tasks
    TodoistAPI-->>Todoist: task created
    Todoist-->>Processor: success
    deactivate Todoist

    Processor-->>User: Success
    deactivate Processor
```

### Key Details:
- **Trigger**: Manual or scheduled (recommended: daily between 6 AM and 7 AM)
- **Target**: Tasks in #Inbox project
- **AI Analysis**:
  - Evaluates complexity and execution time
  - Conservative assessment (only truly quick tasks)
  - Common 2-minute tasks: quick emails, simple decisions, short calls, lookups
  - Excludes: vague tasks, research, coordination, creative work
- **Output Format**: P2 task scheduled at 9 AM with:
  - Numbered list of quick wins
  - Reason for each selection
  - Motivational summary (2-3 sentences)
- **Duration**: 15 minutes allocated for review
- **Purpose**: Batch quick tasks for momentum and productivity

---

## Smart Context Sync

The `processContextData()` function implements intelligent caching to keep your AI context fresh while minimizing API usage:

**How it works:**
```javascript
// Only uploads files that have actually changed
if (VaultClient.wasUpdated(file) || PropertiesUtil.isFileExpired(file.getName()) || forceUpdate) {
  var fileResult = AiClient.uploadFile(file.getName(), file.getBlob());
}
```

**Result:** Near-real-time context freshness with minimal API costs. The system only uploads files when:
- File has been modified since last upload
- File metadata has expired (>10 minutes)
- Force update is requested
