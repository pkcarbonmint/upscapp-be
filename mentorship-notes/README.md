
# Mentorship Platform Backend Services

This project contains the backend services for a mentorship platform, including the Helios Engine for interacting with microservices and a Telegram bot for daily check-ins.

## Directory Structure

```
.
├── helios/         # Helios client for interacting with backend services
├── telegram_bot/   # Telegram bot for daily check-ins
├── tests/          # Unit tests
├── main.py         # Main entry point to run the Telegram bot
└── requirements.txt # Python dependencies
```

## Setup and Installation

1.  **Clone the repository** (or ensure you have all the project files).

2.  **Create and activate a virtual environment**:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install the dependencies**:

    ```bash
    pip install -r requirements.txt
    ```

## Configuration

To run the Telegram bot, you need to provide a bot token.

1.  Get a bot token from the [BotFather](https://t.me/botfather) on Telegram.

2.  Set the token as an environment variable:

    ```bash
    export TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
    ```

## Running the Application

### Telegram Bot

To run the Telegram bot, execute the following command from the project root:

```bash
python main.py
```

The bot will start polling for updates. You can interact with it on Telegram.

### Unit Tests

To run the unit tests for the Helios client, run:

```bash
python -m unittest tests.test_client
```

## Helios Engine

The `helios` directory contains the `HeliosClient`, a Python client for interacting with the backend microservices. You can import and use this client in other parts of your application as needed.
