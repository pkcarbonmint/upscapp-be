# Helios Intake Interview Roadmap

## Overview

Transform the current linear Telegram bot interview into an engaging, iterative conversation that follows modern UX principles while maintaining data collection depth.

## Core Principles

  1. **Set expectations early** - explain the 5-10 minute process upfront
  1. **Ask for unknowns first** - collect background info, assume defaults (target year: 2026)
  1. **Give something back** - show plan previews after collecting basic info
  1. **Group questions intelligently** - allow multiple data points per natural language response
  1. **Iterate and reveal** - progressively improve and show more of the plan
  1. **Make it friendly** - inject humor, acknowledge tedium, show progress
  1. **Enable what-if scenarios** - allow parameter adjustments without re-interview
  1. **Close with referrals** - ask for referrals after payment

## Implementation Roadmap

### Phase 1: Smart Conversation Flow (High Priority)

#### 1.1 Expectation Setting & Progress Tracking
- Replace linear step-by-step with conversational intro explaining the process
- Add progress indicators showing completion percentage (e.g., "🔄 30% complete")
- Allow pause/resume functionality with session persistence
- Set clear expectations: "This will take about 5-10 minutes, and you can finish in stages"

#### 1.2. Intelligent Question Grouping
- Combine related questions into natural language prompts
- **Example transformation:**
  ```
  OLD: "What's your name?" → "What's your email?" → "What's your phone?"
  NEW: "Let's start with the basics - your name, email, and phone number"
  ```
- Use AI parsing to extract multiple data points from single responses
- Implement fallback individual questions if parsing fails

### Phase 2: Iterative Plan Building (Medium Priority)

#### 2.1. Early Plan Preview
- After collecting basic info (background + target year assumption), generate initial plan outline
- Show brief summary with assumptions:
  ```
  "Based on your profile as a working professional targeting 2026, here's a rough plan:
  - 18 months preparation timeline
  - Focus on GS + Optional (assuming Geography)
  - 25-30 hours/week study schedule
  
  Now let's dive deeper to customize this for you..."
  ```

#### 2.2. Progressive Revelation
- After each major section, update and show plan improvements
- Use engaging language: 
  - "Great! Your strong History background changes your timeline significantly..."
  - "Interesting - your CSAT weakness means we need to adjust the schedule..."
- Show what changed and why

### Phase 3: Engagement & Feedback (Medium Priority)

#### 3.1. Feedback Integration
- Add mid-process check-ins: "How are we doing? Getting tedious? 😅"
- Acknowledge the process: "I know this is a lot of questions, but we're 70% done and your plan is looking solid!"
- Inject personality and humor throughout
- Ask for feedback: "Is this level of detail helpful, or should I focus on the big picture?"

#### 3.2. Progress Indicators
- Visual progress bars or percentages
- Milestone celebrations: "🎉 Halfway there! Your plan is taking shape..."
- Time estimates: "Just 2 more minutes and we'll have your complete plan"

### Phase 4: What-If Scenarios (Medium Priority)

#### 4.1. Parameter Variation System
- After plan generation, offer quick variations:
  - "What if you could study 7 hours/day instead of 5?"
  - "What if you took the exam in 2027 instead of 2026?"
  - "What if you switched from Geography to History as optional?"
- Implement quick recalculation without full re-interview
- Show side-by-side comparisons

### Phase 5: Completion & Growth (Low Priority)

#### 5.2. Payment & Referral Flow
- Seamless transition to payment after plan presentation
- Built-in referral system with incentives
- Follow-up engagement hooks
- Success celebration and next steps

## Technical Implementation Notes

### Current Architecture
- **Haskell Backend**: `TelegramBotHandler.hs` with step-by-step conversation flow
- **Session Management**: Map-based state tracking in `SessionState`
- **Data Collection**: 40+ individual steps collecting detailed user information
- **Plan Generation**: Integration with Helios engine for study plan creation

### Recommended Implementation Sequence

**Phase A: Foundation (Week 1)**
1. **Add progress tracking to `SessionState`** - Infrastructure for all progress indicators
2. **Implement 1.1 (Expectation Setting)** - Enhanced welcome flow with clear expectations
3. **Add progress indicators to existing questions** - Show completion percentage throughout
4. **Test enhanced welcome flow** - Validate user experience improvements

**Phase B: State Refactoring (Week 2)**
5. **Implement Enhanced Conversation States** - New state machine with fewer, smarter steps
6. **Migrate existing handlers** - Gradually move from 40+ steps to 8-10 conversational exchanges
7. **Add session persistence** - Enable pause/resume functionality

**Phase C: Smart Interactions (Week 3-4)**
8. **Implement 1.2 (Intelligent Question Grouping)** - Natural language parsing for multiple data points
9. **Add validation and fallback mechanisms** - Handle parsing failures gracefully
10. **Maintain backward compatibility** - Ensure existing data structure works

**Why this sequence:**
- Progress tracking enables immediate UX improvements
- Expectation setting provides instant user value
- State refactoring builds foundation for smart grouping
- Smart interactions are most complex and benefit from solid infrastructure

### Required Changes

#### 1. Enhanced Conversation States
```haskell
data ConversationStep 
  = WelcomeStep
  | BasicInfoStep
  | PlanPreviewStep
  | DetailedAssessmentStep
  | PlanRefinementStep
  | WhatIfStep
  | PaymentStep
  | CompleteStep
```

#### 2. Smart Question Handling
- Add natural language parsing for grouped questions
- Implement validation and fallback mechanisms
- Maintain backward compatibility with existing data structure

#### 3. Progress Tracking
```haskell
data SessionState = SessionState
  { currentStep :: ConversationStep
  , collectedAnswers :: Map Text Text
  , progressPercentage :: Int
  , planPreview :: Maybe StudyPlan
  , validationErrors :: [Text]
  }
```

#### 4. Plan Iteration System
- Multiple plan generation calls during conversation
- Diff tracking to show what changed
- Assumption management and validation

## Success Metrics

- **Completion Rate**: Target 85%+ (vs current ~60%)
- **Time to Complete**: 5-10 minutes (vs current 15-20 minutes)
- **User Satisfaction**: Feedback scores 4.5+ (measure engagement)
- **Conversion Rate**: Payment completion after plan generation
- **Referral Rate**: Users referring others after completion

## Key Transformations

### Before (Current)
- 40+ individual questions in sequence
- No progress indication
- No intermediate feedback
- Linear, rigid flow
- Plan only at the end

### After (Target)
- 8-10 conversational exchanges
- Clear progress indicators
- Multiple plan previews
- Flexible, engaging flow
- Iterative plan building
- What-if scenario exploration

## Implementation Priority

1. **Week 1-2**: Expectation setting and progress indicators
2. **Week 3-4**: Smart question grouping and parsing
3. **Week 5-6**: Early plan preview and progressive revelation
4. **Week 7-8**: Feedback integration and engagement features
5. **Week 9-10**: What-if scenarios and parameter variation
6. **Week 11-12**: Payment flow and referral system

## Notes

- Maintain existing data collection depth while improving UX
- Leverage current Haskell backend architecture
- Ensure backward compatibility during transition
- A/B test new flow against current implementation
- Monitor completion rates and user feedback closely
