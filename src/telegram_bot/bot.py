#!/usr/bin/env python3
"""
Telegram Bot for Helios Study Plan Generation

This bot is now a thin wrapper that delegates all conversation logic to the Haskell engine.
"""

import os
import json
import logging
import aiohttp
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove

from plan_presenter import PlanPresenter

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Configuration
HELIOS_API_URL = os.getenv('HELIOS_API_URL', 'http://localhost:8080')
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

class HeliosBot:
    def __init__(self, helios_url: str = "http://localhost:8080"):
        self.helios_url = helios_url
        self.session_cache: Dict[str, Dict] = {}  # In-memory session storage
        self.plan_presenter = PlanPresenter()
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Handle /start command by initiating conversation with Haskell."""
        user_id = str(update.effective_user.id)
        
        # Clear any existing session
        self.session_cache.pop(user_id, None)
        
        # Send initial message to Haskell
        response = await self.call_haskell_conversation(user_id, "/start", None)
        await self.send_response(update, response)
        
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Handle all text messages by forwarding to Haskell conversation handler."""
        user_id = str(update.effective_user.id)
        message_text = update.message.text
        
        # Get existing session from cache
        session_data = self.session_cache.get(user_id)
        
        # Call Haskell for conversation logic
        response = await self.call_haskell_conversation(user_id, message_text, session_data)
        
        # Update local session cache
        if 'sessionState' in response:
            self.session_cache[user_id] = response['sessionState']
        
        # Send response to user
        await self.send_response(update, response)
        
        # Handle next actions
        next_action = response.get('nextAction')
        if next_action == 'GeneratePlan':
            await self.generate_and_send_plan(update, response.get('collectedData'), response.get('studyPlanData'))
        elif next_action == 'EndConversation':
            await self.end_conversation(update)

    async def call_haskell_conversation(self, user_id: str, message: str, session_data: Optional[Dict]) -> Dict[str, Any]:
        """Call Haskell conversation endpoint."""
        payload = {
            "userId": user_id,
            "message": message,
            "messageType": "TextMessage",
            "sessionData": session_data
        }
        
        logger.debug(f"🚀 SENDING TO HELIOS: {json.dumps(payload, indent=2)}")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.helios_url}/bot/conversation",
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                ) as resp:
                    if resp.status == 200:
                        response_data = await resp.json()
                        logger.debug(f"✅ RECEIVED FROM HELIOS: {json.dumps(response_data, indent=2)}")
                        return response_data
                    else:
                        error_text = await resp.text()
                        logger.error(f"❌ Haskell API error: {resp.status} - {error_text}")
                        return self.error_response("Sorry, I'm having technical difficulties. Please try again.")
        except Exception as e:
            logger.error(f"❌ Error calling Haskell API: {e}")
            return self.error_response("Sorry, I'm having technical difficulties. Please try again.")
    
    async def send_response(self, update: Update, response: Dict[str, Any]) -> None:
        """Send response from Haskell to user."""
        text = response.get('responseText', 'Sorry, something went wrong.')
        keyboard_data = response.get('keyboard')
        
        reply_markup = None
        if keyboard_data and keyboard_data.get('options'):
            keyboard = keyboard_data['options']
            reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)
        
        await update.message.reply_text(text, reply_markup=reply_markup)
    
    async def generate_and_send_plan(self, update: Update, collected_data: Optional[Dict], study_plan_data: Optional[Dict]) -> None:
        """Generate and send study plan PDF."""
        if not study_plan_data:
            await update.message.reply_text("❌ Sorry, I couldn't generate your study plan. Please try again.")
            return
        
        try:
            # Generate PDF using plan presenter
            pdf_path = await self.plan_presenter.generate_plan_pdf(study_plan_data, collected_data)
            
            # Send PDF to user
            with open(pdf_path, 'rb') as pdf_file:
                await update.message.reply_document(
                    document=pdf_file,
                    filename="helios_study_plan.pdf",
                    caption="🎉 Here's your personalized UPSC study plan! Good luck with your preparation!"
                )
            
            # Clean up temporary file
            os.remove(pdf_path)
            
        except Exception as e:
            logger.error(f"Error generating PDF: {e}")
            await update.message.reply_text("❌ Sorry, I couldn't generate your PDF. Please contact support.")
    
    async def end_conversation(self, update: Update) -> None:
        """End the conversation."""
        await update.message.reply_text(
            "✅ Thank you for using Helios! Your study plan has been generated.\n\n"
            "Good luck with your UPSC preparation! 🎯"
        )
    
    def error_response(self, message: str) -> Dict[str, Any]:
        """Create error response."""
        return {
            'responseText': message,
            'keyboard': None,
            'nextAction': 'Continue'
        }


def main():
    """Main function to run the bot."""
    if not BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN environment variable not set")
        return
    
    # Create bot instance
    bot = HeliosBot(HELIOS_API_URL)
    
    # Create application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", bot.start_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, bot.handle_message))
    
    # Start the bot
    logger.info("🚀 Starting Helios Telegram Bot (Haskell-powered)")
    application.run_polling()


if __name__ == '__main__':
    main()
