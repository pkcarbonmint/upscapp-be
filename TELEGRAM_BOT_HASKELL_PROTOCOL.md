# Telegram Bot - Haskell Protocol Design

## Overview
Move the error-prone Python state machine to Haskell for better type safety and reliability.

## Architecture

```
Telegram User → Python Bot → Haskell Helios → Python Bot → Database/PDF
```

## API Endpoints

### 1. Conversation Handler
```
POST /bot/conversation
```

**Request:**
```json
{
  "user_id": "telegram_user_id",
  "message": "user input text", 
  "message_type": "text" | "callback_data",
  "session_data": {...} // optional existing session state
}
```

**Response:**
```json
{
  "response_text": "Bot reply message",
  "keyboard": {
    "type": "reply" | "inline" | null,
    "options": [["Option 1", "Option 2"], ["Option 3"]]
  },
  "session_data": {...}, // updated session state
  "next_action": "continue" | "generate_plan" | "end_conversation",
  "collected_data": {...} // complete user data if ready for plan generation
}
```

### 2. Session Management
```
GET /bot/session/{user_id}
POST /bot/session/{user_id}/reset
```

## Data Types (Haskell)

### Core Types
```haskell
data BotRequest = BotRequest
  { userId :: Text
  , message :: Text
  , messageType :: MessageType
  , sessionData :: Maybe SessionState
  } deriving (Generic, Show)

data BotResponse = BotResponse
  { responseText :: Text
  , keyboard :: Maybe KeyboardMarkup
  , sessionData :: SessionState
  , nextAction :: NextAction
  , collectedData :: Maybe CompleteUserData
  } deriving (Generic, Show)

data MessageType = TextMessage | CallbackData
  deriving (Generic, Show)

data NextAction = Continue | GeneratePlan | EndConversation
  deriving (Generic, Show)

data KeyboardMarkup = KeyboardMarkup
  { keyboardType :: KeyboardType
  , options :: [[Text]]
  } deriving (Generic, Show)

data KeyboardType = ReplyKeyboard | InlineKeyboard
  deriving (Generic, Show)
```

### Session State
```haskell
data SessionState = SessionState
  { currentStep :: ConversationStep
  , collectedAnswers :: Map Text Text
  , validationErrors :: [Text]
  } deriving (Generic, Show)

data ConversationStep 
  = PersonalInfo PersonalStep
  | PrepBackground PrepStep  
  | Coaching CoachingStep
  | Optional OptionalStep
  | Testing TestStep
  | Syllabus SyllabusStep
  | Confidence ConfidenceStep
  | Strategy StrategyStep
  | Complete
  deriving (Generic, Show, Eq)
```

## Conversation Flow (Haskell State Machine)

```haskell
-- Main conversation handler
handleConversation :: BotRequest -> IO BotResponse
handleConversation req = do
  let currentSession = fromMaybe initialSession (sessionData req)
  case currentStep currentSession of
    PersonalInfo step -> handlePersonalInfo step req currentSession
    PrepBackground step -> handlePrepBackground step req currentSession
    -- ... other handlers
    Complete -> handleComplete req currentSession

-- Example step handler
handlePersonalInfo :: PersonalStep -> BotRequest -> SessionState -> IO BotResponse
handlePersonalInfo PersonalName req session = do
  let updatedAnswers = Map.insert "name" (message req) (collectedAnswers session)
  let nextSession = session { 
    currentStep = PersonalInfo PersonalEmail,
    collectedAnswers = updatedAnswers 
  }
  return $ BotResponse
    { responseText = "Great! What's your email address?"
    , keyboard = Nothing
    , sessionData = nextSession
    , nextAction = Continue
    , collectedData = Nothing
    }
```

## Python Bot Implementation

```python
class HeliosBot:
    def __init__(self):
        self.helios_url = "http://localhost:8080"
    
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        message = update.message.text
        
        # Get existing session from memory/cache
        session_data = self.get_session(user_id)
        
        # Call Haskell for conversation logic
        response = await self.call_helios_conversation(user_id, message, session_data)
        
        # Update local session cache
        self.update_session(user_id, response['session_data'])
        
        # Send response to user
        await self.send_response(update, response)
        
        # Handle next actions
        if response['next_action'] == 'generate_plan':
            await self.generate_and_send_plan(update, response['collected_data'])
        elif response['next_action'] == 'end_conversation':
            await self.end_conversation(update)
    
    async def call_helios_conversation(self, user_id, message, session_data):
        payload = {
            "user_id": user_id,
            "message": message,
            "message_type": "text",
            "session_data": session_data
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.helios_url}/bot/conversation", 
                                   json=payload) as resp:
                return await resp.json()
```

## Benefits

1. **Type Safety**: Haskell's type system prevents runtime errors
2. **Centralized Logic**: All conversation flow in one place
3. **Easy Testing**: Pure functions for state transitions
4. **Maintainable**: Clear separation of concerns
5. **Robust**: No more constant name mismatches

## Migration Strategy

1. Add new `/bot/conversation` endpoint to Haskell API
2. Implement Haskell conversation state machine
3. Create thin Python wrapper for Telegram API
4. Test conversation flow end-to-end
5. Keep existing Python code for DB/PDF operations

## Session Storage Options

- **Memory**: Simple HashMap in Haskell (current approach)
- **Redis**: Shared state between Python/Haskell
- **Database**: Persistent sessions for reliability

## Error Handling

```haskell
data ConversationError 
  = InvalidInput Text
  | SessionNotFound Text
  | ValidationError [Text]
  deriving (Generic, Show)

handleConversationSafe :: BotRequest -> IO (Either ConversationError BotResponse)
```

This design eliminates the constant mismatch issues and provides a much more robust foundation for the Telegram bot.
