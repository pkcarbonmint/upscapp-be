"""
Conversation handlers for collecting comprehensive student data.
"""

from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import ContextTypes
from constants import *

class ConversationHandlers:
    def __init__(self, bot_instance):
        self.bot = bot_instance

    # Preparation Background Handlers
    async def collect_prep_highest_stage(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['highest_stage_per_attempt'] = update.message.text
        
        if update.message.text in ['Prelims', 'Mains', 'Interview']:
            await update.message.reply_text(
                "📊 What was your GS Prelims score in your last attempt? (0-200)",
                reply_markup=ReplyKeyboardRemove()
            )
            return PREP_PRELIMS_SCORE
        else:
            # Skip scores for first-time aspirants
            self.bot.user_data[user_id]['last_attempt_gs_prelims_score'] = 0
            self.bot.user_data[user_id]['last_attempt_csat_score'] = 0
            self.bot.user_data[user_id]['wrote_mains_in_last_attempt'] = 'No'
            self.bot.user_data[user_id]['mains_paper_marks'] = ''
            return await self.start_coaching_section(update, context)

    async def collect_prep_prelims_score(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        try:
            self.bot.user_data[user_id]['last_attempt_gs_prelims_score'] = int(update.message.text)
        except ValueError:
            self.bot.user_data[user_id]['last_attempt_gs_prelims_score'] = 0
        
        await update.message.reply_text("📊 What was your CSAT score in your last attempt? (0-200)")
        return PREP_CSAT_SCORE

    async def collect_prep_csat_score(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        try:
            self.bot.user_data[user_id]['last_attempt_csat_score'] = int(update.message.text)
        except ValueError:
            self.bot.user_data[user_id]['last_attempt_csat_score'] = 0
        
        keyboard = [['Yes', 'No']]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📝 Did you write Mains in your last attempt?",
            reply_markup=reply_markup
        )
        return PREP_WROTE_MAINS

    async def collect_prep_wrote_mains(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['wrote_mains_in_last_attempt'] = update.message.text
        
        if update.message.text == 'Yes':
            await update.message.reply_text(
                "📊 Please share your Mains paper marks (e.g., 'GS1: 85, GS2: 92, GS3: 78, GS4: 88, Essay: 95, Optional: 145')",
                reply_markup=ReplyKeyboardRemove()
            )
            return PREP_MAINS_MARKS
        else:
            self.bot.user_data[user_id]['mains_paper_marks'] = ''
            return await self.start_coaching_section(update, context)

    async def collect_prep_mains_marks(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['mains_paper_marks'] = update.message.text
        return await self.start_coaching_section(update, context)

    # Coaching Section
    async def start_coaching_section(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        keyboard = [['Yes', 'No']]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "🏫 Now let's talk about coaching and mentorship.\n\n"
            "Have you taken any prior coaching for UPSC?",
            reply_markup=reply_markup
        )
        return COACHING_PRIOR

    async def collect_coaching_prior(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['prior_coaching'] = update.message.text
        
        if update.message.text == 'Yes':
            await update.message.reply_text(
                "🏫 Which coaching institute did you attend?",
                reply_markup=ReplyKeyboardRemove()
            )
            return COACHING_INSTITUTE
        else:
            self.bot.user_data[user_id]['coaching_institute_name'] = ''
            return await self.ask_mentorship(update, context)

    async def collect_coaching_institute(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['coaching_institute_name'] = update.message.text
        return await self.ask_mentorship(update, context)

    async def ask_mentorship(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        keyboard = [['Yes', 'No']]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "👨‍🏫 Have you had any prior mentorship for UPSC preparation?",
            reply_markup=reply_markup
        )
        return COACHING_MENTORSHIP

    async def collect_coaching_mentorship(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['prior_mentorship'] = update.message.text
        
        if update.message.text == 'Yes':
            await update.message.reply_text(
                "👨‍🏫 What's your mentor's name?",
                reply_markup=ReplyKeyboardRemove()
            )
            return COACHING_MENTOR_NAME
        else:
            self.bot.user_data[user_id]['programme_mentor_name'] = ''
            return await self.ask_preparation_place(update, context)

    async def collect_coaching_mentor_name(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['programme_mentor_name'] = update.message.text
        return await self.ask_preparation_place(update, context)

    async def ask_preparation_place(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        keyboard = [
            ['Home', 'Library'],
            ['Coaching Center', 'Other']
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📍 Where do you primarily prepare for UPSC?",
            reply_markup=reply_markup
        )
        return COACHING_PLACE

    async def collect_coaching_place(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['place_of_preparation'] = update.message.text
        return await self.start_optional_section(update, context)

    # Optional Subject Section
    async def start_optional_section(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        await update.message.reply_text(
            "📚 Let's discuss your optional subject.\n\n"
            "What optional subject have you chosen? (e.g., Geography, History, Public Administration, etc.)",
            reply_markup=ReplyKeyboardRemove()
        )
        return OPTIONAL_SUBJECT

    async def collect_optional_subject(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['optional_subject'] = update.message.text
        
        keyboard = [
            ['Not Started', 'Beginner'],
            ['Intermediate', 'Advanced']
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📊 What's your current status with the optional subject?",
            reply_markup=reply_markup
        )
        return OPTIONAL_STATUS

    async def collect_optional_status(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['optional_status'] = update.message.text
        
        keyboard = [
            ['Self Study', 'Coaching'],
            ['Books Only', 'Online Course']
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📖 How are you studying your optional subject?",
            reply_markup=reply_markup
        )
        return OPTIONAL_FROM

    async def collect_optional_from(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['optional_taken_from'] = update.message.text
        return await self.start_test_section(update, context)

    # Test Experience Section
    async def start_test_section(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        await update.message.reply_text(
            "📝 Now let's talk about your test experience.\n\n"
            "Which test series have you attempted? (Separate multiple with commas, or type 'None')",
            reply_markup=ReplyKeyboardRemove()
        )
        return TEST_SERIES

    async def collect_test_series(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        test_series = update.message.text
        if test_series.lower() == 'none':
            self.bot.user_data[user_id]['test_series_attempted'] = []
        else:
            self.bot.user_data[user_id]['test_series_attempted'] = [s.strip() for s in test_series.split(',')]
        
        keyboard = [
            ['Excellent', 'Good'],
            ['Average', 'Poor']
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📊 How would you assess your CSAT performance?",
            reply_markup=reply_markup
        )
        return TEST_CSAT_ASSESSMENT

    async def collect_test_csat_assessment(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['csat_self_assessment'] = update.message.text
        
        await update.message.reply_text(
            "📉 What are your weak areas in CSAT? (Separate with commas, or type 'None')"
        )
        return TEST_CSAT_WEAK

    async def collect_test_csat_weak(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        weak_areas = update.message.text
        if weak_areas.lower() == 'none':
            self.bot.user_data[user_id]['csat_weak_areas'] = []
        else:
            self.bot.user_data[user_id]['csat_weak_areas'] = [s.strip() for s in weak_areas.split(',')]
        
        return await self.start_syllabus_section(update, context)

    # Syllabus Awareness Section
    async def start_syllabus_section(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        keyboard = [
            ['Excellent', 'Good'],
            ['Basic', 'Poor']
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📋 Let's assess your syllabus awareness.\n\n"
            "How well do you understand the GS syllabus?",
            reply_markup=reply_markup
        )
        return SYLLABUS_GS

    async def collect_syllabus_gs(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['gs_syllabus_understanding'] = update.message.text
        
        keyboard = [
            ['Excellent', 'Good'],
            ['Basic', 'Poor']
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📋 How well do you understand your optional subject syllabus?",
            reply_markup=reply_markup
        )
        return SYLLABUS_OPTIONAL

    async def collect_syllabus_optional(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['optional_syllabus_understanding'] = update.message.text
        
        keyboard = [
            ['Excellent', 'Good'],
            ['Basic', 'Poor']
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📚 How familiar are you with Previous Year Questions (PYQs) and their use?",
            reply_markup=reply_markup
        )
        return SYLLABUS_PYQ

    async def collect_syllabus_pyq(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['pyq_awareness_and_use'] = update.message.text
        return await self.start_confidence_section(update, context)

    # Subject Confidence Section
    async def start_confidence_section(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        keyboard = [
            ['Not Started', 'Very Weak'],
            ['Weak', 'Moderate'],
            ['Strong', 'Very Strong']
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "💪 Now I'll assess your confidence in different subjects.\n"
            "This is important for creating a personalized plan.\n\n"
            "Rate your confidence in Current Events (Prelims):",
            reply_markup=reply_markup
        )
        return CONFIDENCE_CURRENT_AFFAIRS

    async def start_prep_section(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        keyboard = [
            ['Just started', '6 months'],
            ['1 year', '2 years'],
            ['3+ years', 'Veteran (5+ years)']
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📚 Great! Now let's talk about your UPSC preparation background.\n\n"
            "Since when have you been preparing for UPSC?",
            reply_markup=reply_markup
        )
        return PREP_DURATION

    async def collect_prep_since(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['preparing_since'] = update.message.text
        
        keyboard = [['2025', '2026', '2027', '2028']]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "🎯 What's your target year for UPSC?",
            reply_markup=reply_markup
        )
        return PREP_TARGET_YEAR

    async def collect_prep_target_year(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['target_year'] = update.message.text
        
        keyboard = [['0', '1', '2', '3', '4+']]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📊 How many UPSC attempts have you made so far?",
            reply_markup=reply_markup
        )
        return PREP_ATTEMPTS

    async def collect_prep_attempts(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['number_of_attempts'] = update.message.text
        
        keyboard = [
            ['Not attempted yet', 'Prelims'],
            ['Mains', 'Interview']
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "🏆 What's the highest stage you've reached in your attempts?",
            reply_markup=reply_markup
        )
        return PREP_HIGHEST_STAGE
