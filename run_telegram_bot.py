#!/usr/bin/env python3
"""
Entry point script to run the Haskell-powered Telegram bot.
"""

import os
import sys
from dotenv import load_dotenv

# Add src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Load environment variables
load_dotenv('docker.env')

def main():
    """Main entry point for the Telegram bot."""
    # Import after setting up the path
    from telegram_bot.haskell_bot import HaskellTelegramBot
    
    # Get bot token from environment
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    if not token:
        print("❌ Error: TELEGRAM_BOT_TOKEN not found in environment variables")
        print("Please set your bot token in docker.env file or environment")
        print("Example: TELEGRAM_BOT_TOKEN=your_bot_token_here")
        return 1
    
    # Get Haskell server URL
    helios_url = os.getenv('HELIOS_URL', 'http://localhost:8080')
    
    print("🤖 Starting Haskell-powered UPSC Telegram Bot...")
    print(f"📡 Haskell server: {helios_url}")
    print(f"🔑 Bot token: {token[:10]}...")
    
    try:
        # Create and run the bot
        bot = HaskellTelegramBot(token, helios_url)
        bot.run()
    except KeyboardInterrupt:
        print("\n🛑 Bot stopped by user")
        return 0
    except Exception as e:
        print(f"❌ Error running bot: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
