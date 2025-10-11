"""
Configuration for Telegram bot integration.
"""

import os
from typing import Optional

class TelegramConfig:
    """Configuration class for Telegram bot settings."""
    
    def __init__(self):
        self.bot_token: Optional[str] = os.getenv('TELEGRAM_BOT_TOKEN')
        self.webhook_url: Optional[str] = os.getenv('TELEGRAM_WEBHOOK_URL')
        self.helios_api_url: str = os.getenv('HELIOS_API_URL', 'http://localhost:8080')
        self.plan_storage_path: str = os.getenv('PLAN_STORAGE_PATH', '/tmp/telegram_plans')
        self.max_concurrent_conversations: int = int(os.getenv('MAX_CONCURRENT_CONVERSATIONS', '100'))
        
    @property
    def is_enabled(self) -> bool:
        """Check if Telegram bot is properly configured."""
        return self.bot_token is not None
        
    def validate(self) -> bool:
        """Validate configuration."""
        if not self.bot_token:
            return False
        if len(self.bot_token) < 10:
            return False
        return True

# Global config instance
telegram_config = TelegramConfig()
