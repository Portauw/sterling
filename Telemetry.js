const Telemetry = (function() {
  
  const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
  let config = {}; // Internal state for global configuration

  // Internal helper to send to Stackdriver with structured logging
  function logToConsole(level, module, message, data) {
    const payload = {
      module: module,
      message: message,
      data: data,
      env: config.env // Add environment from global config
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
      logToConsole('INFO', 'Telemetry', 'Telemetry initialized with new configuration.', config);
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