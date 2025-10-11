"""
Constants and state definitions for the Telegram bot.
"""

# Conversation states
(PERSONAL_NAME, PERSONAL_EMAIL, PERSONAL_PHONE, PERSONAL_LOCATION, PERSONAL_STATUS,
 PERSONAL_GRADUATION, PERSONAL_COLLEGE, PERSONAL_YEAR,
 PREP_DURATION, PREP_TARGET_YEAR, PREP_ATTEMPTS, PREP_HIGHEST_STAGE,
 PREP_PRELIMS_SCORE, PREP_CSAT_SCORE, PREP_WROTE_MAINS, PREP_MAINS_MARKS,
 COACHING_PRIOR, COACHING_INSTITUTE, COACHING_MENTORSHIP, COACHING_MENTOR_NAME, COACHING_PLACE,
 OPTIONAL_SUBJECT, OPTIONAL_STATUS, OPTIONAL_FROM,
 TEST_SERIES, TEST_CSAT_ASSESSMENT, TEST_CSAT_WEAK,
 SYLLABUS_GS, SYLLABUS_OPTIONAL, SYLLABUS_PYQ,
 CONFIDENCE_HISTORY, CONFIDENCE_GEOGRAPHY, CONFIDENCE_POLITY, CONFIDENCE_ECONOMICS,
 CONFIDENCE_SCIENCE, CONFIDENCE_ENVIRONMENT, CONFIDENCE_CURRENT_AFFAIRS, CONFIDENCE_CSAT,
 CONFIDENCE_GS1_HISTORY, CONFIDENCE_GS1_GEOGRAPHY, CONFIDENCE_GS1_CULTURE, CONFIDENCE_GS1_SOCIETY,
 CONFIDENCE_GS1_POST_INDEPENDENCE, CONFIDENCE_GS1_WORLD_HISTORY, CONFIDENCE_GS1_ART_CULTURE,
 CONFIDENCE_GS2_CONSTITUTION, CONFIDENCE_GS2_GOVERNANCE, CONFIDENCE_GS2_SOCIAL_JUSTICE, 
 CONFIDENCE_GS2_INTERNATIONAL, CONFIDENCE_GS2_BILATERAL,
 CONFIDENCE_GS3_ECONOMICS, CONFIDENCE_GS3_AGRICULTURE, CONFIDENCE_GS3_TECHNOLOGY,
 CONFIDENCE_GS3_ENVIRONMENT, CONFIDENCE_GS3_SECURITY, CONFIDENCE_GS3_DISASTER,
 CONFIDENCE_GS4_ETHICS, CONFIDENCE_GS4_INTEGRITY, CONFIDENCE_OPTIONAL_SUBJECT,
 STRATEGY_FOCUS, STRATEGY_HOURS, STRATEGY_DISTRIBUTION, STRATEGY_APPROACH,
 STRATEGY_REVISION, STRATEGY_TESTING, STRATEGY_RESOURCES, STRATEGY_MOTIVATION,
 GENERATING_PLAN) = range(68)

# Confidence levels
CONFIDENCE_LEVELS = [
    ['Not Started', 'Very Weak'],
    ['Weak', 'Moderate'],
    ['Strong', 'Very Strong']
]

# Subject mapping for confidence assessment
CONFIDENCE_SUBJECTS = [
    ('Current Events (Prelims)', 'current_events'),
    ('History of India (Prelims)', 'history'),
    ('Geography (Prelims)', 'geography'),
    ('Polity & Governance (Prelims)', 'polity'),
    ('Economy & Social Development (Prelims)', 'economy'),
    ('Environment & Ecology (Prelims)', 'environment'),
    ('Science & Technology (Prelims)', 'science_technology'),
    ('CSAT', 'csat'),
    ('Essay Writing', 'essay'),
    ('Indian Culture', 'indian_culture'),
    ('Modern History', 'modern_history'),
    ('World History', 'world_history'),
    ('Post Independence India', 'post_independence'),
    ('Indian Society', 'indian_society'),
    ('Constitution', 'constitution'),
    ('Governance', 'governance'),
    ('Social Justice', 'social_justice'),
    ('International Relations', 'international_relations'),
    ('Economy (Mains)', 'eco_mains'),
    ('Agriculture', 'agriculture'),
    ('Environment (Mains)', 'env_mains'),
    ('Science & Technology (Mains)', 'sci_mains'),
    ('Disaster Management', 'disaster_management'),
    ('Internal Security', 'internal_security'),
    ('Ethics, Integrity & Aptitude', 'ethics'),
    ('Optional Subject Paper 1', 'optional_paper1'),
    ('Optional Subject Paper 2', 'optional_paper2')
]

# Study strategy options
STUDY_FOCUS_OPTIONS = [
    ['GS (Prelims + Mains) only'],
    ['GS + Optional'],
    ['GS + Optional + CSAT + Current Affairs']
]

STUDY_HOURS_OPTIONS = [
    ['Less than 20 hours', '20-30 hours'],
    ['30-40 hours', '40-50 hours'],
    ['50+ hours']
]

TIME_DISTRIBUTION_OPTIONS = [
    ['Prelims Heavy', 'Mains Heavy'],
    ['Balanced', 'Optional Heavy']
]

STUDY_APPROACH_OPTIONS = [
    ['Weak subjects first'],
    ['Strong subjects first'],
    ['Balanced (macro subject + micro subject in rotation)']
]

REVISION_STRATEGY_OPTIONS = [
    ['Daily', 'Weekly'],
    ['Monthly', 'Before Tests Only']
]

TEST_FREQUENCY_OPTIONS = [
    ['Daily', 'Weekly'],
    ['Bi-weekly', 'Monthly']
]

CATCHUP_DAY_OPTIONS = [
    ['Monday', 'Tuesday', 'Wednesday'],
    ['Thursday', 'Friday', 'Saturday', 'Sunday']
]
