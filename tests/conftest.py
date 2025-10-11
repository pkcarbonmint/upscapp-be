"""
Pytest configuration and shared fixtures for Telegram bot tests.
"""

import pytest
import asyncio
import os
import sys
from unittest.mock import Mock, AsyncMock, patch

# Add project paths to sys.path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'telegram_bot'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def mock_telegram_bot_token():
    """Mock Telegram bot token environment variable."""
    with patch.dict(os.environ, {'TELEGRAM_BOT_TOKEN': 'test_token_123456789'}):
        yield

@pytest.fixture
def mock_helios_api_url():
    """Mock Helios API URL environment variable."""
    with patch.dict(os.environ, {'HELIOS_API_URL': 'http://localhost:8080'}):
        yield

@pytest.fixture
def mock_environment():
    """Mock all required environment variables."""
    env_vars = {
        'TELEGRAM_BOT_TOKEN': 'test_token_123456789',
        'HELIOS_API_URL': 'http://localhost:8080',
        'PLAN_STORAGE_PATH': '/tmp/test_plans',
        'MAX_CONCURRENT_CONVERSATIONS': '50'
    }
    with patch.dict(os.environ, env_vars):
        yield

@pytest.fixture
def sample_user_data():
    """Sample complete user data for testing."""
    return {
        'full_name': 'John Doe',
        'email': 'john.doe@example.com',
        'phone_number': '+91-9876543210',
        'present_location': 'Delhi, India',
        'current_status': 'Student',
        'graduation_stream': 'Engineering',
        'college_university': 'IIT Delhi',
        'year_of_passing': 2022,
        'prep_duration': '1-2 years',
        'target_year': 2025,
        'previous_attempts': 0,
        'prelims_score': 120,
        'mains_attempts': 0,
        'interview_attempts': 0,
        'coaching_experience': 'No',
        'coaching_institute': '',
        'coaching_duration': '',
        'mentorship_experience': 'No',
        'mentorship_details': '',
        'optional_subject': 'Geography',
        'optional_status': 'Beginner',
        'optional_learning': 'Self Study',
        'test_series': 'Yes',
        'csat_assessment': 'Good',
        'weak_areas': 'Mathematics',
        'gs_understanding': 'Good',
        'optional_syllabus': 'Moderate',
        'pyq_usage': 'Regular',
        # Confidence levels for all subjects
        'confidence_history': 'High',
        'confidence_geography': 'Medium',
        'confidence_polity': 'High',
        'confidence_economics': 'Low',
        'confidence_science': 'Medium',
        'confidence_environment': 'High',
        'confidence_current_affairs': 'Medium',
        'confidence_csat': 'Low',
        'confidence_gs1_history': 'High',
        'confidence_gs1_geography': 'Medium',
        'confidence_gs1_culture': 'Low',
        'confidence_gs1_society': 'Medium',
        'confidence_gs1_post_independence': 'High',
        'confidence_gs1_world_history': 'Low',
        'confidence_gs1_art_culture': 'Medium',
        'confidence_gs2_constitution': 'High',
        'confidence_gs2_governance': 'Medium',
        'confidence_gs2_social_justice': 'Low',
        'confidence_gs2_international': 'Medium',
        'confidence_gs2_bilateral': 'High',
        'confidence_gs3_economics': 'Low',
        'confidence_gs3_agriculture': 'Medium',
        'confidence_gs3_technology': 'High',
        'confidence_gs3_environment': 'Medium',
        'confidence_gs3_security': 'Low',
        'confidence_gs3_disaster': 'High',
        'confidence_gs4_ethics': 'Medium',
        'confidence_gs4_integrity': 'High',
        'confidence_optional_subject': 'Medium',
        # Study strategy
        'strategy_focus': 'Prelims Focus',
        'strategy_hours': '6-8 hours',
        'strategy_distribution': 'Equal Distribution',
        'strategy_approach': 'Conceptual Learning',
        'strategy_revision': 'Regular Revision',
        'strategy_testing': 'Weekly Tests',
        'strategy_resources': 'Standard Books',
        'strategy_motivation': 'Self Motivation'
    }

@pytest.fixture
def sample_helios_plan():
    """Sample Helios plan response for testing."""
    return {
        'blocks': [
            {
                'block_name': 'Foundation Phase',
                'start_date': '2024-01-01',
                'end_date': '2024-03-31',
                'tasks': [
                    {
                        'task_type': 'Reading',
                        'subject': 'History',
                        'topic': 'Ancient India',
                        'hours': 2,
                        'resources': ['NCERT Class 6-12'],
                        'week': 1
                    },
                    {
                        'task_type': 'Practice',
                        'subject': 'Geography',
                        'topic': 'Physical Geography',
                        'hours': 1,
                        'resources': ['Atlas', 'Previous Year Questions'],
                        'week': 1
                    }
                ]
            },
            {
                'block_name': 'Intensive Phase',
                'start_date': '2024-04-01',
                'end_date': '2024-08-31',
                'tasks': [
                    {
                        'task_type': 'Revision',
                        'subject': 'Polity',
                        'topic': 'Constitution',
                        'hours': 3,
                        'resources': ['Laxmikanth'],
                        'week': 14
                    }
                ]
            }
        ],
        'total_weeks': 35,
        'estimated_completion': '2024-08-31',
        'success_probability': 0.75
    }

@pytest.fixture
def mock_requests_post():
    """Mock requests.post for Helios API calls."""
    with patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'blocks': [],
            'total_weeks': 12
        }
        mock_post.return_value = mock_response
        yield mock_post
