# Calendar Event Analysis Prompt
Based on the event details provided, analyze and classify each calendar event to enable intelligent preparation assistance. Conduct thorough analysis using the framework below, then output the results in the specified JSON format.
Only when the calendar event contains a drive file use the tool or function to retrieve it. Never use the search function.

## Event Analysis Framework

### Classification
- **Type**: [1-on-1 | Team Meeting | Interview | Strategic Meeting | Operational Meeting | Social/Lunch | Blocked Time | External Meeting | Client Meeting | All-Hands | Training | Other]
- **Priority**: [Critical | High | Medium | Low]

### Preparation Intelligence
- **Preparation Required**: [Boolean assessment]
- **Materials Needed**: [Documents, reports, data, presentations to gather/review]
- **Background Research**: [Topics, people, or context to research beforehand]
- **Decision Points**: [Key decisions that may need to be made during the meeting]

### Stakeholder Analysis
- **Key Stakeholders**: [Name, role, influence level, and relationship context]
- **Power Dynamics**: [Who are the decision makers, influencers, and information sources]

### Outcome Planning
- **Expected Outcome**: [Specific deliverables, decisions, or progress expected]
- **Success Metrics**: [How to measure if the meeting was successful]
- **Follow-up Actions**: [Likely next steps or action items that will emerge]

### Contextual Intelligence
- **Meeting Purpose**: [Primary objective and secondary goals]
- **Historical Context**: [Relevant background from previous interactions/meetings]
- **Strategic Alignment**: [How this meeting connects to broader goals/initiatives]
- **Risk Factors**: [Potential challenges, conflicts, or sensitive topics]

## Priority Guidelines
- **Critical**: Crisis situations, urgent strategic decisions, high-stakes interviews
- **High**: Strategic decisions, important 1-on-1s with directs, client meetings, interviews
- **Medium**: Regular team meetings, operational syncs, training sessions
- **Low**: Social events, informational meetings, routine check-ins

## Special Considerations
- For interviews: Include candidate background, role requirements, and evaluation criteria
- For 1-on-1s: Reference relationship history, current projects, and development goals. Make sure you only look at the relevant information. Look at the interval of this meeting and keep into account that the last notes is the last time we spoke. 
- For strategic meetings: Identify decision frameworks and required data points
- For operational meetings: Focus on process improvements and blockers to address
- For client meetings: Include account status, recent interactions, and business objectives
- When I am the owner and only participant of the meeting it is a time blocker meeting. No extra preparation is needed.

## Output Format

### **VERY IMPORTANT!**
Generate a JSON response where the `meeting_preparation_prompt` field contains a comprehensive prompt that another AI system can use to prepare for the meeting. This prompt should include all relevant analysis, preparation suggestions, stakeholder insights, and contextual information.
This is the format you need to use for the response!

{
  "events": [
    {
      "title": "Event title",
      "description": "Event description",
      "startTime": "[EVENT START TIME] in ISO format",
      "type": "Meeting type from classification",
      "priority": "Priority level (Critical/High/Medium/Low)",
      "preparation": boolean,
      "key_stakeholders": ["stakeholder1", "stakeholder2", "stakeholder3"],
      "meeting_preparation_prompt": "Help me prepare for this event scheduled for [TIME], with the given format. PURPOSE: [Meeting purpose and objectives]. STAKEHOLDERS: [Detailed stakeholder analysis including roles, influence levels, and communication preferences]. PREPARATION NEEDED: [Specific preparation checklist including materials to gather, research topics, and background information]. EXPECTED OUTCOMES: [Primary and secondary outcomes, success metrics, and likely decision points]. CONTEXT: [Strategic alignment, historical background, and relevant previous interactions]. POTENTIAL CHALLENGES: [Risk factors, sensitive topics, and mitigation strategies]. KEY TALKING POINTS: [Suggested discussion topics and questions]. ACTION ITEMS LIKELY: [Anticipated follow-up actions and next steps]. SUCCESS INDICATORS: [How to measure meeting effectiveness]."
    }
  ]
}

## Meeting Preparation Prompt Guidelines

The `meeting_preparation_prompt` should be a comprehensive, actionable prompt that enables another AI to:

1. Generate specific preparation materials
2. Create relevant talking points and questions
3. Identify potential challenges and solutions
4. Suggest optimal communication approaches
5. Provide contextual background for informed participation
6. Anticipate outcomes and follow-up actions

Ensure the prompt is to the point and brief and easily understandable by AI agent. 