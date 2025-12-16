var Telemetry = (function() {
  
  const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
  const SENSITIVE_KEYS = ['apikey', 'api_key', 'token', 'key', 'authorization', 'password', 'secret', 'geminiapikey', 'todoistapikey'];
  let config = {}; // Internal state for global configuration

  /**
   * recursively redacts sensitive keys from an object.
   */
  function redact(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
      return obj.map(item => redact(item));
    }

    // Handle Objects
    const redactedObj = {};
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      // Check if key matches sensitive list
      if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
        redactedObj[key] = '***REDACTED***';
      } else {
        redactedObj[key] = redact(obj[key]);
      }
    }
    return redactedObj;
  }

  // Internal helper to send to Stackdriver with structured logging
  function logToConsole(level, module, message, data) {
    const payload = {
      module: module,
      message: message,
      data: redact(data), // REDACT DATA BEFORE LOGGING
      env: config.env
    };
    
    // Using console.log, console.warn, console.error to leverage Stackdriver's severity detection
    switch(level) {
      case 'ERROR':
        console.error(JSON.stringify(payload));
        break;
      case 'WARN':
        console.warn(JSON.stringify(payload));
        break;
      // INFO and DEBUG will both go to console.log, Stackdriver distinguishes by their payload keys
      default:
        console.log(JSON.stringify(payload));
    }
  }

  // Internal helper to notify (only on Error)
  function notifyAdmin(module, message, error) {
    if (!config.todoistApiKey || !config.adminTodoistProjectId) return;
    
    // TODO: Implement Todoist task creation here if adminTodoistProjectId and todoistApiKey are provided
    // This would involve making a call to the Todoist client directly or via a wrapper
    // For now, just log that a notification *would* have been sent.
    logToConsole('INFO', 'Telemetry', `Admin notification triggered for ${module}: ${message}`);
  }

  return {
    init: (newConfig) => {
      config = { ...config, ...newConfig }; // Merge new config

      // Create safe summary instead of logging full config (defense-in-depth)
      const configSummary = {
        hasGeminiApiKey: !!config.geminiApiKey,
        hasTodoistApiKey: !!config.todoistApiKey,
        hasAdminTodoistProjectId: !!config.adminTodoistProjectId,
        env: config.env,
        configuredModules: Object.keys(config).length
      };

      logToConsole('INFO', 'Telemetry', 'Telemetry initialized with new configuration.', configSummary);
    },
    getLogger: (moduleName) => ({
      debug: (msg, data) => logToConsole('DEBUG', moduleName, msg, data),
      info: (msg, data) => logToConsole('INFO', moduleName, msg, data),
      warn: (msg, data) => logToConsole('WARN', moduleName, msg, data),
      error: (msg, err) => {
        logToConsole('ERROR', moduleName, msg, err);
        notifyAdmin(moduleName, msg, err);
      }
    })
  };
})();