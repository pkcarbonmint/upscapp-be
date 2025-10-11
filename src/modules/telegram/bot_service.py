"""
Telegram Bot Service for Helios Study Plan Generation

This service is now a thin wrapper that delegates all conversation logic to the Haskell engine.
"""

import asyncio
import aiohttp
import json
import logging
import os
from typing import Dict, Any, Optional, List
from datetime import datetime

from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)

class TelegramBotService:
    def __init__(self, bot_token: str, helios_url: str = "http://localhost:8080"):
        self.bot_token = bot_token
        self.helios_url = helios_url
        self.session_cache: Dict[str, Dict] = {}  # In-memory session storage
        
        # Stats tracking
        self.stats = {
            'total_users': 0,
            'active_conversations': 0,
            'completed_plans': 0,
            'start_time': datetime.now()
        }
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get bot statistics."""
        uptime = datetime.now() - self.stats['start_time']
        return {
            **self.stats,
            'uptime_hours': uptime.total_seconds() / 3600,
            'cached_sessions': len(self.session_cache)
        }
    
    async def broadcast_message(self, message: str, target_users: Optional[List[str]] = None) -> int:
        """Broadcast message to users."""
        if not target_users:
            target_users = list(self.session_cache.keys())
        
        sent_count = 0
        for user_id in target_users:
            try:
                # Would need bot instance to send messages
                # await self.bot.send_message(chat_id=user_id, text=message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id}: {e}")
        
        return sent_count

    # Haskell-powered conversation handlers
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Handle /start command by initiating conversation with Haskell."""
        user_id = str(update.effective_user.id)
        
        # Update stats
        if user_id not in self.session_cache:
            self.stats['total_users'] += 1
        self.stats['active_conversations'] += 1
        
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
            # Update stats
            self.stats['completed_plans'] += 1
            
            # For now, just send a success message
            await update.message.reply_text("🎉 Your study plan has been generated successfully!")
            
        except Exception as e:
            logger.error(f"Error generating PDF: {e}")
            await update.message.reply_text("❌ Sorry, I couldn't generate your PDF. Please contact support.")
    
    async def end_conversation(self, update: Update) -> None:
        """End the conversation."""
        user_id = str(update.effective_user.id)
        
        # Update stats
        self.stats['active_conversations'] = max(0, self.stats['active_conversations'] - 1)
        
        # Clear session
        self.session_cache.pop(user_id, None)
        
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
