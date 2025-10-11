"""
Confidence assessment handlers for all subjects.
"""

from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import ContextTypes
from constants import *

class ConfidenceHandlers:
    def __init__(self, bot_instance):
        self.bot = bot_instance
        self.confidence_data = {}

    async def collect_confidence_current_events(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        if user_id not in self.confidence_data:
            self.confidence_data[user_id] = {}
        self.confidence_data[user_id]['current_events'] = update.message.text
        
        keyboard = CONFIDENCE_LEVELS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "Rate your confidence in History of India (Prelims):",
            reply_markup=reply_markup
        )
        return CONFIDENCE_HISTORY

    async def collect_confidence_history(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['history'] = update.message.text
        
        keyboard = CONFIDENCE_LEVELS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "Rate your confidence in Geography (Prelims):",
            reply_markup=reply_markup
        )
        return CONFIDENCE_GEOGRAPHY

    async def collect_confidence_geography(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['geography'] = update.message.text
        
        keyboard = CONFIDENCE_LEVELS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "Rate your confidence in Polity & Governance (Prelims):",
            reply_markup=reply_markup
        )
        return CONFIDENCE_POLITY

    async def collect_confidence_polity(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['polity'] = update.message.text
        
        keyboard = CONFIDENCE_LEVELS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "Rate your confidence in Economy & Social Development (Prelims):",
            reply_markup=reply_markup
        )
        return CONFIDENCE_ECONOMICS

    async def collect_confidence_economy(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['economy'] = update.message.text
        
        keyboard = CONFIDENCE_LEVELS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "Rate your confidence in Environment & Ecology (Prelims):",
            reply_markup=reply_markup
        )
        return CONFIDENCE_ENVIRONMENT

    async def collect_confidence_environment(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['environment'] = update.message.text
        
        keyboard = CONFIDENCE_LEVELS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "Rate your confidence in Science & Technology (Prelims):",
            reply_markup=reply_markup
        )
        return CONFIDENCE_SCIENCE

    async def collect_confidence_science(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['science_technology'] = update.message.text
        
        keyboard = CONFIDENCE_LEVELS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "Rate your confidence in CSAT:",
            reply_markup=reply_markup
        )
        return CONFIDENCE_CSAT

    async def collect_confidence_csat(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['csat'] = update.message.text
        
        await update.message.reply_text(
            "📝 Great! Now let's assess your Mains subjects.\n\n"
            "Rate your confidence in GS1 - History of India:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS1_HISTORY

    # Continue with Mains subjects
    async def collect_confidence_essay(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['essay'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Indian Culture:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS1_GEOGRAPHY

    async def collect_confidence_culture(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['indian_culture'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Modern History:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS1_CULTURE

    async def collect_confidence_modern_history(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['modern_history'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in World History:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS1_SOCIETY

    async def collect_confidence_world_history(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['world_history'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Post Independence India:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS1_POST_INDEPENDENCE

    async def collect_confidence_post_independence(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['post_independence'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Indian Society:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS1_WORLD_HISTORY

    async def collect_confidence_society(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['indian_society'] = update.message.text
        
        await update.message.reply_text(
            "📝 Moving to GS2 subjects...\n\n"
            "Rate your confidence in Constitution:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS1_ART_CULTURE

    # GS2 subjects
    async def collect_confidence_constitution(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['constitution'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Governance:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS2_CONSTITUTION

    async def collect_confidence_governance(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['governance'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Social Justice:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS2_GOVERNANCE

    async def collect_confidence_social_justice(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['social_justice'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in International Relations:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS2_SOCIAL_JUSTICE

    async def collect_confidence_ir(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['international_relations'] = update.message.text
        
        await update.message.reply_text(
            "📝 Moving to GS3 subjects...\n\n"
            "Rate your confidence in Economy (Mains):",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS2_INTERNATIONAL

    # GS3 subjects
    async def collect_confidence_eco_mains(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['eco_mains'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Agriculture:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS2_BILATERAL

    async def collect_confidence_agriculture(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['agriculture'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Environment (Mains):",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS3_ECONOMICS

    async def collect_confidence_env_mains(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['env_mains'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Science & Technology (Mains):",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS3_AGRICULTURE

    async def collect_confidence_sci_mains(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['sci_mains'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Disaster Management:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS3_TECHNOLOGY

    async def collect_confidence_disaster(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['disaster_management'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Internal Security:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS3_ENVIRONMENT

    async def collect_confidence_security(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['internal_security'] = update.message.text
        
        await update.message.reply_text(
            "📝 Final subjects...\n\n"
            "Rate your confidence in Ethics, Integrity & Aptitude:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS3_SECURITY

    # GS4 and Optional
    async def collect_confidence_ethics(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['ethics'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Optional Subject Paper 1:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS3_DISASTER

    async def collect_confidence_opt1(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['optional_paper1'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Optional Subject Paper 2:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_GS4_ETHICS

    async def collect_confidence_opt2(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['optional_paper2'] = update.message.text
        
        # Import and delegate to strategy handlers
        from strategy_handlers import StrategyHandlers
        strategy_handlers = StrategyHandlers(self.bot)
        return await strategy_handlers.start_strategy_section(update, context)

    # Add missing handler methods
    async def collect_confidence_integrity(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        if user_id not in self.confidence_data:
            self.confidence_data[user_id] = {}
        self.confidence_data[user_id]['integrity'] = update.message.text
        
        await update.message.reply_text(
            "Rate your confidence in Optional Subject:",
            reply_markup=ReplyKeyboardMarkup(CONFIDENCE_LEVELS, one_time_keyboard=True)
        )
        return CONFIDENCE_OPTIONAL_SUBJECT

    async def collect_confidence_optional(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.confidence_data[user_id]['optional_subject'] = update.message.text
        
        # Import and delegate to strategy handlers
        from strategy_handlers import StrategyHandlers
        strategy_handlers = StrategyHandlers(self.bot)
        return await strategy_handlers.start_strategy_section(update, context)

    async def start_strategy_section(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        keyboard = STUDY_FOCUS_OPTIONS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "🎯 Excellent! Now let's design your study strategy.\n\n"
            "What would you like to focus on in your preparation?",
            reply_markup=reply_markup
        )
        return STRATEGY_FOCUS
