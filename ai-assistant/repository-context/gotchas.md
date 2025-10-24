# Common Gotchas & Pitfalls

<!-- Generated on: 2025-10-24 -->
<!-- Last updated: 2025-10-24 -->

This document captures common mistakes engineers make when working in this codebase and how to avoid them.

---

## Gotcha 1: Missing Module Logging

**Problem**: Adding functions without using the module's log() function

**Why it happens**: Used to using console.log() directly from other JavaScript environments

**Example of the mistake:**
```javascript
function processTask(task) {
  console.log('Processing task'); // Wrong!
  // ... logic
}
```

**Correct approach:**
```javascript
function processTask(task) {
  log(`Processing task: ${task.id}`); // Correct - uses module's log()
  // ... logic
}
```

**Where to see it done correctly**: `Processor.js:13-14`, `AI.js:23-25`, `Todoist.js:19-21`

**How to prevent**: Always define and use the module-scoped `log()` function (see Consistent Logging Pattern in patterns.md)

---

## Gotcha 2: Forgetting Rate Limiting

**Problem**: Making multiple AI API calls in a loop without sleep delays causes rate limit errors

**Symptoms**:
- 429 Too Many Requests errors
- Script execution failures during batch operations
- Inconsistent task enrichment

**Why it happens**: Easy to forget that external APIs have rate limits

**Example of the mistake:**
```javascript
for (const task of tasks) {
  enrichTodoistTask(task);
  // No delay - will hit rate limits!
}
```

**Correct approach:**
```javascript
for (const task of tasks) {
  enrichTodoistTask(task);
  Utilities.sleep(20 * 1000); // 20 seconds between operations
}
```

**Where to see it done correctly**: `Processor.js:74`, `Processor.js:310`

**Pattern to use**: Rate Limiting with Sleep pattern (see patterns.md)

**Related to**: Gemini API quotas, execution time limits

---

## Gotcha 3: Not Handling Properties Service Expiration

**Problem**: Assuming cached file metadata is always valid without checking expiration

**Why it happens**: Gemini file uploads have TTLs, and cached metadata becomes stale

**Example of the mistake:**
```javascript
// Assuming file is always available
const fileMetadata = PropertiesUtil.getFileMetaPropertyValue(fileName);
const files = [fileMetadata.uri]; // Will fail if expired!
```

**Correct approach:**
```javascript
// Check expiration first
if (PropertiesUtil.isFileExpired(fileName)) {
  // Re-upload file
  const fileResult = AiClient.uploadFile(fileName, fileBlob);
  PropertiesUtil.setPropertyValue(fileName, fileResult);
}
const fileMetadata = PropertiesUtil.getFileMetaPropertyValue(fileName);
```

**Where to see it done correctly**: `Processor.js:45-53`

**Related gotcha**: File Expiration Buffer (10-minute check before actual expiry at PropertiesUtil.js:48)

---

## Gotcha 4: muteHttpExceptions Inconsistency

**Problem**: Not understanding when to use `muteHttpExceptions: true` vs `false`

**Common scenario**: Setting it inconsistently across API calls

**Why it's problematic**:
- Can cause unexpected script crashes
- Or silently fail without proper error handling
- Makes debugging difficult

**Example of the mistake:**
```javascript
const params = {
  method: 'POST',
  muteHttpExceptions: false // But no try/catch!
};
const result = UrlFetchApp.fetch(url, params); // Will crash on error
```

**Correct approach:**
```javascript
// Option 1: Mute and handle manually
const params = {
  method: 'POST',
  muteHttpExceptions: true
};
const response = UrlFetchApp.fetch(url, params);
if (response.getResponseCode() !== 200) {
  log(`Error: ${response.getResponseCode()}`);
  return null;
}

// Option 2: Don't mute but wrap in try/catch
try {
  const params = { method: 'POST', muteHttpExceptions: false };
  const result = UrlFetchApp.fetch(url, params);
} catch (error) {
  log(`Failed: ${error.message}`);
}
```

**Where to see it done correctly**:
- Muted: `AI.js:30` (file deletion)
- Not muted: `Todoist.js:29` (task creation with try/catch)

---

## Gotcha 5: Label Management in Task Enrichment

**Problem**: Forgetting to remove the "enrich" label after processing, causing infinite loops

**Why it happens**: Easy to forget the label removal step after enrichment

**Example of the mistake:**
```javascript
function enrichTodoistTask(task) {
  // Enrich the task
  const aiResult = AiClient.processCall(content, ...);
  TodoistClient.createComment(task.id, aiResult);
  // Forgot to remove label! Task will be processed again and again
}
```

**Correct approach:**
```javascript
function enrichTodoistTask(task) {
  const aiResult = AiClient.processCall(content, ...);
  TodoistClient.createComment(task.id, aiResult);

  // IMPORTANT: Remove the enrich label to prevent re-processing
  task.labels.splice(task.labels.indexOf(ENRICHT_LABEL), 1);
  TodoistClient.updateTask(task);
}
```

**Where to see it done correctly**: `Processor.js:72-73`, `Processor.js:110-111`

**Impact**: Critical - without label removal, tasks are enriched repeatedly

---

## Gotcha 6: JSON Parsing from AI Responses

**Problem**: AI responses may wrap JSON in markdown code blocks, breaking direct JSON.parse()

**Common scenario**: Calendar event processing expects JSON but gets markdown

**Why it's problematic**:
- Script crashes with JSON parse errors
- Silently fails to process calendar events
- Difficult to debug without seeing the raw response

**Example of the mistake:**
```javascript
const aiResponse = AiClient.processCall(content, ...);
const data = JSON.parse(aiResponse); // Fails if wrapped in ```json ```
```

**Correct approach:**
```javascript
const aiResponse = AiClient.processCall(content, ...);
const data = extractJsonFromResponse(aiResponse); // Handles markdown, plain JSON, etc.
```

**Where to see it done correctly**: `Processor.js:214`, `Processor.js:220-248`

**Pattern**: Always use `extractJsonFromResponse()` helper when parsing AI outputs

---

## Category: Google Apps Script Gotchas

### Gotcha: 6-Minute Execution Time Limit

**Problem**: Long-running operations (many task enrichments) hit the 6-minute Apps Script execution limit

**Impact**: Script terminates mid-execution, some tasks unprocessed

**Example:**
```javascript
// Processing 50 tasks with 20s sleep = 1000s = 16+ minutes
for (const task of manyTasks) {
  enrichTodoistTask(task);
  Utilities.sleep(20 * 1000); // Will timeout!
}
```

**Optimized version:**
```javascript
// Process in smaller batches, use triggers for continuation
const BATCH_SIZE = 10; // Process 10 at a time
const batch = tasks.slice(0, BATCH_SIZE);
for (const task of batch) {
  enrichTodoistTask(task);
  Utilities.sleep(20 * 1000);
}
// Set trigger to process next batch later
```

**See**: Google Apps Script quotas documentation

---

### Gotcha: Properties Service 9KB Limit

**Problem**: Storing large objects in Properties Service causes silent failures

**Risk**: File metadata or cache data exceeds 9KB per property

**Example of vulnerable code:**
```javascript
// Storing huge object
const largeContext = { /* massive data */ };
PropertiesUtil.setPropertyValue('context', largeContext); // May fail silently
```

**Secure approach:**
```javascript
// Keep properties small - store references, not full data
const fileReference = {
  fileId: file.id,
  expirationTime: expiry,
  name: file.name
};
PropertiesUtil.setPropertyValue(fileName, fileReference); // Small, safe
```

**Required practice**: Keep property values under 9KB (preferably < 5KB for safety)

---

## Category: API-Specific Gotchas

### Gotcha: Gemini File Upload Requires Multipart

**Problem**: Using wrong content type for Gemini file uploads causes 400 errors

**Why it's tricky**: Gemini upload endpoint requires multipart/form-data with specific formatting

**Example:**
```javascript
// Wrong - will fail
const params = {
  method: 'POST',
  contentType: 'application/json',
  payload: file.getBlob()
};
```

**Correct pattern:**
```javascript
// Correct - multipart upload
const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${apiKey}`;
const params = {
  method: 'POST',
  contentType: 'multipart/related',
  payload: boundary + metadata + boundary + fileBlob + endBoundary
};
```

**See**: `AI.js:8` for proper upload URL construction

---

### Gotcha: Todoist Sync Token Invalidation

**Problem**: Not updating sync token after successful sync causes duplicate processing

**Why it happens**: Sync token tracks last processed changes - old token re-processes same tasks

**Example:**
```javascript
const tasks = TodoistClient.getUpdatedTasks();
// Process tasks...
// Forgot to update sync token! Next run will get same tasks again
```

**Correct approach:**
```javascript
const tasks = TodoistClient.getUpdatedTasks(); // Gets tasks since last token
// Process tasks...
// Update sync token so next run only gets new changes
TodoistClient.updateSyncToken(newToken);
```

**See**: `Todoist.js:3` (sync token constant), sync implementation in Todoist.js

---

## Gotcha Checklist

When working on task enrichment, check for these common issues:

- [ ] Added proper logging with module's `log()` function
- [ ] Included rate limiting (`Utilities.sleep()`) in loops
- [ ] Checked Properties Service expiration before using cached data
- [ ] Used `muteHttpExceptions` appropriately with error handling
- [ ] Removed "enrich" label after processing task
- [ ] Used `extractJsonFromResponse()` for AI JSON outputs
- [ ] Considered 6-minute execution time limit for batches
- [ ] Kept Properties Service values small (< 9KB)

---

## Adding New Gotchas

When you or someone on your team encounters a common mistake:

1. Document it here immediately
2. Include:
   - Clear description of the problem
   - Why it happens
   - Example of the mistake
   - Correct approach
   - File reference to proper implementation
3. Consider adding it to patterns.md if it's a pattern

---

## Gotchas by Severity

### Critical (Must Fix)
- **Label Management**: Infinite enrichment loops - See Gotcha 5
- **Rate Limiting**: API failures and quota exhaustion - See Gotcha 2
- **Execution Time Limit**: Incomplete processing - See Apps Script Gotcha

### Important (Should Fix)
- **Properties Expiration**: Using stale file metadata - See Gotcha 3
- **JSON Parsing**: Script crashes on AI responses - See Gotcha 6
- **Sync Token**: Duplicate task processing - See Todoist Gotcha

### Minor (Good to Fix)
- **Missing Logging**: Difficult debugging - See Gotcha 1
- **muteHttpExceptions**: Inconsistent error handling - See Gotcha 4

---

*To update this file: Add gotchas as they're discovered. This is a living document that grows with team knowledge.*
