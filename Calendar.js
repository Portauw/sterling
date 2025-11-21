const Calendar = (function ({ defaultCalendarId, workDayStartHour = 8, workDayEndHour = 18 }) {
  function log(message) {
    console.log(`Calendar: ${message ? JSON.stringify(message, null, 2) : 'null'}`);
  }

  /**
   * Get function schemas for Gemini API function calling
   */
  function getToolConfigs() {
    return [
      {
        name: "getEvents",
        description: "Get calendar events within a date range",
        parameters: {
          type: "object",
          properties: {
            calendarId: {
              type: "string",
              description: "Calendar ID (use 'primary' for main calendar)"
            },
            startDate: {
              type: "string",
              description: "Start date in YYYY-MM-DD format"
            },
            endDate: {
              type: "string",
              description: "End date in YYYY-MM-DD format"
            },
            maxResults: {
              type: "number",
              description: "Maximum number of events to return (default: 10)"
            }
          },
          required: ["startDate", "endDate"]
        }
      },
      {
        name: "getCalendars",
        description: "Get list of available calendars",
        parameters: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "createEvent",
        description: "Create a new calendar event",
        parameters: {
          type: "object",
          properties: {
            calendarId: {
              type: "string",
              description: "Calendar ID (use 'primary' for main calendar)"
            },
            title: {
              type: "string",
              description: "Event title"
            },
            startDateTime: {
              type: "string",
              description: "Start date and time (ISO format or natural language)"
            },
            endDateTime: {
              type: "string",
              description: "End date and time (ISO format or natural language)"
            },
            description: {
              type: "string",
              description: "Event description"
            },
            location: {
              type: "string",
              description: "Event location"
            },
            attendees: {
              type: "array",
              items: { type: "string" },
              description: "Array of attendee email addresses"
            }
          },
          required: ["title", "startDateTime", "endDateTime"]
        }
      },
      {
        name: "updateEvent",
        description: "Update an existing calendar event",
        parameters: {
          type: "object",
          properties: {
            calendarId: {
              type: "string",
              description: "Calendar ID (use 'primary' for main calendar)"
            },
            eventId: {
              type: "string",
              description: "Event ID to update"
            },
            updates: {
              type: "object",
              description: "Object containing fields to update (title, startDateTime, endDateTime, description, location, attendees)"
            }
          },
          required: ["eventId", "updates"]
        }
      },
      {
        name: "deleteEvent",
        description: "Delete a calendar event",
        parameters: {
          type: "object",
          properties: {
            calendarId: {
              type: "string",
              description: "Calendar ID (use 'primary' for main calendar)"
            },
            eventId: {
              type: "string",
              description: "Event ID to delete"
            }
          },
          required: ["eventId"]
        }
      },
      {
        name: "findEvents",
        description: "Search for events by text query",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query text"
            },
            calendarId: {
              type: "string",
              description: "Calendar ID to search in (use 'primary' for main calendar)"
            },
            maxResults: {
              type: "number",
              description: "Maximum number of events to return (default: 10)"
            }
          },
          required: ["query"]
        }
      }
    ];
  }


  function getEventsForDate(calendarId = defaultCalendarId, date = new Date(), maxResults = 20) {
    log(`Getting calendarItems for ${calendarId}`);
    try {
      const calendar = CalendarApp.getCalendarById(calendarId);
      
      if (!calendar) {
        return { success: false, error: `Calendar not found: ${calendarId}` };
      }
      
      const events = calendar.getEventsForDay(date,
        {
          statusFilters: [
            CalendarApp.GuestStatus.INVITED,
            CalendarApp.GuestStatus.MAYBE,
            CalendarApp.GuestStatus.YES,
            CalendarApp.GuestStatus.OWNER
          ]
        });
        
      const limitedEvents = events.slice(0, maxResults);

      const formattedEvents = limitedEvents.map(event => {
        const eventResult = {
          title: event.getTitle(),
          description: event.getDescription(),
          startTime: event.getStartTime().toISOString(),
          endTime: event.getEndTime().toISOString(),
          attendees: event.getGuestList().map(guest => guest.getEmail()),
          isAllDay: event.isAllDayEvent()
        }

        // Only include location if it's not empty
        const location = event.getLocation();
        if (location && location.trim() !== '') {
          eventResult.location = location;
        }

        // Keep recurring event metadata
        if (event.isRecurringEvent()) {
          try {
            const fullEvent = FullCalendar.Events.get(calendarId, event.getId().split('@')[0]);
            eventResult.recurrence = fullEvent.recurrence[0];
          } catch (err){
            log(`Error during retrieval event recurrence for ${event.getTitle()}`)
          }
        }
        return eventResult;
      });

      return {
        success: true,
        events: formattedEvents,
        count: formattedEvents.length
      };

    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Get list of available calendars
   */
  function getCalendars() {
    try {
      const calendars = CalendarApp.getAllCalendars();

      const formattedCalendars = calendars.map(calendar => ({
        id: calendar.getId(),
        name: calendar.getName(),
        description: calendar.getDescription(),
        isOwnedByMe: calendar.isOwnedByMe(),
        color: calendar.getColor()
      }));

      return {
        success: true,
        calendars: formattedCalendars,
        count: formattedCalendars.length
      };

    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Create a new calendar event
   */
  function createEvent(calendarId = defaultCalendarId, title, startDateTime, endDateTime, description = '', location = '', attendees = []) {
    try {
      const calendar = CalendarApp.getCalendarById(calendarId);
      if (!calendar) {
        return { success: false, error: `Calendar not found: ${calendarId}` };
      }

      const startTime = _parseDateTime(startDateTime);
      const endTime = _parseDateTime(endDateTime);

      if (!startTime || !endTime) {
        return { success: false, error: 'Invalid date/time format' };
      }

      if (startTime >= endTime) {
        return { success: false, error: 'Start time must be before end time' };
      }

      const options = {};
      if (description) options.description = description;
      if (location) options.location = location;
      if (attendees && attendees.length > 0) options.guests = attendees.join(',');

      const event = calendar.createEvent(title, startTime, endTime, options);

      return {
        success: true,
        event: {
          id: event.getId(),
          title: event.getTitle(),
          startTime: event.getStartTime().toISOString(),
          endTime: event.getEndTime().toISOString(),
          description: event.getDescription(),
          location: event.getLocation()
        }
      };

    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Update an existing calendar event
   */
  function updateEvent(calendarId = defaultCalendarId, eventId, updates) {
    try {
      const calendar = CalendarApp.getCalendarById(calendarId);
      if (!calendar) {
        return { success: false, error: `Calendar not found: ${calendarId}` };
      }

      const event = calendar.getEventById(eventId);
      if (!event) {
        return { success: false, error: `Event not found: ${eventId}` };
      }

      // Update title
      if (updates.title) {
        event.setTitle(updates.title);
      }

      // Update description
      if (updates.description !== undefined) {
        event.setDescription(updates.description);
      }

      // Update location
      if (updates.location !== undefined) {
        event.setLocation(updates.location);
      }

      // Update times
      if (updates.startDateTime || updates.endDateTime) {
        const currentStart = event.getStartTime();
        const currentEnd = event.getEndTime();

        const newStart = updates.startDateTime ? _parseDateTime(updates.startDateTime) : currentStart;
        const newEnd = updates.endDateTime ? _parseDateTime(updates.endDateTime) : currentEnd;

        if (!newStart || !newEnd) {
          return { success: false, error: 'Invalid date/time format in updates' };
        }

        if (newStart >= newEnd) {
          return { success: false, error: 'Start time must be before end time' };
        }

        event.setTime(newStart, newEnd);
      }

      // Update attendees
      if (updates.attendees) {
        event.removeAllGuests();
        if (updates.attendees.length > 0) {
          updates.attendees.forEach(email => event.addGuest(email));
        }
      }

      return {
        success: true,
        event: {
          id: event.getId(),
          title: event.getTitle(),
          startTime: event.getStartTime().toISOString(),
          endTime: event.getEndTime().toISOString(),
          description: event.getDescription(),
          location: event.getLocation()
        }
      };

    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Delete a calendar event
   */
  function deleteEvent(calendarId = defaultCalendarId, eventId) {
    try {
      const calendar = CalendarApp.getCalendarById(calendarId);
      if (!calendar) {
        return { success: false, error: `Calendar not found: ${calendarId}` };
      }

      const event = calendar.getEventById(eventId);
      if (!event) {
        return { success: false, error: `Event not found: ${eventId}` };
      }

      const eventTitle = event.getTitle();
      event.deleteEvent();

      return {
        success: true,
        message: `Event "${eventTitle}" deleted successfully`
      };

    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Search for events by text query
   */
  function findEvents(query, calendarId = defaultCalendarId, maxResults = 20) {
    try {
      const calendar = CalendarApp.getCalendarById(calendarId);
      if (!calendar) {
        return { success: false, error: `Calendar not found: ${calendarId}` };
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);

      const events = calendar.getEvents(startDate, endDate);

      const matchingEvents = events.filter(event => {
        const title = event.getTitle().toLowerCase();
        const description = event.getDescription().toLowerCase();
        const location = event.getLocation().toLowerCase();
        const searchQuery = query.toLowerCase();

        return title.includes(searchQuery) ||
          description.includes(searchQuery) ||
          location.includes(searchQuery);
      }).slice(0, maxResults);

      const formattedEvents = matchingEvents.map(event => ({
        id: event.getId(),
        title: event.getTitle(),
        description: event.getDescription(),
        location: event.getLocation(),
        startTime: event.getStartTime().toISOString(),
        endTime: event.getEndTime().toISOString(),
        attendees: event.getGuestList().map(guest => guest.getEmail()),
        isAllDay: event.isAllDayEvent()
      }));

      return {
        success: true,
        events: formattedEvents,
        count: formattedEvents.length,
        query: query
      };

    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Parse date string to Date object
   */
  function _parseDate(dateString) {
    try {
      // Handle YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const date = new Date(dateString + 'T00:00:00');
        return isNaN(date.getTime()) ? null : date;
      }

      // Try parsing as natural language
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse date/time string to Date object
   */
  function _parseDateTime(dateTimeString) {
    try {
      // Handle ISO format
      if (dateTimeString.includes('T') || dateTimeString.includes('Z')) {
        const date = new Date(dateTimeString);
        return isNaN(date.getTime()) ? null : date;
      }

      // Try parsing as natural language
      const date = new Date(dateTimeString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find the first available time slot of a given duration before a specific deadline
   * @param {Array} events - List of existing events for the day
   * @param {Date} deadline - The time by which the task must be completed (e.g., the meeting start time)
   * @param {number} durationMinutes - Required duration in minutes
   * @return {Date|null} - Start time of the found slot, or null if none found
   */
  function findOpenSlot(events, deadline, durationMinutes = 45) {
    try {
      if (!deadline) {
        return null;
      }

      let rangeStart = new Date(deadline);
      rangeStart.setHours(workDayStartHour, 0, 0, 0);

      let rangeEnd = new Date(deadline);

      if (rangeEnd <= rangeStart) {
        // If the deadline is before the work start time, we can't schedule it today in work hours.
        return null;
      }

      // Filter events that might overlap or impact the range [rangeStart, rangeEnd]
      // and parse their times.
      const relevantEvents = events
        .map(e => ({
          title: e.title,
          start: new Date(e.startTime),
          end: new Date(e.endTime)
        }))
        .filter(e => {
          // We are interested in events that end after our range starts
          // and start before our range ends.
          return e.start < rangeEnd && e.end > rangeStart;
        })
        .sort((a, b) => a.start - b.start);
      
      let currentPointer = rangeStart;

      for (const event of relevantEvents) {
        
        // If the current pointer is already past the deadline, we can stop (shouldn't happen if logic is correct)
        if (currentPointer >= rangeEnd) {
          break;
        }

        // Calculate gap between current pointer and event start
        // Ensure we don't look at gaps before currentPointer (event.start could be before rangeStart if it overlaps)
        const effectiveEventStart = event.start < currentPointer ? currentPointer : event.start;
        
        if (effectiveEventStart > currentPointer) {
            const gapMilliseconds = effectiveEventStart.getTime() - currentPointer.getTime();
            const gapMinutes = gapMilliseconds / (1000 * 60);
            
            if (gapMinutes >= durationMinutes) {
                return currentPointer;
            }
        }

        // Move pointer to the end of this event, but only if it pushes us forward
        if (event.end > currentPointer) {
          currentPointer = event.end;
        }
      }

      // Check for a final gap between the last event (or start of day) and the deadline
      if (currentPointer < rangeEnd) {
        const finalGapMilliseconds = rangeEnd.getTime() - currentPointer.getTime();
        const finalGapMinutes = finalGapMilliseconds / (1000 * 60);
        
        if (finalGapMinutes >= durationMinutes) {
          return currentPointer;
        }
      }
      
      return null;

    } catch (err) {
      log(`Error in findOpenSlot: ${err}`);
      return null;
    }
  }

  return {
    getToolConfigs,
    //getCalendars,
    getEventsForDate,
    findOpenSlot
    //createEvent,
    //updateEvent,
    //deleteEvent,
    //findEvents
  }
})