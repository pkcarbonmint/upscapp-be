"""
Unit tests for Telegram bot functionality.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from telegram import Update, Message, User, Chat
from telegram.ext import ContextTypes

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'telegram_bot'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from telegram_bot.bot import HeliosBot
from telegram_bot.constants import *
from telegram_bot.conversation_handlers import ConversationHandlers
from telegram_bot.confidence_handlers import ConfidenceHandlers
from telegram_bot.strategy_handlers import StrategyHandlers
from telegram_bot.plan_presenter import PlanPresenter


class TestTelegramBot:
    """Test cases for main TelegramBot class."""
    
    @pytest.fixture
    def bot(self):
        """Create a HeliosBot instance for testing."""
        with patch.dict(os.environ, {'TELEGRAM_BOT_TOKEN': 'test_token'}):
            return HeliosBot()
    
    @pytest.fixture
    def mock_update(self):
        """Create a mock Telegram update."""
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = 12345
        update.message = Mock(spec=Message)
        update.message.text = "Test message"
        update.message.reply_text = AsyncMock()
        return update
    
    @pytest.fixture
    def mock_context(self):
        """Create a mock context."""
        return Mock(spec=ContextTypes.DEFAULT_TYPE)
    
    @pytest.mark.asyncio
    async def test_start_command(self, bot, mock_update, mock_context):
        """Test the /start command."""
        result = await bot.start(mock_update, mock_context)
        
        assert result == PERSONAL_NAME
        assert 12345 in bot.user_data
        assert bot.user_data[12345] == {}
        mock_update.message.reply_text.assert_called_once()
        
        # Check welcome message content
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "Welcome to the Helios Study Plan Generator" in call_args
        assert "What's your full name?" in call_args
    
    @pytest.mark.asyncio
    async def test_collect_personal_name(self, bot, mock_update, mock_context):
        """Test personal name collection."""
        bot.user_data[12345] = {}
        mock_update.message.text = "John Doe"
        
        result = await bot.collect_personal_name(mock_update, mock_context)
        
        assert result == PERSONAL_EMAIL
        assert bot.user_data[12345]['full_name'] == "John Doe"
        mock_update.message.reply_text.assert_called_with("📧 What's your email address?")
    
    @pytest.mark.asyncio
    async def test_collect_personal_email(self, bot, mock_update, mock_context):
        """Test email collection."""
        bot.user_data[12345] = {}
        mock_update.message.text = "john@example.com"
        
        result = await bot.collect_personal_email(mock_update, mock_context)
        
        assert result == PERSONAL_PHONE
        assert bot.user_data[12345]['email'] == "john@example.com"
        mock_update.message.reply_text.assert_called_with("📱 What's your phone number?")
    
    @pytest.mark.asyncio
    async def test_collect_personal_phone(self, bot, mock_update, mock_context):
        """Test phone number collection."""
        bot.user_data[12345] = {}
        mock_update.message.text = "+91-9876543210"
        
        result = await bot.collect_personal_phone(mock_update, mock_context)
        
        assert result == PERSONAL_LOCATION
        assert bot.user_data[12345]['phone_number'] == "+91-9876543210"
        mock_update.message.reply_text.assert_called_with("📍 Where are you currently located? (City, State)")
    
    @pytest.mark.asyncio
    async def test_collect_personal_location(self, bot, mock_update, mock_context):
        """Test location collection."""
        bot.user_data[12345] = {}
        mock_update.message.text = "Delhi, India"
        
        result = await bot.collect_personal_location(mock_update, mock_context)
        
        assert result == PERSONAL_STATUS
        assert bot.user_data[12345]['present_location'] == "Delhi, India"
        
        # Check that keyboard markup is used
        call_args = mock_update.message.reply_text.call_args
        assert "What's your current status?" in call_args[0][0]
        assert 'reply_markup' in call_args[1]
    
    @pytest.mark.asyncio
    async def test_collect_personal_status(self, bot, mock_update, mock_context):
        """Test status collection."""
        bot.user_data[12345] = {}
        mock_update.message.text = "Student"
        
        result = await bot.collect_personal_status(mock_update, mock_context)
        
        assert result == PERSONAL_GRADUATION
        assert bot.user_data[12345]['current_status'] == "Student"
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "graduation stream" in call_args
    
    @pytest.mark.asyncio
    async def test_collect_personal_graduation(self, bot, mock_update, mock_context):
        """Test graduation stream collection."""
        bot.user_data[12345] = {}
        mock_update.message.text = "Engineering"
        
        result = await bot.collect_personal_graduation(mock_update, mock_context)
        
        assert result == PERSONAL_COLLEGE
        assert bot.user_data[12345]['graduation_stream'] == "Engineering"
        mock_update.message.reply_text.assert_called_with("🏫 Which college/university did you graduate from?")
    
    @pytest.mark.asyncio
    async def test_collect_personal_college(self, bot, mock_update, mock_context):
        """Test college collection."""
        bot.user_data[12345] = {}
        mock_update.message.text = "IIT Delhi"
        
        result = await bot.collect_personal_college(mock_update, mock_context)
        
        assert result == PERSONAL_YEAR
        assert bot.user_data[12345]['college_university'] == "IIT Delhi"
        mock_update.message.reply_text.assert_called_with("📅 What year did you pass/graduate? (e.g., 2022)")
    
    @pytest.mark.asyncio
    async def test_collect_personal_year_valid(self, bot, mock_update, mock_context):
        """Test year collection with valid input."""
        bot.user_data[12345] = {}
        mock_update.message.text = "2022"
        
        with patch.object(ConversationHandlers, 'start_prep_section', return_value=PREP_DURATION) as mock_prep:
            result = await bot.collect_personal_year(mock_update, mock_context)
        
        assert result == PREP_DURATION
        assert bot.user_data[12345]['year_of_passing'] == 2022
        mock_prep.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_collect_personal_year_invalid(self, bot, mock_update, mock_context):
        """Test year collection with invalid input."""
        bot.user_data[12345] = {}
        mock_update.message.text = "invalid_year"
        
        with patch.object(ConversationHandlers, 'start_prep_section', return_value=PREP_DURATION) as mock_prep:
            result = await bot.collect_personal_year(mock_update, mock_context)
        
        assert result == PREP_DURATION
        assert bot.user_data[12345]['year_of_passing'] == 2024  # Default value
        mock_prep.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_help_command(self, bot, mock_update, mock_context):
        """Test the /help command."""
        result = await bot.help_command(mock_update, mock_context)
        
        assert result is None  # Help doesn't change conversation state
        mock_update.message.reply_text.assert_called_once()
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "Helios Study Plan Generator" in call_args
        assert "/cancel" in call_args
    
    @pytest.mark.asyncio
    async def test_cancel_command(self, bot, mock_update, mock_context):
        """Test the /cancel command."""
        bot.user_data[12345] = {'full_name': 'John Doe'}
        
        result = await bot.cancel(mock_update, mock_context)
        
        assert result == ConversationHandler.END
        assert 12345 not in bot.user_data
        mock_update.message.reply_text.assert_called_once()
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "cancelled" in call_args.lower()


class TestConversationHandlers:
    """Test cases for ConversationHandlers class."""
    
    @pytest.fixture
    def bot(self):
        """Create a HeliosBot instance for testing."""
        with patch.dict(os.environ, {'TELEGRAM_BOT_TOKEN': 'test_token'}):
            return HeliosBot()
    
    @pytest.fixture
    def handlers(self, bot):
        """Create ConversationHandlers instance."""
        return ConversationHandlers(bot)
    
    @pytest.fixture
    def mock_update(self):
        """Create a mock Telegram update."""
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = 12345
        update.message = Mock(spec=Message)
        update.message.text = "Test message"
        update.message.reply_text = AsyncMock()
        return update
    
    @pytest.fixture
    def mock_context(self):
        """Create a mock context."""
        return Mock(spec=ContextTypes.DEFAULT_TYPE)
    
    @pytest.mark.asyncio
    async def test_start_prep_section(self, handlers, mock_update, mock_context):
        """Test starting preparation section."""
        result = await handlers.start_prep_section(mock_update, mock_context)
        
        assert result == PREP_DURATION
        mock_update.message.reply_text.assert_called_once()
        
        call_args = mock_update.message.reply_text.call_args[0][0]
        assert "preparation background" in call_args.lower()
        assert "how long" in call_args.lower()


class TestPlanPresenter:
    """Test cases for PlanPresenter class."""
    
    @pytest.fixture
    def presenter(self):
        """Create PlanPresenter instance."""
        return PlanPresenter()
    
    def test_format_plan_summary(self, presenter):
        """Test plan summary formatting."""
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
        
        summary = presenter.format_plan_summary(mock_plan)
        
        assert isinstance(summary, str)
        assert 'Foundation Phase' in summary
        assert '12 weeks' in summary
        assert 'History' in summary
    
    def test_generate_html_plan_basic(self, presenter):
        """Test basic HTML plan generation."""
        mock_plan = {
            'blocks': [
                {
                    'block_name': 'Test Block',
                    'start_date': '2024-01-01',
                    'end_date': '2024-01-31',
                    'tasks': []
                }
            ],
            'total_weeks': 4
        }
        
        html_content = presenter.generate_html_plan(mock_plan, "test_user")
        
        assert isinstance(html_content, str)
        assert '<html' in html_content
        assert 'Test Block' in html_content
        assert 'UPSC Study Plan' in html_content
    
    @patch('builtins.open', create=True)
    @patch('os.makedirs')
    def test_save_plan_to_file(self, mock_makedirs, mock_open, presenter):
        """Test saving plan to file."""
        mock_plan = {'blocks': [], 'total_weeks': 1}
        mock_file = MagicMock()
        mock_open.return_value.__enter__.return_value = mock_file
        
        file_path = presenter.save_plan_to_file(mock_plan, "test_user")
        
        assert isinstance(file_path, str)
        assert 'test_user' in file_path
        assert file_path.endswith('.html')
        mock_makedirs.assert_called_once()
        mock_open.assert_called_once()
        mock_file.write.assert_called_once()


class TestHeliosIntegration:
    """Test cases for Helios API integration."""
    
    @pytest.fixture
    def bot(self):
        """Create a HeliosBot instance for testing."""
        with patch.dict(os.environ, {'TELEGRAM_BOT_TOKEN': 'test_token'}):
            return HeliosBot()
    
    def test_format_data_for_helios(self, bot):
        """Test data formatting for Helios API."""
        user_data = {
            'full_name': 'John Doe',
            'email': 'john@example.com',
            'phone_number': '+91-9876543210',
            'present_location': 'Delhi, India',
            'current_status': 'Student',
            'graduation_stream': 'Engineering',
            'college_university': 'IIT Delhi',
            'year_of_passing': 2022,
            'prep_duration': '1-2 years',
            'target_year': 2025,
            'previous_attempts': 0
        }
        
        helios_data = bot.format_data_for_helios(user_data)
        
        assert isinstance(helios_data, dict)
        assert 'personal_and_academic_details' in helios_data
        assert 'preparation_background' in helios_data
        
        personal_details = helios_data['personal_and_academic_details']
        assert personal_details['full_name'] == 'John Doe'
        assert personal_details['email'] == 'john@example.com'
        assert personal_details['present_location'] == 'Delhi, India'
    
    @patch('requests.post')
    @pytest.mark.asyncio
    async def test_call_helios_api_success(self, mock_post, bot):
        """Test successful Helios API call."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'blocks': [{'block_name': 'Test Block', 'tasks': []}],
            'total_weeks': 12
        }
        mock_post.return_value = mock_response
        
        user_data = {'full_name': 'John Doe'}
        result = await bot.call_helios_api(user_data)
        
        assert result is not None
        assert 'blocks' in result
        assert result['total_weeks'] == 12
        mock_post.assert_called_once()
    
    @patch('requests.post')
    @pytest.mark.asyncio
    async def test_call_helios_api_failure(self, mock_post, bot):
        """Test Helios API call failure."""
        mock_post.side_effect = Exception("Connection error")
        
        user_data = {'full_name': 'John Doe'}
        result = await bot.call_helios_api(user_data)
        
        assert result is None
        mock_post.assert_called_once()


if __name__ == '__main__':
    pytest.main([__file__])
