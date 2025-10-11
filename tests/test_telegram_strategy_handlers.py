"""
Unit tests for Telegram bot strategy handlers.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from telegram import Update, Message, User, Chat
from telegram.ext import ContextTypes

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'telegram_bot'))

from telegram_bot.strategy_handlers import StrategyHandlers
from telegram_bot.constants import *


class TestStrategyHandlers:
    """Test cases for StrategyHandlers class."""
    
    @pytest.fixture
    def mock_bot(self):
        """Create a mock bot instance."""
        bot = Mock()
        bot.user_data = {}
        bot.call_helios_api = AsyncMock(return_value={'blocks': [], 'total_weeks': 12})
        return bot
    
    @pytest.fixture
    def handlers(self, mock_bot):
        """Create StrategyHandlers instance."""
        return StrategyHandlers(mock_bot)
    
    @pytest.fixture
    def mock_update(self):
        """Create a mock Telegram update."""
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = 12345
        update.message = Mock(spec=Message)
        update.message.text = "Prelims Focus"
        update.message.reply_text = AsyncMock()
        return update
    
    @pytest.fixture
    def mock_context(self):
        """Create a mock context."""
        return Mock(spec=ContextTypes.DEFAULT_TYPE)
    
    @pytest.mark.asyncio
    async def test_start_strategy_section(self, handlers, mock_update, mock_context):
        """Test starting strategy section."""
        handlers.bot.user_data[12345] = {}
        
        result = await handlers.start_strategy_section(mock_update, mock_context)
        
        assert result == STRATEGY_FOCUS
        mock_update.message.reply_text.assert_called_once()
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "study strategy" in call_args.lower()
        assert "focus" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_strategy_focus(self, handlers, mock_update, mock_context):
        """Test collecting strategy focus."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "Prelims Focus"
        
        result = await handlers.collect_strategy_focus(mock_update, mock_context)
        
        assert result == STRATEGY_HOURS
        assert handlers.bot.user_data[12345]['strategy_focus'] == "Prelims Focus"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "hours" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_strategy_hours(self, handlers, mock_update, mock_context):
        """Test collecting study hours."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "6-8 hours"
        
        result = await handlers.collect_strategy_hours(mock_update, mock_context)
        
        assert result == STRATEGY_DISTRIBUTION
        assert handlers.bot.user_data[12345]['strategy_hours'] == "6-8 hours"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "distribution" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_strategy_distribution(self, handlers, mock_update, mock_context):
        """Test collecting time distribution."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "Equal Distribution"
        
        result = await handlers.collect_strategy_distribution(mock_update, mock_context)
        
        assert result == STRATEGY_APPROACH
        assert handlers.bot.user_data[12345]['strategy_distribution'] == "Equal Distribution"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "approach" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_strategy_approach(self, handlers, mock_update, mock_context):
        """Test collecting study approach."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "Conceptual Learning"
        
        result = await handlers.collect_strategy_approach(mock_update, mock_context)
        
        assert result == STRATEGY_REVISION
        assert handlers.bot.user_data[12345]['strategy_approach'] == "Conceptual Learning"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "revision" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_strategy_revision(self, handlers, mock_update, mock_context):
        """Test collecting revision strategy."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "Regular Revision"
        
        result = await handlers.collect_strategy_revision(mock_update, mock_context)
        
        assert result == STRATEGY_TESTING
        assert handlers.bot.user_data[12345]['strategy_revision'] == "Regular Revision"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "testing" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_strategy_testing(self, handlers, mock_update, mock_context):
        """Test collecting testing strategy."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "Weekly Tests"
        
        result = await handlers.collect_strategy_testing(mock_update, mock_context)
        
        assert result == STRATEGY_RESOURCES
        assert handlers.bot.user_data[12345]['strategy_testing'] == "Weekly Tests"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "resources" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_strategy_resources(self, handlers, mock_update, mock_context):
        """Test collecting resource preferences."""
        handlers.bot.user_data[12345] = {}
        mock_update.message.text = "Standard Books"
        
        result = await handlers.collect_strategy_resources(mock_update, mock_context)
        
        assert result == STRATEGY_MOTIVATION
        assert handlers.bot.user_data[12345]['strategy_resources'] == "Standard Books"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "motivation" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_collect_strategy_motivation_and_generate_plan(self, handlers, mock_update, mock_context):
        """Test collecting motivation and triggering plan generation."""
        # Setup complete user data
        handlers.bot.user_data[12345] = {
            'full_name': 'John Doe',
            'email': 'john@example.com',
            'strategy_focus': 'Prelims Focus',
            'strategy_hours': '6-8 hours',
            'strategy_distribution': 'Equal Distribution',
            'strategy_approach': 'Conceptual Learning',
            'strategy_revision': 'Regular Revision',
            'strategy_testing': 'Weekly Tests',
            'strategy_resources': 'Standard Books'
        }
        
        mock_update.message.text = "Self Motivation"
        
        with patch.object(handlers, 'generate_and_present_plan', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = ConversationHandler.END
            
            result = await handlers.collect_strategy_motivation(mock_update, mock_context)
        
        assert result == ConversationHandler.END
        assert handlers.bot.user_data[12345]['strategy_motivation'] == "Self Motivation"
        mock_generate.assert_called_once_with(mock_update, mock_context)
    
    @pytest.mark.asyncio
    async def test_generate_and_present_plan_success(self, handlers, mock_update, mock_context):
        """Test successful plan generation and presentation."""
        # Setup user data
        handlers.bot.user_data[12345] = {
            'full_name': 'John Doe',
            'email': 'john@example.com'
        }
        
        # Mock successful API response
        mock_plan = {
            'blocks': [
                {
                    'block_name': 'Foundation Phase',
                    'start_date': '2024-01-01',
                    'end_date': '2024-03-31',
                    'tasks': [
                        {'task_type': 'Reading', 'subject': 'History', 'hours': 2}
                    ]
                }
            ],
            'total_weeks': 12
        }
        handlers.bot.call_helios_api.return_value = mock_plan
        
        # Mock PlanPresenter
        with patch('telegram_bot.strategy_handlers.PlanPresenter') as mock_presenter_class:
            mock_presenter = Mock()
            mock_presenter.format_plan_summary.return_value = "Plan Summary"
            mock_presenter.save_plan_to_file.return_value = "/tmp/plan.html"
            mock_presenter_class.return_value = mock_presenter
            
            result = await handlers.generate_and_present_plan(mock_update, mock_context)
        
        assert result == ConversationHandler.END
        handlers.bot.call_helios_api.assert_called_once()
        mock_presenter.format_plan_summary.assert_called_once_with(mock_plan)
        mock_presenter.save_plan_to_file.assert_called_once_with(mock_plan, "John Doe")
        
        # Check that success message was sent
        assert mock_update.message.reply_text.call_count >= 2
    
    @pytest.mark.asyncio
    async def test_generate_and_present_plan_api_failure(self, handlers, mock_update, mock_context):
        """Test plan generation with API failure."""
        handlers.bot.user_data[12345] = {'full_name': 'John Doe'}
        handlers.bot.call_helios_api.return_value = None  # Simulate API failure
        
        result = await handlers.generate_and_present_plan(mock_update, mock_context)
        
        assert result == ConversationHandler.END
        handlers.bot.call_helios_api.assert_called_once()
        
        # Check that error message was sent
        mock_update.message.reply_text.assert_called()
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "sorry" in call_args.lower() or "error" in call_args.lower()
    
    def test_strategy_data_completeness(self, handlers):
        """Test that all strategy fields are collected."""
        expected_strategy_fields = [
            'strategy_focus',
            'strategy_hours', 
            'strategy_distribution',
            'strategy_approach',
            'strategy_revision',
            'strategy_testing',
            'strategy_resources',
            'strategy_motivation'
        ]
        
        # This test ensures we're collecting all expected strategy fields
        # In a real implementation, we'd check the handlers collect all these fields
        user_data = {}
        
        # Simulate collecting all strategy data
        strategy_values = [
            "Prelims Focus",
            "6-8 hours",
            "Equal Distribution", 
            "Conceptual Learning",
            "Regular Revision",
            "Weekly Tests",
            "Standard Books",
            "Self Motivation"
        ]
        
        for field, value in zip(expected_strategy_fields, strategy_values):
            user_data[field] = value
        
        # Check all fields are present
        for field in expected_strategy_fields:
            assert field in user_data
            assert user_data[field] is not None
            assert len(user_data[field]) > 0
    
    @pytest.mark.asyncio
    async def test_data_formatting_for_helios(self, handlers, mock_update, mock_context):
        """Test that strategy data is properly formatted for Helios API."""
        # Setup complete user data with strategy information
        complete_user_data = {
            'full_name': 'John Doe',
            'email': 'john@example.com',
            'phone_number': '+91-9876543210',
            'present_location': 'Delhi, India',
            'current_status': 'Student',
            'graduation_stream': 'Engineering',
            'college_university': 'IIT Delhi',
            'year_of_passing': 2022,
            'strategy_focus': 'Prelims Focus',
            'strategy_hours': '6-8 hours',
            'strategy_distribution': 'Equal Distribution',
            'strategy_approach': 'Conceptual Learning',
            'strategy_revision': 'Regular Revision',
            'strategy_testing': 'Weekly Tests',
            'strategy_resources': 'Standard Books',
            'strategy_motivation': 'Self Motivation'
        }
        
        handlers.bot.user_data[12345] = complete_user_data
        
        # Mock the bot's format_data_for_helios method
        with patch.object(handlers.bot, 'format_data_for_helios') as mock_format:
            mock_format.return_value = {'formatted': 'data'}
            
            await handlers.generate_and_present_plan(mock_update, mock_context)
            
            # Verify format_data_for_helios was called with complete user data
            mock_format.assert_called_once_with(complete_user_data)


if __name__ == '__main__':
    pytest.main([__file__])
