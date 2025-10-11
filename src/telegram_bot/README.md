# Helios Telegram Bot

A comprehensive Telegram bot that collects student data and generates personalized UPSC study plans using the Helios AI engine.

## Features

- **Interactive Data Collection**: Step-by-step conversation to gather comprehensive student information
- **Comprehensive Assessment**: Collects 8 major categories of data:
  - Personal & Academic Details
  - Preparation Background
  - Coaching & Mentorship History
  - Optional Subject Details
  - Test Experience
  - Syllabus Awareness
  - Subject Confidence (27 subjects)
  - Study Strategy Preferences

- **AI-Powered Plan Generation**: Integrates with Helios engine via HTTP API
- **Beautiful Plan Presentation**: Generates responsive HTML pages with:
  - Visual timeline
  - Detailed weekly schedules
  - Subject analysis
  - Progress tracking

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
   Create a `.env` file with:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   HELIOS_API_URL=http://localhost:8080
   ```

3. **Create Telegram Bot**:
   - Message @BotFather on Telegram
   - Use `/newbot` command
   - Get your bot token

4. **Start Helios Service**:
   Ensure the Helios engine is running on port 8080 (or update HELIOS_API_URL)

## Usage

1. **Start the Bot**:
   ```bash
   python bot.py
   ```

2. **Bot Commands**:
   - `/start` - Begin creating a new study plan
   - `/newplan` - Create another study plan
   - `/help` - Show help message
   - `/cancel` - Cancel current conversation

## Architecture

```
User → Telegram Bot → Data Collection → Helios API → Plan Generation → HTML Presentation
```

### Data Flow

1. **Collection Phase** (10-15 minutes):
   - Personal details (name, email, location, etc.)
   - Academic background and UPSC preparation history
   - Coaching experience and mentorship
   - Optional subject selection and status
   - Test series experience and CSAT assessment
   - Syllabus understanding levels
   - Subject-wise confidence rating (27 subjects)
   - Study strategy preferences

2. **Processing Phase**:
   - Format data into Helios UIWizardData structure
   - Send HTTP POST request to `/plan/generate` endpoint
   - Receive structured StudyPlan response

3. **Presentation Phase**:
   - Generate comprehensive HTML webpage
   - Create visual timeline and weekly schedules
   - Provide downloadable plan link

## File Structure

```
telegram_bot/
├── bot.py                    # Main bot application
├── constants.py              # State definitions and constants
├── conversation_handlers.py  # Data collection handlers
├── confidence_handlers.py    # Subject confidence assessment
├── strategy_handlers.py      # Study strategy collection
├── plan_presenter.py         # HTML generation and formatting
├── requirements.txt          # Python dependencies
├── README.md                # This file
└── generated_plans/         # Output directory for HTML plans
```

## API Integration

The bot integrates with the Helios engine using the following endpoint:

- **POST** `/plan/generate`
  - **Input**: UIWizardData JSON structure
  - **Output**: StudyPlan JSON with blocks, weekly schedules, and tasks

## Customization

### Adding New Questions
1. Add new state constant in `constants.py`
2. Create handler method in appropriate handler class
3. Update conversation states in `main()` function

### Modifying Plan Presentation
- Edit `plan_presenter.py` to customize HTML template
- Modify CSS styles for different visual themes
- Add new analysis sections or charts

### Extending Data Collection
- Update `format_data_for_helios()` in `bot.py`
- Ensure new fields match Haskell UIWizardData structure
- Add validation and error handling

## Error Handling

- Network timeouts for Helios API calls
- Invalid user input validation
- Graceful conversation cancellation
- HTML generation error recovery

## Production Deployment

1. **Environment Setup**:
   - Use production Telegram bot token
   - Configure production Helios API URL
   - Set up proper logging

2. **Web Hosting**:
   - Deploy HTML files to web server
   - Update `create_plan_webpage()` to return public URLs
   - Configure HTTPS for secure access

3. **Monitoring**:
   - Add application logging
   - Monitor API response times
   - Track user completion rates

## Security Considerations

- Store bot token securely
- Validate all user inputs
- Implement rate limiting
- Secure HTML file storage
- HTTPS for plan links

## Support

For issues or questions:
1. Check Helios engine connectivity
2. Verify bot token and permissions
3. Review logs for error details
4. Test with `/help` command
