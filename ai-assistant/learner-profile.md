# Learner Profile

This file stores your personal learning preferences for AI-assisted coding sessions. The AI assistant will read this file at the start of each session to adapt its teaching style to your needs.

**This file is git-ignored** - it's personal to you and won't be committed to version control.

## How to Use

1. Fill out the sections below based on your experience and goals
2. Update this file anytime your needs change
3. Delete this file to be asked the questions again in your next session

---

## Your Profile

### Experience Level
<!-- Choose ONE: entry-level, early-career, mid-level, senior -->
**Current Level:** senior

**Description:**
- **entry-level**: New to professional software development (0-1 years)
- **early-career**: Building foundations (1-3 years)
- **mid-level**: Comfortable with core concepts (3-5 years)
- **senior**: Experienced with architecture and patterns (5+ years)

---

### Tech Stack Familiarity
<!-- Choose ONE: new, familiar, experienced, expert -->
**Familiarity with this codebase's tech stack:** experienced

**Description:**
- **new**: First time using these technologies
- **familiar**: Have used them in tutorials/small projects
- **experienced**: Have shipped production code with these technologies
- **expert**: Deep understanding, know best practices and edge cases

---

### Learning Goals
<!-- Choose ONE or MULTIPLE that apply -->
**Primary Goals:** mastery

**Options:**
- **architecture**: Understanding system design and how components fit together
- **productivity**: Getting tasks done efficiently, learning shortcuts and workflows
- **mastery**: Deep dive into patterns, best practices, and advanced concepts
- **specific-task**: Focused on completing current work items

---

### Preferred Scaffolding Level
<!-- This is typically auto-calculated, but you can override it -->
**Scaffolding:** auto

**Description:**
- **auto**: Let AI determine based on experience + familiarity (recommended)
- **high**: Maximum guidance, step-by-step explanations
- **medium**: Balanced guidance with opportunities to explore
- **low**: Minimal guidance, hints and references only

---

### Response Verbosity
<!-- Control how detailed AI responses should be -->
**Verbosity:** balanced

**Description:**
- **auto**: Let AI determine based on context and scaffolding level (recommended)
- **concise**: Brief, direct answers with minimal explanation
- **balanced**: Core explanation with key examples (default)
- **detailed**: Comprehensive explanations with multiple examples and context

**Note:** This works alongside scaffolding. Even with "concise" verbosity, teaching moments are preserved but delivered more efficiently.

---

### Teaching Moments per Response
<!-- How many key concepts to focus on per interaction -->
**Teaching Moments:** 1-2

**Description:**
- **1-2** (recommended): Focus on 1-2 key concepts per response for better retention and focus
- **3-4**: Cover more ground per interaction, suitable for experienced engineers
- **unlimited**: Teach all relevant concepts in each response (may be overwhelming)

**Default:** 1-2 teaching moments per response

**Note:** Even with "unlimited", responses still follow verbosity preferences. This controls breadth (how many concepts) while verbosity controls depth (how detailed each concept is explained).

---

### Mastered Topics
<!-- Topics you've mastered and no longer need explained -->

**General Concepts:**
- (e.g., async/await, React hooks, TypeScript generics, dependency injection)

**Repository-Specific Patterns:**
- (e.g., our API client pattern, our error handling approach, our auth flow)

**Instructions:**
- Add topics you're comfortable with and don't need explained anymore
- AI will occasionally suggest topics to add based on your demonstrated understanding
- You can remove topics anytime if you want a refresher
- Format: Simple bullet list, one topic per line

**Example:**
```
**General Concepts:**
- async/await
- React hooks
- TypeScript interfaces

**Repository-Specific Patterns:**
- Our dependency injection pattern (from patterns.md)
- Error boundary implementation
```

---

## Notes

Add any additional context about your learning preferences, specific areas you want to focus on, or topics you're already comfortable with:

Focus on getting better at JavaScript and deep mastery of the codebase patterns.

---

*Last updated: 2025-11-22*