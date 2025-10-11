"""
Study strategy collection handlers.
"""

from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import ContextTypes
from constants import *
from plan_presenter import PlanPresenter

class StrategyHandlers:
    def __init__(self, bot_instance):
        self.bot = bot_instance

    async def collect_strategy_focus(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['study_focus_combo'] = update.message.text
        
        keyboard = STUDY_HOURS_OPTIONS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "⏰ How many hours per week can you dedicate to UPSC preparation?",
            reply_markup=reply_markup
        )
        return STRATEGY_HOURS

    async def collect_strategy_hours(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['weekly_study_hours'] = update.message.text
        
        keyboard = TIME_DISTRIBUTION_OPTIONS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📊 How would you like to distribute your time?",
            reply_markup=reply_markup
        )
        return STRATEGY_DISTRIBUTION

    async def collect_strategy_distribution(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['time_distribution'] = update.message.text
        
        keyboard = STUDY_APPROACH_OPTIONS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📚 What's your preferred study approach?",
            reply_markup=reply_markup
        )
        return STRATEGY_APPROACH

    async def collect_strategy_approach(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['study_approach'] = update.message.text
        
        keyboard = REVISION_STRATEGY_OPTIONS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "🔄 How often would you like to revise?",
            reply_markup=reply_markup
        )
        return STRATEGY_REVISION

    async def collect_strategy_revision(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['revision_strategy'] = update.message.text
        
        keyboard = TEST_FREQUENCY_OPTIONS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📝 How frequently would you like to take tests?",
            reply_markup=reply_markup
        )
        return STRATEGY_TESTING

    async def collect_strategy_test_freq(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['test_frequency'] = update.message.text
        
        await update.message.reply_text(
            "🌟 Do you have any specific seasonal preparation windows? (e.g., 'Summer intensive', 'Winter focus') - Separate with commas or type 'None'",
            reply_markup=ReplyKeyboardRemove()
        )
        return STRATEGY_RESOURCES

    async def collect_strategy_seasonal(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        seasonal = update.message.text
        if seasonal.lower() == 'none':
            self.bot.user_data[user_id]['seasonal_windows'] = []
        else:
            self.bot.user_data[user_id]['seasonal_windows'] = [s.strip() for s in seasonal.split(',')]
        
        keyboard = CATCHUP_DAY_OPTIONS
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
        
        await update.message.reply_text(
            "📅 Which day would you prefer as your catch-up day?",
            reply_markup=reply_markup
        )
        return STRATEGY_MOTIVATION

    async def collect_strategy_catchup(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['catch_up_day_preference'] = update.message.text
        
        await update.message.reply_text(
            "🎉 Perfect! I have collected all the information needed.\n\n"
            "⚡ Now generating your personalized study plan using the Helios engine...\n"
            "This may take a few moments.",
            reply_markup=ReplyKeyboardRemove()
        )
        
        return await self.generate_and_present_plan(update, context)

    # Add missing handler methods
    async def collect_strategy_testing(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['testing_strategy'] = update.message.text
        
        await update.message.reply_text(
            "📚 What resources do you prefer for study materials?"
        )
        return STRATEGY_RESOURCES

    async def collect_strategy_resources(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['preferred_resources'] = update.message.text
        
        await update.message.reply_text(
            "💪 What motivates you most in your UPSC journey?"
        )
        return STRATEGY_MOTIVATION

    async def collect_strategy_motivation(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        self.bot.user_data[user_id]['motivation_factors'] = update.message.text
        
        return await self.generate_and_present_plan(update, context)

    async def generate_and_present_plan(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        user_id = update.effective_user.id
        
        try:
            # Generate plan using Helios API
            plan = await self.bot.generate_plan(user_id)
            
            if plan:
                # Create a formatted presentation
                plan_summary = self.format_plan_summary(plan)
                pdf_path = await self.create_plan_pdf(plan, user_id)
                
                if pdf_path:
                    # Send PDF file to user
                    with open(pdf_path, 'rb') as pdf_file:
                        await update.message.reply_document(
                            document=pdf_file,
                            filename=f"study_plan_{user_id}.pdf",
                            caption=f"✅ Your personalized study plan is ready!\n\n{plan_summary}"
                        )
                else:
                    # Fallback to text summary if PDF generation fails
                    await update.message.reply_text(
                        f"✅ Your personalized study plan is ready!\n\n"
                        f"{plan_summary}\n\n"
                        f"❌ PDF generation failed, but your plan has been created successfully.",
                        parse_mode='Markdown'
                    )
                await update.message.reply_text(
                    f"📱 You can also use /newplan to create another plan or /help for more options."
                )
            else:
                await update.message.reply_text(
                    "❌ Sorry, there was an issue generating your plan. Please try again later or contact support.\n\n"
                    "Use /start to begin again."
                )
        
        except Exception as e:
            await update.message.reply_text(
                "❌ An error occurred while generating your plan. Please try again.\n\n"
                "Use /start to begin again."
            )
        
        return ConversationHandler.END

    def format_plan_summary(self, plan: dict) -> str:
        """Create a brief summary of the generated plan."""
        try:
            blocks = plan.get('blocks', [])
            total_weeks = sum(block.get('duration_weeks', 0) for block in blocks)
            
            summary = f"📋 **Plan Overview:**\n"
            summary += f"• Duration: {total_weeks} weeks\n"
            summary += f"• Blocks: {len(blocks)} study phases\n"
            
            if blocks:
                first_block = blocks[0]
                subjects = first_block.get('subjects', [])
                if subjects:
                    summary += f"• Starting with: {', '.join(subjects[:3])}\n"
            
            summary += f"• Customized based on your confidence levels and preferences"
            
            return summary
        except:
            return "📋 Your personalized study plan has been generated successfully!"

    async def create_plan_pdf(self, plan: dict, user_id: int) -> str:
        """Create a PDF file for the plan and return file path."""
        try:
            from plan_presenter import PlanPresenter
            
            # Get user name from bot data
            user_name = self.bot.user_data.get(user_id, {}).get('full_name', 'Student')
            
            # Create PDF presentation
            presenter = PlanPresenter()
            pdf_path = presenter.create_plan_pdf(plan, user_id, user_name)
            
            return pdf_path
        except Exception as e:
            logger.error(f"Error creating plan PDF: {e}")
            return None

    async def create_plan_webpage(self, plan: dict, user_id: int) -> str:
        """Create a comprehensive HTML webpage for the plan and return URL."""
        try:
            from plan_presenter import PlanPresenter
            
            # Get user name from bot data
            user_name = self.bot.user_data.get(user_id, {}).get('full_name', 'Student')
            
            # Create HTML presentation
            presenter = PlanPresenter()
            plan_url = presenter.create_plan_webpage(plan, user_id, user_name)
            
            return plan_url
        except Exception as e:
            logger.error(f"Error creating plan webpage: {e}")
            return f"Error generating plan webpage: {str(e)}"
