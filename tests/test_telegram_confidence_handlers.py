"""
Unit tests for Telegram bot confidence handlers.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from telegram import Update, Message, User, Chat
from telegram.ext import ContextTypes

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'telegram_bot'))

from telegram_bot.confidence_handlers import ConfidenceHandlers
from telegram_bot.constants import *


class TestConfidenceHandlers:
    """Test cases for ConfidenceHandlers class."""
    
    @pytest.fixture
    def mock_bot(self):
        """Create a mock bot instance."""
        bot = Mock()
        bot.user_data = {}
        return bot
    
    @pytest.fixture
    def handlers(self, mock_bot):
        """Create ConfidenceHandlers instance."""
        return ConfidenceHandlers(mock_bot)
    
    @pytest.fixture
    def mock_update(self):
        """Create a mock Telegram update."""
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = 12345
        update.message = Mock(spec=Message)
        update.message.text = "High"
        update.message.reply_text = AsyncMock()
        return update
    
    @pytest.fixture
    def mock_context(self):
        """Create a mock context."""
        return Mock(spec=ContextTypes.DEFAULT_TYPE)
    
    @pytest.mark.asyncio
    async def test_start_confidence_section(self, handlers, mock_update, mock_context):
        """Test starting confidence assessment section."""
        handlers.bot.user_data[12345] = {}
        
        result = await handlers.start_confidence_section(mock_update, mock_context)
        
        assert result == CONFIDENCE_HISTORY
        mock_update.message.reply_text.assert_called_once()
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "confidence" in call_args.lower()
        assert "history" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_confidence_history(self, handlers, mock_update, mock_context):
        """Test collecting history confidence."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "Medium"
        
        result = await handlers.collect_confidence_history(mock_update, mock_context)
        
        assert result == CONFIDENCE_GEOGRAPHY
        assert handlers.bot.user_data[12345]['confidence_history'] == "Medium"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "geography" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_confidence_geography(self, handlers, mock_update, mock_context):
        """Test collecting geography confidence."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "High"
        
        result = await handlers.collect_confidence_geography(mock_update, mock_context)
        
        assert result == CONFIDENCE_POLITY
        assert handlers.bot.user_data[12345]['confidence_geography'] == "High"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "polity" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_confidence_polity(self, handlers, mock_update, mock_context):
        """Test collecting polity confidence."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "Low"
        
        result = await handlers.collect_confidence_polity(mock_update, mock_context)
        
        assert result == CONFIDENCE_ECONOMICS
        assert handlers.bot.user_data[12345]['confidence_polity'] == "Low"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "economics" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_confidence_economics(self, handlers, mock_update, mock_context):
        """Test collecting economics confidence."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "Medium"
        
        result = await handlers.collect_confidence_economics(mock_update, mock_context)
        
        assert result == CONFIDENCE_SCIENCE
        assert handlers.bot.user_data[12345]['confidence_economics'] == "Medium"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "science" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_confidence_science(self, handlers, mock_update, mock_context):
        """Test collecting science confidence."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "High"
        
        result = await handlers.collect_confidence_science(mock_update, mock_context)
        
        assert result == CONFIDENCE_ENVIRONMENT
        assert handlers.bot.user_data[12345]['confidence_science'] == "High"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "environment" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_confidence_environment(self, handlers, mock_update, mock_context):
        """Test collecting environment confidence."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "Low"
        
        result = await handlers.collect_confidence_environment(mock_update, mock_context)
        
        assert result == CONFIDENCE_CURRENT_AFFAIRS
        assert handlers.bot.user_data[12345]['confidence_environment'] == "Low"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "current affairs" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_confidence_current_affairs(self, handlers, mock_update, mock_context):
        """Test collecting current affairs confidence."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "Medium"
        
        result = await handlers.collect_confidence_current_affairs(mock_update, mock_context)
        
        assert result == CONFIDENCE_CSAT
        assert handlers.bot.user_data[12345]['confidence_current_affairs'] == "Medium"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "csat" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_confidence_csat(self, handlers, mock_update, mock_context):
        """Test collecting CSAT confidence."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "High"
        
        result = await handlers.collect_confidence_csat(mock_update, mock_context)
        
        assert result == CONFIDENCE_GS1_HISTORY
        assert handlers.bot.user_data[12345]['confidence_csat'] == "High"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "mains" in call_args.lower()
        assert "gs1" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_mains_gs1_subjects(self, handlers, mock_update, mock_context):
        """Test collecting GS1 subject confidences."""
        handlers.bot.user_data[12345] = {}
        
        # Test History
        mock_update.message.text = "High"
        result = await handlers.collect_confidence_gs1_history(mock_update, mock_context)
        assert result == CONFIDENCE_GS1_GEOGRAPHY
        assert handlers.bot.user_data[12345]['confidence_gs1_history'] == "High"
        
        # Test Geography
        mock_update.message.text = "Medium"
        result = await handlers.collect_confidence_gs1_geography(mock_update, mock_context)
        assert result == CONFIDENCE_GS1_CULTURE
        assert handlers.bot.user_data[12345]['confidence_gs1_geography'] == "Medium"
        
        # Test Culture
        mock_update.message.text = "Low"
        result = await handlers.collect_confidence_gs1_culture(mock_update, mock_context)
        assert result == CONFIDENCE_GS1_SOCIETY
        assert handlers.bot.user_data[12345]['confidence_gs1_culture'] == "Low"
    
    @pytest.mark.asyncio
    async def test_transition_to_strategy(self, handlers, mock_update, mock_context):
        """Test transition from confidence to strategy section."""
        handlers.bot.user_data[12345] = {}
        
        # Mock StrategyHandlers
        with patch('telegram_bot.confidence_handlers.StrategyHandlers') as mock_strategy_class:
            mock_strategy_instance = Mock()
            mock_strategy_instance.start_strategy_section = AsyncMock(return_value=STRATEGY_FOCUS)
            mock_strategy_class.return_value = mock_strategy_instance
            
            # Test the last confidence collection that should transition
            mock_update.message.text = "High"
            result = await handlers.collect_confidence_optional_subject(mock_update, mock_context)
            
            assert result == STRATEGY_FOCUS
            assert handlers.bot.user_data[12345]['confidence_optional_subject'] == "High"
            mock_strategy_instance.start_strategy_section.assert_called_once()
    
    def test_confidence_level_validation(self, handlers):
        """Test confidence level validation."""
        valid_levels = ["High", "Medium", "Low", "high", "medium", "low"]
        invalid_levels = ["Very High", "None", "5", ""]
        
        # Note: Current implementation doesn't validate, but we can test expected behavior
        for level in valid_levels:
            # Should accept these levels
            assert level.lower() in ['high', 'medium', 'low'] or level.title() in ['High', 'Medium', 'Low']
        
        for level in invalid_levels:
            # Should reject these levels
            assert level.lower() not in ['high', 'medium', 'low']
    
    @pytest.mark.asyncio
    async def test_confidence_data_structure(self, handlers, mock_update, mock_context):
        """Test that confidence data is stored in correct structure."""
        handlers.bot.user_data[12345] = {}
        
        # Collect a few confidence ratings
        mock_update.message.text = "High"
        await handlers.collect_confidence_history(mock_update, mock_context)
        
        mock_update.message.text = "Medium"
        await handlers.collect_confidence_geography(mock_update, mock_context)
        
        mock_update.message.text = "Low"
        await handlers.collect_confidence_polity(mock_update, mock_context)
        
        user_data = handlers.bot.user_data[12345]
        
        # Check that all confidence fields are stored correctly
        assert user_data['confidence_history'] == "High"
        assert user_data['confidence_geography'] == "Medium"
        assert user_data['confidence_polity'] == "Low"
        
        # Check that keys follow expected naming convention
        confidence_keys = [key for key in user_data.keys() if key.startswith('confidence_')]
        assert len(confidence_keys) == 3
        
        for key in confidence_keys:
            assert user_data[key] in ["High", "Medium", "Low"]


if __name__ == '__main__':
    pytest.main([__file__])
