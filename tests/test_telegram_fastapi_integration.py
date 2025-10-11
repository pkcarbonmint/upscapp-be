"""
Unit tests for Telegram bot FastAPI integration.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.modules.telegram.routes import telegram_router
from src.modules.telegram.bot_service import TelegramBotService
from src.modules.telegram.config import TelegramConfig


class TestTelegramRoutes:
    """Test cases for Telegram FastAPI routes."""
    
    @pytest.fixture
    def app(self):
        """Create FastAPI app with telegram router."""
        app = FastAPI()
        app.include_router(telegram_router, prefix="/v2")
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_bot_service(self):
        """Create mock bot service."""
        service = Mock(spec=TelegramBotService)
        service.is_running = True
        service.stats = {
            'total_users': 10,
            'active_conversations': 3,
            'plans_generated': 5,
            'uptime_seconds': 3600
        }
        service.process_update = AsyncMock()
        service.set_webhook = AsyncMock(return_value=True)
        service.delete_webhook = AsyncMock(return_value=True)
        service.broadcast_message = AsyncMock(return_value=8)
        return service
    
    def test_webhook_endpoint_post(self, client):
        """Test webhook POST endpoint."""
        with patch('src.modules.telegram.routes.bot_service') as mock_service:
            mock_service.process_update = AsyncMock()
            
            update_data = {
                "update_id": 123,
                "message": {
                    "message_id": 456,
                    "from": {"id": 789, "first_name": "Test"},
                    "chat": {"id": 789, "type": "private"},
                    "text": "Hello"
                }
            }
            
            response = client.post("/v2/telegram/webhook", json=update_data)
            
            assert response.status_code == 200
            assert response.json() == {"status": "ok"}
    
    def test_webhook_endpoint_invalid_data(self, client):
        """Test webhook with invalid data."""
        response = client.post("/v2/telegram/webhook", json={"invalid": "data"})
        
        assert response.status_code == 400
        assert "error" in response.json()
    
    def test_set_webhook_endpoint(self, client):
        """Test set webhook endpoint."""
        with patch('src.modules.telegram.routes.bot_service') as mock_service:
            mock_service.set_webhook = AsyncMock(return_value=True)
            
            webhook_data = {"webhook_url": "https://example.com/webhook"}
            response = client.post("/v2/telegram/set-webhook", json=webhook_data)
            
            assert response.status_code == 200
            assert response.json()["success"] is True
    
    def test_set_webhook_failure(self, client):
        """Test set webhook failure."""
        with patch('src.modules.telegram.routes.bot_service') as mock_service:
            mock_service.set_webhook = AsyncMock(return_value=False)
            
            webhook_data = {"webhook_url": "https://example.com/webhook"}
            response = client.post("/v2/telegram/set-webhook", json=webhook_data)
            
            assert response.status_code == 500
            assert response.json()["success"] is False
    
    def test_delete_webhook_endpoint(self, client):
        """Test delete webhook endpoint."""
        with patch('src.modules.telegram.routes.bot_service') as mock_service:
            mock_service.delete_webhook = AsyncMock(return_value=True)
            
            response = client.delete("/v2/telegram/webhook")
            
            assert response.status_code == 200
            assert response.json()["success"] is True
    
    def test_bot_status_endpoint(self, client):
        """Test bot status endpoint."""
        with patch('src.modules.telegram.routes.bot_service') as mock_service:
            mock_service.is_running = True
            mock_service.stats = {
                'total_users': 10,
                'active_conversations': 3,
                'plans_generated': 5,
                'uptime_seconds': 3600
            }
            
            response = client.get("/v2/telegram/status")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "running"
            assert data["stats"]["total_users"] == 10
            assert data["stats"]["active_conversations"] == 3
    
    def test_bot_status_not_running(self, client):
        """Test bot status when not running."""
        with patch('src.modules.telegram.routes.bot_service') as mock_service:
            mock_service.is_running = False
            
            response = client.get("/v2/telegram/status")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "stopped"
    
    def test_broadcast_endpoint(self, client):
        """Test broadcast message endpoint."""
        with patch('src.modules.telegram.routes.bot_service') as mock_service:
            mock_service.broadcast_message = AsyncMock(return_value=8)
            
            broadcast_data = {"message": "Test broadcast"}
            response = client.post("/v2/telegram/broadcast", json=broadcast_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["sent_count"] == 8
    
    def test_broadcast_empty_message(self, client):
        """Test broadcast with empty message."""
        broadcast_data = {"message": ""}
        response = client.post("/v2/telegram/broadcast", json=broadcast_data)
        
        assert response.status_code == 400
        assert "error" in response.json()


class TestTelegramBotService:
    """Test cases for TelegramBotService class."""
    
    @pytest.fixture
    def mock_config(self):
        """Create mock config."""
        config = Mock(spec=TelegramConfig)
        config.bot_token = "test_token"
        config.helios_api_url = "http://localhost:8080"
        config.is_enabled = True
        config.validate.return_value = True
        return config
    
    @pytest.fixture
    def bot_service(self, mock_config):
        """Create TelegramBotService instance."""
        with patch('src.modules.telegram.bot_service.telegram_config', mock_config):
            return TelegramBotService()
    
    def test_bot_service_initialization(self, bot_service):
        """Test bot service initialization."""
        assert bot_service.application is not None
        assert bot_service.user_data == {}
        assert bot_service.stats['total_users'] == 0
        assert bot_service.stats['active_conversations'] == 0
        assert bot_service.stats['plans_generated'] == 0
    
    @pytest.mark.asyncio
    async def test_start_bot_service(self, bot_service):
        """Test starting bot service."""
        with patch.object(bot_service.application, 'initialize') as mock_init:
            with patch.object(bot_service.application, 'start') as mock_start:
                await bot_service.start()
                
                mock_init.assert_called_once()
                mock_start.assert_called_once()
                assert bot_service.is_running is True
    
    @pytest.mark.asyncio
    async def test_stop_bot_service(self, bot_service):
        """Test stopping bot service."""
        bot_service.is_running = True
        
        with patch.object(bot_service.application, 'stop') as mock_stop:
            with patch.object(bot_service.application, 'shutdown') as mock_shutdown:
                await bot_service.stop()
                
                mock_stop.assert_called_once()
                mock_shutdown.assert_called_once()
                assert bot_service.is_running is False
    
    @pytest.mark.asyncio
    async def test_process_update(self, bot_service):
        """Test processing Telegram update."""
        update_data = {
            "update_id": 123,
            "message": {
                "message_id": 456,
                "from": {"id": 789, "first_name": "Test"},
                "chat": {"id": 789, "type": "private"},
                "text": "Hello"
            }
        }
        
        with patch('telegram.Update.de_json') as mock_de_json:
            mock_update = Mock()
            mock_de_json.return_value = mock_update
            
            with patch.object(bot_service.application, 'process_update') as mock_process:
                await bot_service.process_update(update_data)
                
                mock_de_json.assert_called_once_with(update_data, bot_service.application.bot)
                mock_process.assert_called_once_with(mock_update)
    
    @pytest.mark.asyncio
    async def test_set_webhook_success(self, bot_service):
        """Test successful webhook setup."""
        with patch.object(bot_service.application.bot, 'set_webhook') as mock_set:
            mock_set.return_value = True
            
            result = await bot_service.set_webhook("https://example.com/webhook")
            
            assert result is True
            mock_set.assert_called_once_with("https://example.com/webhook")
    
    @pytest.mark.asyncio
    async def test_set_webhook_failure(self, bot_service):
        """Test webhook setup failure."""
        with patch.object(bot_service.application.bot, 'set_webhook') as mock_set:
            mock_set.side_effect = Exception("Network error")
            
            result = await bot_service.set_webhook("https://example.com/webhook")
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_delete_webhook(self, bot_service):
        """Test webhook deletion."""
        with patch.object(bot_service.application.bot, 'delete_webhook') as mock_delete:
            mock_delete.return_value = True
            
            result = await bot_service.delete_webhook()
            
            assert result is True
            mock_delete.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_broadcast_message(self, bot_service):
        """Test broadcasting message to users."""
        # Setup some user data
        bot_service.user_data = {
            123: {'full_name': 'User 1'},
            456: {'full_name': 'User 2'},
            789: {'full_name': 'User 3'}
        }
        
        with patch.object(bot_service.application.bot, 'send_message') as mock_send:
            mock_send.return_value = AsyncMock()
            
            sent_count = await bot_service.broadcast_message("Test message")
            
            assert sent_count == 3
            assert mock_send.call_count == 3
    
    def test_stats_tracking(self, bot_service):
        """Test statistics tracking."""
        # Add some user data
        bot_service.user_data[123] = {'full_name': 'User 1', 'current_state': 'PERSONAL_NAME'}
        bot_service.user_data[456] = {'full_name': 'User 2', 'plan_generated': True}
        
        # Update stats
        bot_service._update_stats()
        
        assert bot_service.stats['total_users'] == 2
        assert bot_service.stats['active_conversations'] == 1
        assert bot_service.stats['plans_generated'] == 1


class TestTelegramConfig:
    """Test cases for TelegramConfig class."""
    
    def test_config_with_token(self):
        """Test config with valid token."""
        with patch.dict(os.environ, {'TELEGRAM_BOT_TOKEN': 'valid_token_123'}):
            config = TelegramConfig()
            
            assert config.bot_token == 'valid_token_123'
            assert config.is_enabled is True
            assert config.validate() is True
    
    def test_config_without_token(self):
        """Test config without token."""
        with patch.dict(os.environ, {}, clear=True):
            config = TelegramConfig()
            
            assert config.bot_token is None
            assert config.is_enabled is False
            assert config.validate() is False
    
    def test_config_with_short_token(self):
        """Test config with invalid short token."""
        with patch.dict(os.environ, {'TELEGRAM_BOT_TOKEN': 'short'}):
            config = TelegramConfig()
            
            assert config.bot_token == 'short'
            assert config.validate() is False
    
    def test_config_default_values(self):
        """Test config default values."""
        with patch.dict(os.environ, {'TELEGRAM_BOT_TOKEN': 'valid_token_123'}):
            config = TelegramConfig()
            
            assert config.helios_api_url == 'http://localhost:8080'
            assert config.plan_storage_path == '/tmp/telegram_plans'
            assert config.max_concurrent_conversations == 100
    
    def test_config_custom_values(self):
        """Test config with custom environment values."""
        env_vars = {
            'TELEGRAM_BOT_TOKEN': 'valid_token_123',
            'HELIOS_API_URL': 'http://custom:9000',
            'PLAN_STORAGE_PATH': '/custom/path',
            'MAX_CONCURRENT_CONVERSATIONS': '50'
        }
        
        with patch.dict(os.environ, env_vars):
            config = TelegramConfig()
            
            assert config.helios_api_url == 'http://custom:9000'
            assert config.plan_storage_path == '/custom/path'
            assert config.max_concurrent_conversations == 50


if __name__ == '__main__':
    pytest.main([__file__])
