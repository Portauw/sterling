# Repository Patterns

<!-- Generated on: 2025-10-24 -->
<!-- Last updated: 2025-10-24 -->

This document describes the key code patterns used in this repository. When teaching or implementing features, reference these patterns by name and point to the examples.

---

## Pattern 1: IIFE Module Pattern

**What**: Immediately Invoked Function Expression (IIFE) for creating service modules with encapsulated state and configuration

**Where**: All service files (AI.js, Todoist.js, Processor.js, Calendar.js, GoogleTask.js, Vault.js)

**Example**: `AI.js:1-6`, `Todoist.js:1`, `Processor.js:1-11`

**When to use**: When creating a new service module that needs configuration and private state

**Structure/Example:**
```javascript
const ServiceName = (function ({
  configParam1,
  configParam2,
  optionalParam = 'default value'
}) {

  function log(message) {
    console.log(`ServiceName: ${JSON.stringify(message, null, 2)}`);
  }

  // Private functions and variables
  function privateHelper() {
    // implementation
  }

  // Public API
  function publicMethod() {
    // implementation
  }

  return {
    publicMethod
    // only expose what's needed
  };
});
```

**Key aspects:**
- Configuration passed as destructured object parameter
- Private scope for internal functions and constants
- Consistent logging with module prefix
- Only public methods returned in object
- Module initialized in Main.js or Processor.js with config

**Related patterns**: Consistent Logging Pattern

---

## Pattern 2: Consistent Logging Pattern

**What**: Standardized logging format with module-specific prefixes and JSON stringification

**Where**: Every service module (all .js files)

**Example**: `AI.js:23-25`, `Todoist.js:19-21`, `Processor.js:13-14`

**When to use**: In every module for debugging and monitoring

**Structure/Example:**
```javascript
function log(message) {
  console.log(`ModuleName: ${message ? JSON.stringify(message, null, 2) : 'null'}`);
}

// Usage:
log('Simple message');
log({ taskId: 123, status: 'completed' });
log(complexObject);
```

**Key aspects:**
- Always includes module name prefix for traceability
- JSON.stringify with 2-space indentation for readability
- Handles null/undefined gracefully
- Shows up in Stackdriver logging
- Critical for debugging serverless functions

**Common mistakes to avoid:**
- Don't use plain `console.log()`: Always use the module's `log()` function
- Don't forget to handle null/undefined: Use ternary operator for safety

---

## Pattern 3: Properties Service for State Management

**What**: Using Google Apps Script Properties Service as a key-value store with expiration tracking

**Where**: PropertiesUtil.js (utility class), used throughout Processor.js

**Examples**:
- `PropertiesUtil.js:8-31` (get/set methods)
- `PropertiesUtil.js:45-56` (expiration check)
- `Processor.js:48` (setting file metadata)

**When to use**: When you need to persist state across script executions (sync tokens, file metadata, cache data)

**Structure/Example:**
```javascript
// Set a property
PropertiesUtil.setPropertyValue(fileName, fileMetadata);

// Get a property
const metadata = PropertiesUtil.getFileMetaPropertyValue(fileName);

// Check expiration
if (PropertiesUtil.isFileExpired(fileName)) {
  // Re-upload file
}
```

**Key aspects:**
- All values stored as JSON strings
- File metadata includes expiration timestamps
- 10-minute expiration buffer before actual expiry
- Static class methods for easy access
- Used for caching uploaded files and sync tokens

**When NOT to use**: For large data (quotas apply) or temporary data within a single execution

---

## Pattern 4: API Client with Retry Logic

**What**: HTTP calls to external APIs with retry mechanism for resilience

**Where**: AI.js for Gemini API calls

**Example**: `AI.js:9-12` (retry config), retry implementation in generateContent function

**When to use**: When making critical external API calls that may fail temporarily

**Structure/Example:**
```javascript
const RETRY_CONFIG = {
  maxTryCount: 3,
  intervalSeconds: 30
}

// In API call function:
for (let attempt = 1; attempt <= RETRY_CONFIG.maxTryCount; attempt++) {
  try {
    const result = UrlFetchApp.fetch(url, params);
    return result; // Success
  } catch (error) {
    if (attempt < RETRY_CONFIG.maxTryCount) {
      Utilities.sleep(RETRY_CONFIG.intervalSeconds * 1000);
      continue;
    }
    throw error; // Final attempt failed
  }
}
```

**Key aspects:**
- 3 retries with 30-second intervals
- Used for AI API calls (critical operations)
- Utilities.sleep() for delays between retries
- Throws error only after all retries exhausted

**Related patterns**: Graceful Error Handling

---

## Pattern 5: Graceful Error Handling

**What**: Using `muteHttpExceptions: true` for controlled error handling

**Where**: All API calls (AI.js, Todoist.js)

**Examples**:
- `AI.js:30` (DELETE file request)
- `Todoist.js:29` (set to false for task creation - throws on error)

**When to use**: When you want to handle HTTP errors gracefully without script termination

**Structure/Example:**
```javascript
const params = {
  method: 'POST',
  contentType: 'application/json',
  muteHttpExceptions: true, // Don't throw on HTTP errors
  headers: { Authorization: "Bearer " + apiKey }
};

const response = UrlFetchApp.fetch(url, params);
const responseCode = response.getResponseCode();

if (responseCode === 200) {
  // Success
} else {
  log(`Error: ${responseCode} - ${response.getContentText()}`);
  return null;
}
```

**Key aspects:**
- Prevents script crash on API errors
- Allows custom error handling
- Check response codes manually
- Log errors for debugging
- Sometimes set to `false` when you want exceptions (Todoist.js:29)

**Variations:**
- **Muted**: Use when errors are expected/handleable - Example: `AI.js:30`
- **Not muted**: Use when errors should stop execution - Example: `Todoist.js:29`

---

## Pattern 6: Rate Limiting with Sleep

**What**: Using Utilities.sleep() to avoid hitting API rate limits

**Where**: Processor.js during task enrichment loops

**Example**: `Processor.js:74` (20 second delay between task enrichments)

**When to use**: When making multiple API calls in loops to avoid rate limiting

**Structure/Example:**
```javascript
for (const task of tasks) {
  // Process task
  enrichTodoistTask(task);

  // Rate limit: wait before next iteration
  Utilities.sleep(20 * 1000); // 20 seconds
}
```

**Key aspects:**
- Sleep is in milliseconds (20 * 1000 = 20 seconds)
- Applied between expensive operations (AI calls)
- Prevents API rate limit errors
- Balances speed with API quotas

---

## Pattern 7: Dependency Injection via Configuration

**What**: Services receive their dependencies through configuration objects rather than importing directly

**Where**: All service modules, orchestrated in Processor.js and Main.js

**Examples**:
- `Processor.js:17-30` (initializing clients with config)
- `Main.js` (provides all configuration to Processor)

**When to use**: Always when creating service modules

**Structure/Example:**
```javascript
// In Processor or Main:
const TodoistClient = Todoist({
  todoistApiKey: todoistApiKey,
  label: label
});

const AiClient = AI({
  geminiApiKey: geminiApiKey,
  geminiModel: geminiModel,
  AGENTS_PROMPTS
});

// Services are then used within Processor:
TodoistClient.createTask(task);
AiClient.generateContent(prompt);
```

**Key aspects:**
- Central configuration in Main.js
- Processor.js orchestrates all services
- Each service is self-contained
- Easy to test and mock
- Clear dependency graph

**Related patterns**: IIFE Module Pattern

---

## Pattern Quick Reference

| Pattern Name | Use Case | Example File |
|--------------|----------|--------------|
| IIFE Module Pattern | Creating service modules | `AI.js:1`, `Todoist.js:1` |
| Consistent Logging | Debugging and monitoring | `AI.js:23`, `Processor.js:13` |
| Properties Service State | Persistent state storage | `PropertiesUtil.js:8`, `Processor.js:48` |
| API Retry Logic | Resilient external API calls | `AI.js:9` |
| Graceful Error Handling | Controlled error responses | `AI.js:30`, `Todoist.js:29` |
| Rate Limiting | Avoid API limits | `Processor.js:74` |
| Dependency Injection | Service configuration | `Processor.js:17-30` |

---

## Adding New Patterns

As new patterns emerge or become standardized:

1. Document the pattern following the template above
2. Provide at least 2-3 examples from the codebase
3. Explain when to use vs when not to use
4. Update the quick reference table

---

## Pattern Anti-Patterns

### Anti-Pattern 1: Direct API Calls Without Retry

**What not to do:**
```javascript
// Don't make critical API calls without retry logic
const result = UrlFetchApp.fetch(geminiUrl, params);
return JSON.parse(result.getContentText());
```

**Why it's problematic**: Temporary API failures will crash the entire script execution

**Correct pattern**: API Client with Retry Logic (see above)

### Anti-Pattern 2: Missing Logging

**What not to do:**
```javascript
function processTask(task) {
  // No logging of what's happening
  const result = doSomething(task);
  return result;
}
```

**Why it's problematic**: Impossible to debug in production (Stackdriver logs will be empty)

**Correct pattern**: Consistent Logging Pattern - log at key points with module prefix

---

*To update this file: Edit directly with your project's code patterns and examples*
