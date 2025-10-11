# Telegram Bot Integration with FastAPI

## Overview

The Telegram bot has been successfully integrated with the existing FastAPI server. The bot collects comprehensive student data and generates personalized UPSC study plans using the Helios engine.

## Architecture

```
Telegram User → Telegram Bot Service → FastAPI Server → Helios Engine (HTTP) → Database
                                   ↓
                            HTML Plan Generation → File Storage
```

## Integration Components

### 1. FastAPI Integration (`/src/modules/telegram/`)

- **`routes.py`** - FastAPI endpoints for webhook and bot management
- **`bot_service.py`** - Core Telegram bot service integrated with FastAPI
- **`config.py`** - Configuration management for bot settings
- **`__init__.py`** - Module initialization

### 2. Bot Logic (`/telegram_bot/`)

- **`bot.py`** - Standalone bot (can still be used independently)
- **`conversation_handlers.py`** - Data collection flow handlers
- **`confidence_handlers.py`** - Subject confidence assessment
- **`strategy_handlers.py`** - Study strategy collection and plan generation
- **`plan_presenter.py`** - HTML plan generation and formatting
- **`constants.py`** - State definitions and UI constants

## API Endpoints

### Bot Management
- `POST /v2/telegram/webhook` - Receive Telegram updates
- `POST /v2/telegram/set-webhook` - Configure webhook URL
- `DELETE /v2/telegram/webhook` - Remove webhook
- `GET /v2/telegram/status` - Bot status and health
- `GET /v2/telegram/stats` - Usage statistics

### Administration
- `POST /v2/telegram/broadcast` - Send messages to users

## Data Collection Flow

The bot collects data in 8 comprehensive sections:

1. **Personal & Academic Details** (8 fields)
   - Name, email, phone, location, status, graduation details

2. **Preparation Background** (8 fields)
   - Duration, target year, attempts, scores, mains experience

3. **Coaching & Mentorship** (5 fields)
   - Prior coaching, institutes, mentorship history

4. **Optional Subject Details** (3 fields)
   - Subject choice, status, learning method

5. **Test Experience** (3 fields)
   - Test series, CSAT assessment, weak areas

6. **Syllabus Awareness** (3 fields)
   - GS understanding, optional syllabus, PYQ usage

7. **Subject Confidence** (27 subjects)
   - Prelims: 8 subjects
   - Mains GS1: 7 subjects
   - Mains GS2: 5 subjects
   - Mains GS3: 6 subjects
   - Mains GS4 + Optional: 3 subjects

8. **Study Strategy** (8 preferences)
   - Focus areas, hours, distribution, approach, revision, testing

## Helios Integration

The bot integrates with the existing Helios engine via HTTP:

- **Endpoint**: `POST http://localhost:8080/plan/generate`
- **Input**: UIWizardData JSON structure (matches Haskell format)
- **Output**: StudyPlan JSON with blocks, schedules, and tasks
- **Timeout**: 30 seconds with error handling

## Plan Presentation

Generated plans are presented as:

1. **Immediate Summary** - Brief overview sent via Telegram
2. **Comprehensive HTML** - Full interactive webpage with:
   - Visual timeline
   - Detailed weekly schedules
   - Subject analysis
   - Progress tracking
   - Responsive design

## Environment Variables

```bash
# Required
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Optional
TELEGRAM_WEBHOOK_URL=https://your-domain.com/v2/telegram/webhook
HELIOS_API_URL=http://localhost:8080
PLAN_STORAGE_PATH=/path/to/store/plans
MAX_CONCURRENT_CONVERSATIONS=100
```

## Deployment Options

### 1. Webhook Mode (Production)
```bash
# Set webhook URL
curl -X POST "http://localhost:8000/v2/telegram/set-webhook" \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "https://your-domain.com/v2/telegram/webhook"}'
```

### 2. Polling Mode (Development)
The standalone bot (`telegram_bot/bot.py`) can still be used for development:
```bash
cd telegram_bot
python bot.py
```

## Usage Flow

1. User starts conversation with `/start`
2. Bot collects data through interactive conversation (10-15 minutes)
3. Data is formatted into Helios UIWizardData structure
4. HTTP request sent to Helios engine on port 8080
5. Generated plan converted to HTML presentation
6. User receives summary + link to full plan

## Error Handling

- Network timeouts for Helios API calls
- Invalid user input validation
- Graceful conversation cancellation
- HTML generation error recovery
- Bot service availability checks

## Monitoring

The integration provides:
- Real-time bot status via `/v2/telegram/status`
- Usage statistics via `/v2/telegram/stats`
- Conversation tracking and user counts
- Plan generation success rates

## Security

- Bot token stored securely in environment variables
- Input validation for all user data
- Rate limiting through Telegram's built-in mechanisms
- Secure file storage for generated plans

## Testing

1. **Unit Testing**: Test individual handlers and data formatting
2. **Integration Testing**: Test Helios API communication
3. **End-to-End Testing**: Complete conversation flow
4. **Load Testing**: Multiple concurrent conversations

## Maintenance

- Monitor bot uptime and response times
- Track conversation completion rates
- Update conversation flow based on user feedback
- Maintain Helios API compatibility
- Regular cleanup of generated plan files

The integration is now complete and ready for production deployment!
