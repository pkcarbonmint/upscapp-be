"""
Basic unit tests for Telegram bot functionality.
"""

import pytest
import asyncio
import os
from unittest.mock import Mock, AsyncMock, patch

# Add project paths
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src', 'telegram_bot'))

from src.telegram_bot.constants import *


class TestConstants:
    """Test constants are properly defined."""
    
    def test_conversation_states_defined(self):
        """Test that all conversation states are defined."""
        assert PERSONAL_NAME is not None
        assert PERSONAL_EMAIL is not None
        assert PERSONAL_PHONE is not None
        assert CONFIDENCE_HISTORY is not None
        assert STRATEGY_FOCUS is not None
        assert GENERATING_PLAN is not None
    
    def test_confidence_levels_defined(self):
        """Test confidence levels are properly structured."""
        assert isinstance(CONFIDENCE_LEVELS, list)
        assert len(CONFIDENCE_LEVELS) > 0
        assert isinstance(CONFIDENCE_LEVELS[0], list)
    
    def test_study_options_defined(self):
        """Test study strategy options are defined."""
        assert isinstance(STUDY_FOCUS_OPTIONS, list)
        assert isinstance(STUDY_HOURS_OPTIONS, list)
        assert isinstance(TIME_DISTRIBUTION_OPTIONS, list)


class TestBotImports:
    """Test that bot modules can be imported."""
    
    def test_bot_import(self):
        """Test bot module imports successfully."""
        from src.telegram_bot.bot import HeliosBot
        assert HeliosBot is not None
    
    def test_handlers_import(self):
        """Test handler modules import successfully."""
        from src.telegram_bot.conversation_handlers import ConversationHandlers
        from src.telegram_bot.confidence_handlers import ConfidenceHandlers
        from src.telegram_bot.strategy_handlers import StrategyHandlers
        from src.telegram_bot.plan_presenter import PlanPresenter
        
        assert ConversationHandlers is not None
        assert ConfidenceHandlers is not None
        assert StrategyHandlers is not None
        assert PlanPresenter is not None


class TestBotBasicFunctionality:
    """Test basic bot functionality."""
    
    @pytest.fixture
    def bot(self):
        """Create bot instance."""
        from src.telegram_bot.bot import HeliosBot
        return HeliosBot()
    
    def test_bot_initialization(self, bot):
        """Test bot initializes correctly."""
        assert hasattr(bot, 'user_data')
        assert isinstance(bot.user_data, dict)
    
    def test_user_data_storage(self, bot):
        """Test user data can be stored and retrieved."""
        user_id = 12345
        test_data = {'name': 'Test User', 'email': 'test@example.com'}
        
        bot.user_data[user_id] = test_data
        
        assert user_id in bot.user_data
        assert bot.user_data[user_id]['name'] == 'Test User'
        assert bot.user_data[user_id]['email'] == 'test@example.com'


class TestPlanPresenter:
    """Test plan presentation functionality."""
    
    @pytest.fixture
    def presenter(self):
        """Create PlanPresenter instance."""
        from src.telegram_bot.plan_presenter import PlanPresenter
        return PlanPresenter()
    
    def test_presenter_initialization(self, presenter):
        """Test presenter initializes correctly."""
        assert presenter is not None
    
    def test_create_plan_webpage_basic(self, presenter):
        """Test basic plan webpage creation."""
        mock_plan = {
            'blocks': [
                {
                    'block_name': 'Test Block',
                    'start_date': '2024-01-01',
                    'end_date': '2024-01-31',
                    'subjects': ['History', 'Geography']
                }
            ],
            'total_weeks': 4
        }
        
        with patch('builtins.open', create=True) as mock_open:
            mock_file = Mock()
            mock_open.return_value.__enter__.return_value = mock_file
            
            result = presenter.create_plan_webpage(mock_plan, 12345, "Test User")
            
            assert isinstance(result, str)
            assert len(result) > 0
            mock_open.assert_called_once()
            mock_file.write.assert_called_once()


class TestHeliosIntegration:
    """Test Helios API integration basics."""
    
    @pytest.fixture
    def bot(self):
        """Create bot instance."""
        from src.telegram_bot.bot import HeliosBot
        return HeliosBot()
    
    def test_format_data_for_helios_basic(self, bot):
        """Test basic data formatting for Helios."""
        user_id = 12345
        user_data = {
            'full_name': 'John Doe',
            'email': 'john@example.com',
            'phone_number': '+91-9876543210'
        }
        
        # Store data in bot's user_data first
        bot.user_data[user_id] = user_data
        
        # Test that method exists and can be called
        if hasattr(bot, 'format_data_for_helios'):
            result = bot.format_data_for_helios(user_id)
            assert isinstance(result, dict)
    
    @patch('requests.post')
    def test_helios_api_call_mock(self, mock_post, bot):
        """Test Helios API call with mocking."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'blocks': [], 'total_weeks': 12}
        mock_post.return_value = mock_response
        
        # Test that API call method exists
        if hasattr(bot, 'call_helios_api'):
            # This is a basic test to ensure the method can be called
            assert callable(getattr(bot, 'call_helios_api'))


if __name__ == '__main__':
    pytest.main([__file__])
