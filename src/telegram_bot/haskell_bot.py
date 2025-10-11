"""
Thin Python wrapper for Telegram bot that delegates conversation logic to Haskell.
"""

import asyncio
import aiohttp
import json
import logging
import os
from typing import Dict, Any, Optional
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from dotenv import load_dotenv
from .plan_presenter import PlanPresenter

# Load environment variables
load_dotenv('docker.env')

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.DEBUG
)
logger = logging.getLogger(__name__)

class HaskellTelegramBot:
    """
    Thin Python wrapper that handles Telegram API and delegates conversation logic to Haskell.
    """
    
    def __init__(self, token: str, helios_url: str = "http://localhost:8080"):
        self.token = token
        self.helios_url = helios_url
        self.session_cache: Dict[str, Dict] = {}  # In-memory session storage
        self.plan_presenter = PlanPresenter()  # Initialize PDF generator
        
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Handle /start command by initiating conversation with Haskell."""
        user_id = str(update.effective_user.id)
        
        # Clear any existing session
        self.session_cache.pop(user_id, None)
        
        # Send initial message to Haskell
        response = await self.call_haskell_conversation(user_id, "/start", None)
        await self.send_response(update, response)
        
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Handle all text messages by forwarding to Haskell conversation handler."""
        user_id = str(update.effective_user.id)
        message_text = update.message.text
        
        # Get existing session from cache
        session_data = self.session_cache.get(user_id)
        
        # Call Haskell for conversation logic
        response = await self.call_haskell_conversation(user_id, message_text, session_data)
        
        # Update local session cache
        if 'sessionState' in response:
            self.session_cache[user_id] = response['sessionState']
        
        # Send response to user
        await self.send_response(update, response)
        
        # Handle next actions
        next_action = response.get('nextAction')  # Haskell uses 'nextAction', not 'next_action'
        if next_action == 'GeneratePlan':
            await self.generate_and_send_plan(update, response.get('collectedData'), response.get('studyPlanData'))
        elif next_action == 'EndConversation':
            await self.end_conversation(update)
    
    async def call_haskell_conversation(self, user_id: str, message: str, session_data: Optional[Dict]) -> Dict[str, Any]:
        """Call Haskell conversation endpoint."""
        payload = {
            "userId": user_id,
            "message": message,
            "messageType": "TextMessage",
            "sessionData": session_data
        }
        
        logger.debug(f"🚀 SENDING TO HELIOS: {json.dumps(payload, indent=2)}")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.helios_url}/bot/conversation",
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                ) as resp:
                    if resp.status == 200:
                        response_data = await resp.json()
                        logger.debug(f"✅ RECEIVED FROM HELIOS: {json.dumps(response_data, indent=2)}")
                        return response_data
                    else:
                        error_text = await resp.text()
                        logger.error(f"❌ Haskell API error: {resp.status} - {error_text}")
                        return self.error_response("Sorry, I'm having technical difficulties. Please try again.")
        except Exception as e:
            logger.error(f"❌ Error calling Haskell API: {e}")
            return self.error_response("Sorry, I'm having technical difficulties. Please try again.")
    
    def error_response(self, message: str) -> Dict[str, Any]:
        """Create error response."""
        return {
            "responseText": message,
            "keyboard": None,
            "sessionState": {"currentStep": "PersonalStep", "collectedAnswers": {}, "validationErrors": []},
            "nextAction": "Continue",
            "collectedData": None
        }
    
    async def send_response(self, update: Update, response: Dict[str, Any]) -> None:
        """Send response to Telegram user."""
        response_text = response.get('responseText', 'No response')
        keyboard_data = response.get('keyboard')
        
        # Create keyboard markup if provided
        reply_markup = None
        if keyboard_data:
            keyboard_type = keyboard_data.get('keyboardType')
            options = keyboard_data.get('options', [])
            
            if keyboard_type == 'ReplyKeyboard' and options:
                reply_markup = ReplyKeyboardMarkup(
                    options,
                    one_time_keyboard=True,
                    resize_keyboard=True
                )
        
        await update.message.reply_text(
            response_text,
            reply_markup=reply_markup
        )
    
    async def generate_and_send_plan(self, update: Update, collected_data: Optional[Dict], study_plan_data: Optional[Dict]) -> None:
        """Generate study plan and send PDF to user."""
        if not study_plan_data:
            await update.message.reply_text("❌ Unable to generate plan - missing study plan data.")
            return
        
        try:
            user_id = update.effective_user.id
            user_name = update.effective_user.first_name or "Student"
            
            await update.message.reply_text("🎉 Your personalized UPSC study plan is ready!")
            
            # Extract study plan details
            plan_title = study_plan_data.get('plan_title', 'Your UPSC Study Plan')
            blocks = study_plan_data.get('blocks', [])
            
            await update.message.reply_text(f"📚 **{plan_title}**\n\n📋 Your plan contains {len(blocks)} study blocks")
            
            if blocks:
                # Show first few blocks as preview
                preview_blocks = blocks[:3]  # Show first 3 blocks
                preview_text = "📖 **Study Plan Preview:**\n\n"
                for i, block in enumerate(preview_blocks, 1):
                    subjects = block.get('subjects', [])
                    duration = block.get('duration_weeks', 'N/A')
                    # Handle subjects as list of strings
                    subjects_str = ', '.join(subjects[:3]) if subjects else 'Mixed Subjects'
                    preview_text += f"**Block {i}:**\n"
                    preview_text += f"📅 Duration: {duration} weeks\n"
                    preview_text += f"📚 Subjects: {subjects_str}\n\n"
                
                await update.message.reply_text(preview_text, parse_mode='Markdown')
            
            # Generate PDF using existing PlanPresenter
            await update.message.reply_text("📄 Generating your personalized PDF...")
            
            pdf_path = self.plan_presenter.create_plan_pdf(study_plan_data, user_id, user_name)
            
            if pdf_path and os.path.exists(pdf_path):
                # Send PDF file to user
                with open(pdf_path, 'rb') as pdf_file:
                    await update.message.reply_document(
                        document=pdf_file,
                        filename=f"UPSC_Study_Plan_{user_name}.pdf",
                        caption="📚 Your complete UPSC study plan is ready! Good luck with your preparation! 🚀"
                    )
                
                logger.info(f"PDF sent successfully to user {user_id}")
                
                # Clean up the temporary file
                try:
                    os.remove(pdf_path)
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up PDF file: {cleanup_error}")
                    
            else:
                await update.message.reply_text("❌ Failed to generate PDF. Please try again.")
                logger.error(f"PDF generation failed - file not found: {pdf_path}")
            
            logger.info(f"Study plan generated successfully: {len(blocks)} blocks")
            
        except Exception as e:
            logger.error(f"Error generating plan: {e}")
            import traceback
            traceback.print_exc()
            await update.message.reply_text("❌ Sorry, there was an error generating your plan. Please try again.")
    
    def transform_to_wizard_data(self, collected_data: Dict) -> Dict:
        """Transform Haskell collected data to UIWizardData format."""
        personal = collected_data.get('personalData', {})
        preparation = collected_data.get('preparationData', {})
        coaching = collected_data.get('coachingData', {})
        optional = collected_data.get('optionalData', {})
        confidence = collected_data.get('confidenceData', {})
        strategy = collected_data.get('strategyData', {})
        
        return {
            "personal_details": {
                "full_name": personal.get('fullName', ''),
                "email": personal.get('email', ''),
                "phone_number": personal.get('phoneNumber', ''),
                "present_location": personal.get('presentLocation', ''),
                "student_archetype": personal.get('studentArchetype', 'FullTimeAspirant'),
                "graduation_stream": personal.get('graduationStream', ''),
                "college_university": personal.get('collegeUniversity', ''),
                "year_of_passing": personal.get('yearOfPassing', 2024)
            },
            "preparation_background": {
                "preparing_since": preparation.get('preparingSince', ''),
                "target_year": preparation.get('targetYear', ''),
                "number_of_attempts": preparation.get('numberOfAttempts', ''),
                "highest_stage_per_attempt": preparation.get('highestStagePerAttempt', ''),
                "last_attempt_gs_prelims_score": preparation.get('lastAttemptGsPrelimsScore', 0),
                "last_attempt_csat_score": preparation.get('lastAttemptCsatScore', 0),
                "wrote_mains_in_last_attempt": preparation.get('wroteMainsInLastAttempt', ''),
                "mains_paper_marks": preparation.get('mainspaperMarks', '')
            },
            "coaching_and_mentorship": {
                "prior_coaching": coaching.get('priorCoaching', ''),
                "coaching_institute_name": coaching.get('coachingInstituteName', ''),
                "prior_mentorship": coaching.get('priorMentorship', ''),
                "programme_mentor_name": coaching.get('programmeMentorName', ''),
                "place_of_preparation": coaching.get('placeOfPreparation', '')
            },
            "optional_subject_details": {
                "optional_subject": optional.get('optionalSubject', ''),
                "optional_status": optional.get('optionalStatus', ''),
                "optional_taken_from": optional.get('optionalTakenFrom', '')
            },
            "confidence_level": {
                "current_events": confidence.get('currentEvents', ''),
                "history_of_india": confidence.get('historyOfIndia', ''),
                "indian_world_geography": confidence.get('indianWorldGeography', ''),
                "polity_governance": confidence.get('polityGovernance', ''),
                "economy_social_development": confidence.get('economySocialDevelopment', ''),
                "environment_ecology": confidence.get('environmentEcology', ''),
                "science_technology": confidence.get('scienceTechnology', ''),
                "csat": confidence.get('csat', ''),
                "essay": confidence.get('essay', ''),
                "indian_culture": confidence.get('indianCulture', ''),
                "modern_history": confidence.get('modernHistory', ''),
                "constitution": confidence.get('constitution', ''),
                "international_relations": confidence.get('internationalRelations', ''),
                "economy": confidence.get('economy', ''),
                "ethics_integrity_aptitude": confidence.get('ethicsIntegrityAptitude', ''),
                "optional_subject_paper1": confidence.get('optionalSubjectPaper1', ''),
                "optional_subject_paper2": confidence.get('optionalSubjectPaper2', '')
            },
            "study_strategy": {
                "study_focus_combo": strategy.get('studyFocusCombo', ''),
                "weekly_study_hours": strategy.get('weeklyStudyHours', ''),
                "time_distribution": strategy.get('timeDistribution', ''),
                "study_approach": strategy.get('studyApproach', ''),
                "revision_strategy": strategy.get('revisionStrategy', ''),
                "test_frequency": strategy.get('testFrequency', ''),
                "seasonal_windows": strategy.get('seasonalWindows', []),
                "catch_up_day_preference": strategy.get('catchUpDayPreference', '')
            }
        }
    
    async def end_conversation(self, update: Update) -> None:
        """End conversation and clean up."""
        user_id = str(update.effective_user.id)
        self.session_cache.pop(user_id, None)
        
        from telegram import ReplyKeyboardRemove
        await update.message.reply_text(
            "✅ Thank you for using the UPSC Study Plan Generator! "
            "Use /start anytime to create a new plan.",
            reply_markup=ReplyKeyboardRemove()
        )
    
    def run(self) -> None:
        """Start the bot."""
        application = Application.builder().token(self.token).build()
        
        # Add handlers
        application.add_handler(CommandHandler("start", self.start_command))
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))
        
        # Start the bot
        logger.info("Starting Haskell-powered Telegram bot...")
        application.run_polling()

def main():
    """Main entry point."""
    import os
    from dotenv import load_dotenv
    
    load_dotenv("docker.env")
    
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN not found in environment variables")
    
    helios_url = os.getenv("HELIOS_URL", "http://localhost:8080")
    
    bot = HaskellTelegramBot(token, helios_url)
    bot.run()

if __name__ == "__main__":
    main()
