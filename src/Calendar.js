const Calendar = (function ({ defaultCalendarId }) {

  const logger = Telemetry.getLogger('Calendar');

  function getEventsForDate(calendarId = defaultCalendarId, date = new Date(), maxResults = 20) {
    logger.info(`Getting calendarItems for ${calendarId}`);
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
        // Get guest list
        const guests = event.getGuestList(true).map(guest => guest.getEmail());

        const eventResult = {
          title: event.getTitle(),
          description: event.getDescription(),
          startTime: event.getStartTime().toISOString(),
          endTime: event.getEndTime().toISOString(),
          attendees: guests,
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
            logger.error(`Error during retrieval event recurrence for ${event.getTitle()}`)
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
   * Parse time string in HH:MM format to hour and minute components
   * @param {string} timeStr - Time in "HH:MM" format (e.g., "09:00", "13:30")
   * @return {{hour: number, minute: number}|null} - Parsed time components or null if invalid
   */
  function parseTimeString(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
      return null;
    }

    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return null;
    }

    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    return { hour, minute };
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
      rangeStart.setHours(0, 0, 0, 0);

      let rangeEnd = new Date(deadline);

      if (rangeEnd <= rangeStart) {
        // If the deadline is before the work start time, we can't schedule it today in work hours.
        return null;
      }

      // Filter events that might overlap or impact the range [rangeStart, rangeEnd]
      // and parse their times. Sort in REVERSE order (latest first) to work backwards.
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
        .sort((a, b) => b.start - a.start); // REVERSE sort - latest first

      // Work backwards from deadline to find slot closest to meeting
      let currentPointer = rangeEnd;

      for (const event of relevantEvents) {
        // Ensure event.end doesn't go past our current position
        const effectiveEventEnd = event.end > currentPointer ? currentPointer : event.end;

        // Calculate gap between event end and current pointer
        if (effectiveEventEnd < currentPointer) {
          const gapMilliseconds = currentPointer.getTime() - effectiveEventEnd.getTime();
          const gapMinutes = gapMilliseconds / (1000 * 60);

          if (gapMinutes >= durationMinutes) {
            // Found a valid slot! Schedule it to END at currentPointer
            return new Date(currentPointer.getTime() - durationMinutes * 60 * 1000);
          }
        }

        // Move pointer back to the start of this event
        if (event.start < currentPointer) {
          currentPointer = event.start;
        }
      }

      // Check for a final gap between rangeStart and currentPointer
      if (currentPointer > rangeStart) {
        const finalGapMilliseconds = currentPointer.getTime() - rangeStart.getTime();
        const finalGapMinutes = finalGapMilliseconds / (1000 * 60);

        if (finalGapMinutes >= durationMinutes) {
          // Schedule to END at currentPointer (latest possible in this gap)
          return new Date(currentPointer.getTime() - durationMinutes * 60 * 1000);
        }
      }

      return null;

    } catch (err) {
      logger.error(`Error in findOpenSlot: ${err}`);
      return null;
    }
  }

  return {
    getEventsForDate,
    findOpenSlot,
    parseTimeString
  }
})
