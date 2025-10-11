"""
Telegram Bot routes for FastAPI integration.
"""

import os
import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from telegram import Update
from telegram.ext import Application

from .bot_service import TelegramBotService

logger = logging.getLogger(__name__)

# Router setup
telegram_router = APIRouter(prefix="/telegram", tags=["telegram"])

# Bot service instance
bot_service = None

class WebhookUpdate(BaseModel):
    """Pydantic model for Telegram webhook updates."""
    update_id: int
    message: Dict[str, Any] = None
    callback_query: Dict[str, Any] = None
    inline_query: Dict[str, Any] = None

@telegram_router.on_event("startup")
async def startup_telegram_bot():
    """Initialize Telegram bot on FastAPI startup."""
    global bot_service
    try:
        bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        if not bot_token:
            logger.warning("TELEGRAM_BOT_TOKEN not set - Telegram bot disabled")
            return
        
        bot_service = TelegramBotService(bot_token)
        await bot_service.initialize()
        logger.info("Telegram bot service initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize Telegram bot: {e}")

@telegram_router.on_event("shutdown")
async def shutdown_telegram_bot():
    """Cleanup Telegram bot on FastAPI shutdown."""
    global bot_service
    if bot_service:
        await bot_service.shutdown()
        logger.info("Telegram bot service shut down")

@telegram_router.post("/webhook")
async def telegram_webhook(update_data: WebhookUpdate, background_tasks: BackgroundTasks):
    """
    Handle incoming Telegram webhook updates.
    
    This endpoint receives updates from Telegram and processes them asynchronously.
    """
    if not bot_service:
        raise HTTPException(status_code=503, detail="Telegram bot service not available")
    
    try:
        # Convert Pydantic model to dict for Telegram Update
        update_dict = update_data.dict()
        
        # Process update in background to avoid blocking
        background_tasks.add_task(bot_service.process_update, update_dict)
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Error processing webhook update: {e}")
        raise HTTPException(status_code=500, detail="Failed to process update")

@telegram_router.post("/set-webhook")
async def set_webhook(webhook_url: str):
    """
    Set the webhook URL for the Telegram bot.
    
    Args:
        webhook_url: The HTTPS URL where Telegram should send updates
    """
    if not bot_service:
        raise HTTPException(status_code=503, detail="Telegram bot service not available")
    
    try:
        success = await bot_service.set_webhook(webhook_url)
        if success:
            return {"status": "success", "message": f"Webhook set to {webhook_url}"}
        else:
            raise HTTPException(status_code=400, detail="Failed to set webhook")
            
    except Exception as e:
        logger.error(f"Error setting webhook: {e}")
        raise HTTPException(status_code=500, detail="Failed to set webhook")

@telegram_router.delete("/webhook")
async def delete_webhook():
    """Remove the webhook and switch to polling mode."""
    if not bot_service:
        raise HTTPException(status_code=503, detail="Telegram bot service not available")
    
    try:
        success = await bot_service.delete_webhook()
        if success:
            return {"status": "success", "message": "Webhook deleted"}
        else:
            raise HTTPException(status_code=400, detail="Failed to delete webhook")
            
    except Exception as e:
        logger.error(f"Error deleting webhook: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete webhook")

@telegram_router.get("/status")
async def bot_status():
    """Get the current status of the Telegram bot."""
    if not bot_service:
        return {"status": "disabled", "message": "Telegram bot service not initialized"}
    
    try:
        status = await bot_service.get_status()
        return status
        
    except Exception as e:
        logger.error(f"Error getting bot status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get bot status")

@telegram_router.get("/stats")
async def bot_stats():
    """Get usage statistics for the Telegram bot."""
    if not bot_service:
        raise HTTPException(status_code=503, detail="Telegram bot service not available")
    
    try:
        stats = await bot_service.get_stats()
        return stats
        
    except Exception as e:
        logger.error(f"Error getting bot stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get bot stats")

@telegram_router.post("/broadcast")
async def broadcast_message(message: str, user_ids: list[int] = None):
    """
    Broadcast a message to all users or specific user IDs.
    
    Args:
        message: The message to broadcast
        user_ids: Optional list of specific user IDs to send to
    """
    if not bot_service:
        raise HTTPException(status_code=503, detail="Telegram bot service not available")
    
    try:
        result = await bot_service.broadcast_message(message, user_ids)
        return {"status": "success", "sent_count": result}
        
    except Exception as e:
        logger.error(f"Error broadcasting message: {e}")
        raise HTTPException(status_code=500, detail="Failed to broadcast message")
