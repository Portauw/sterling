var processor = Sterling.main({

    gTaskListId: 'XXXXX',
    geminiApiKey: 'XXXXX',
    geminiModel: 'gemini-3-flash-preview',
    calendarId: 'example@domain.com',
    promptInstructions: {
        mailSummaryPrompt: 'Provide me a short summary of the email and, when applicable, are there actions to be taken based on this email.',
        generalTaskPrompt: 'Generate some ideas and actionable items for this task. Can you provide me with example on how I can tackle the task.',
        agents_prompt: 'agents.md_file_id',
        calendar_instructions_prompt: 'calendar_instructions.md_file_id'
    },
    todoistApiKey: 'XXXXX',
    label: 'example_label',
    todoistProjectId: 'example_project_id',
    driveFolders: [
        {
            name: 'PEOPLE_FOLDER',
            id: 'example_folder_id'
        },
        {
            name: 'MEETINGS_FOLDER',
            id: 'example_folder_id'
        },
        {
            name: 'PROJECTS_FOLDER',
            id: 'example_folder_id'
        },
        {
            name: 'GENERAL_FOLDER',
            id: 'example_folder_id'
        }
    ],
});

function syncAndEnrich() {
    processor.processGoogleTasks();
    processor.enrichTodoistTasks();
}

function refreshContext() {
    processor.processContextData();
}

function handleEnrichingTasks() {
    processor.enrichTodaysTasksForLabel('enrich');
}

function doPost(e) {
    processor.enrichTodoistTasks();
}

function scheduledCalendarItemProcessing() {
    processor.processCalendarItems();
    processor.enrichTodaysTasksForLabel('enrich_scheduled');
}

function scheduledJustInTimeProcessing() {
    processor.enrichTodaysTasksForLabel('prepare_jit');
}
