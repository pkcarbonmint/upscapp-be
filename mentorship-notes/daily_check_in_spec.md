### Sample Daily Check-in Conversation

This conversation takes place on a platform like Telegram, where the system is a bot designed to assist the student. The student's plan includes specific task IDs (e.g., `MH-12` for Modern History Task 12).

> **System:**
> Hi Priya! 👋 Hope you had a productive day. Ready for your daily check-in? Just tell me what you worked on today.

> **Student:**
> Hi! Yep, it was pretty good. I spent about 4 hours on Modern History, finally finished the chapter on the 1857 revolt. I also did the weekly revision for an hour.

> **System:**
> That's great progress! The chapter on the 1857 revolt corresponds to **Task MH-12** in your plan. Can I mark that as complete for you?

> **Student:**
> Yes, please do.

> **System:**
> Excellent, Task MH-12 is now marked as complete. ✅
>
> I've logged:
> *   **4 hours** of Study
> *   **1 hour** of Revision
>
> Did you do any practice questions or take any tests today?

> **Student:**
> Not today, I'll do practice questions tomorrow.

> **System:**
> Sounds like a plan. Thanks for the update! Keep up the great work, and I'll check in with you again tomorrow. 👍

---

### JSON Schema for Daily Check-in Data

This schema defines the structure of the data record that the system would create in the database based on the conversation above.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Daily Check-in Record",
  "description": "Defines the structure for storing the data extracted from a student's daily check-in.",
  "type": "object",
  "properties": {
    "checkInId": {
      "type": "string",
      "format": "uuid",
      "description": "The unique identifier for this check-in record."
    },
    "studentId": {
      "type": "string",
      "description": "The unique identifier for the student."
    },
    "checkInTimestamp": {
      "type": "string",
      "format": "date-time",
      "description": "The ISO 8601 timestamp of when the check-in was completed."
    },
    "effort": {
      "type": "object",
      "description": "Metrics related to the time spent by the student.",
      "properties": {
        "studyHours": {
          "type": "number",
          "minimum": 0,
          "description": "Hours spent on new topic study."
        },
        "revisionHours": {
          "type": "number",
          "minimum": 0,
          "description": "Hours spent on revision."
        },
        "practiceHours": {
          "type": "number",
          "minimum": 0,
          "description": "Hours spent on practicing questions."
        }
      },
      "required": ["studyHours", "revisionHours", "practiceHours"]
    },
    "progress": {
      "type": "object",
      "description": "Metrics related to task completion.",
      "properties": {
        "tasksCompleted": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "An array of specific Task IDs that the student completed."
        },
        "blockers": {
          "type": "string",
          "description": "An optional field where the student can describe any issues or blockers they faced."
        }
      },
      "required": ["tasksCompleted"]
    },
    "source": {
      "type": "string",
      "enum": ["TelegramBot", "WebApp", "ManualEntry"],
      "description": "The source of the check-in data."
    },
    "rawConversation": {
      "type": "string",
      "description": "A transcript of the raw conversation for logging and future analysis."
    }
  },
  "required": ["checkInId", "studentId", "checkInTimestamp", "effort", "progress", "source"]
}
```
