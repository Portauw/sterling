# Sterling

A Google Apps Script library for intelligent task automation, integrating Google Tasks, Todoist, Google Calendar, and Gemini AI.

<a href="https://buymeacoffee.com/pieterportauw" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-Library-blue.svg)](https://developers.google.com/apps-script)

---

## Quick Start

Sterling is a **Google Apps Script library** that you deploy once and use across multiple projects.

### 1. Deploy Sterling as a Library (One-Time Setup)

#### Prerequisites

**1. Node.js and npm**
- Download from [nodejs.org](https://nodejs.org/)

**2. Google Cloud Project**

Create a new Google Cloud Project and enable the following APIs:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable these APIs (search for each in the API Library):
   - **Google Tasks API**
   - **Google Calendar API**
   - **Google Drive API**
   - **Generative Language API** (for Gemini)
   - **Google Apps Script API**

📚 [How to enable APIs](https://support.google.com/googleapi/answer/6158841)

**3. Note your GCP Project Number**
- In Google Cloud Console, go to **Dashboard**
- Copy your **Project Number** (you'll need this later)

📚 [How to find your project number](https://support.google.com/googleapi/answer/7014113)

---

#### Setup Steps

```bash
# Install clasp (Google Apps Script CLI)
npm install -g @google/clasp
clasp login

# Clone Sterling
git clone https://github.com/Portauw/sterling.git
cd sterling

# Create Apps Script project and push files
clasp create --type standalone --title "Sterling Library"
clasp push

# Open in Apps Script editor
clasp open
```

In the Apps Script editor:

1. **Link Google Cloud Project:**
   - Click **Project Settings** → **Change project**
   - Enter your GCP project number

2. **Deploy as Library:**
   - Click **Deploy** → **New deployment**
   - Select type: **Library**
   - Click **Deploy** and copy the **Script ID**

3. **Share Access:**
   - Give view permissions to anyone who will use the library

📚 **[How to use Sterling in your projects →](./examples/README.md)**

---

## Documentation

- **[Examples & Setup Guide](./examples/README.md)** - Complete setup instructions and usage examples
- **[API Reference](./docs/API.md)** - Detailed API documentation
- **[Architecture](./docs/ARCHITECTURE.md)** - System flows and technical architecture
- **[AGENTS.md](./AGENTS.md)** - Comprehensive technical documentation and implementation details

---

## Features

Sterling provides intelligent automation for your task management workflow:

### 🔄 **Task Synchronization**
- Automatically sync Google Tasks to Todoist
- Mark completed tasks in Google Tasks
- Smart label assignment based on task type

### 🤖 **AI-Powered Task Enrichment**
- Enhance tasks with Gemini AI insights
- Context-aware suggestions using Drive files
- Natural language task understanding
- Conversational task refinement with comments

### 📅 **Calendar Intelligence**
- Automatic meeting preparation task creation
- Smart scheduling that respects your work hours
- AI-generated meeting prep prompts
- Just-in-time task preparation

### 📚 **Context Management**
- Automatic Drive file sync for AI context
- Smart caching (uploads only changed files)
- Supports multiple folder sources
- 10-minute TTL for fresh context

### 📊 **Productivity Insights**
- Daily briefing with critical focus items
- Quick wins identification (2-minute tasks)
- Schedule conflict detection
- Priority task highlighting

---

## Public API

The `Sterling.main()` function returns a Processor instance with these methods:

### Core Methods

| Method | Description | Typical Schedule |
|--------|-------------|------------------|
| `processGoogleTasks()` | Sync Google Tasks → Todoist | Every 10 minutes |
| `enrichTodoistTasks()` | AI-enhance tasks with 'enrich' label | Every 10 minutes |
| `processCalendarItems()` | Create meeting preparation tasks | Daily, 6-7 AM |
| `processContextData(forceUpdate?)` | Upload Drive files to AI context | Every 5 minutes |

### Advanced Methods

| Method | Description | Typical Schedule |
|--------|-------------|------------------|
| `enrichTodaysTasksForLabel(label)` | Batch enrich tasks with specific label | Daily, 7-8 AM |
| `generateDailyBriefing()` | Create executive summary task | Daily, 6-7 AM |
| `generateQuickWinsSummary()` | Identify 2-minute tasks from inbox | Daily, 6-7 AM |

📚 **[See detailed API documentation →](./docs/API.md)**

---


📚 **[See complete architecture documentation →](./docs/ARCHITECTURE.md)**

---

## License

Sterling is open source software licensed under the [MIT License](./LICENSE).

## Contributing

Contributions are welcome! Feel free to:
- Report bugs and request features via [GitHub Issues](../../issues)
- Submit pull requests
- Fork and adapt for your own use

---

**Built with ❤️ by [Pieter Portauw](https://buymeacoffee.com/pieterportauw)**
