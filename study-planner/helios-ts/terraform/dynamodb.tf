# DynamoDB Tables for UPSC Study Planner Subject Codes
# This Terraform configuration creates the required DynamoDB tables
# to replace the JSON files for subject codes, subtopics, prep modes, and archetypes

# UPSC Subjects Table
resource "aws_dynamodb_table" "upsc_subjects" {
  name           = "upsc-subjects"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "subject_code"

  attribute {
    name = "subject_code"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "exam_focus"
    type = "S"
  }

  global_secondary_index {
    name     = "CategoryIndex"
    hash_key = "category"
  }

  global_secondary_index {
    name     = "ExamFocusIndex"
    hash_key = "exam_focus"
  }

  tags = {
    Name        = "UPSC Subjects"
    Environment = "production"
    Project     = "study-planner"
  }
}

# Topics Table (normalized from subjects)
resource "aws_dynamodb_table" "upsc_topics" {
  name           = "upsc-topics"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "topic_code"

  attribute {
    name = "topic_code"
    type = "S"
  }

  attribute {
    name = "subject_code"
    type = "S"
  }

  attribute {
    name = "priority"
    type = "S"
  }

  global_secondary_index {
    name     = "SubjectIndex"
    hash_key = "subject_code"
  }

  global_secondary_index {
    name     = "PriorityIndex"
    hash_key = "priority"
  }

  tags = {
    Name        = "UPSC Topics"
    Environment = "production"
    Project     = "study-planner"
  }
}

# Subtopics Table
resource "aws_dynamodb_table" "upsc_subtopics" {
  name           = "upsc-subtopics"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "topic_code"
  range_key      = "subtopic_id"

  attribute {
    name = "topic_code"
    type = "S"
  }

  attribute {
    name = "subtopic_id"
    type = "S"
  }

  attribute {
    name = "priority_band"
    type = "S"
  }

  attribute {
    name = "exam"
    type = "S"
  }

  global_secondary_index {
    name     = "PriorityBandIndex"
    hash_key = "priority_band"
  }

  global_secondary_index {
    name     = "ExamIndex"
    hash_key = "exam"
  }

  tags = {
    Name        = "UPSC Subtopics"
    Environment = "production"
    Project     = "study-planner"
  }
}

# Prep Modes Table
resource "aws_dynamodb_table" "prep_modes" {
  name           = "prep-modes"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "mode_name"

  attribute {
    name = "mode_name"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  global_secondary_index {
    name     = "CategoryIndex"
    hash_key = "category"
  }

  tags = {
    Name        = "Prep Modes"
    Environment = "production"
    Project     = "study-planner"
  }
}

# Archetypes Table
resource "aws_dynamodb_table" "archetypes" {
  name           = "archetypes"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "archetype_name"

  attribute {
    name = "archetype_name"
    type = "S"
  }

  attribute {
    name = "time_commitment"
    type = "S"
  }

  global_secondary_index {
    name     = "TimeCommitmentIndex"
    hash_key = "time_commitment"
  }

  tags = {
    Name        = "Student Archetypes"
    Environment = "production"
    Project     = "study-planner"
  }
}

# NCERT Materials Table
resource "aws_dynamodb_table" "ncert_materials" {
  name           = "ncert-materials"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "topic_code"
  range_key      = "material_id"

  attribute {
    name = "topic_code"
    type = "S"
  }

  attribute {
    name = "material_id"
    type = "S"
  }

  attribute {
    name = "subject_code"
    type = "S"
  }

  attribute {
    name = "book_name"
    type = "S"
  }

  global_secondary_index {
    name     = "SubjectIndex"
    hash_key = "subject_code"
  }

  global_secondary_index {
    name     = "BookIndex"
    hash_key = "book_name"
  }

  tags = {
    Name        = "NCERT Materials"
    Environment = "production"
    Project     = "study-planner"
  }
}

# Configuration Table (for metadata like exam schedule, thresholds, etc.)
resource "aws_dynamodb_table" "study_planner_config" {
  name           = "study-planner-config"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "config_key"

  attribute {
    name = "config_key"
    type = "S"
  }

  tags = {
    Name        = "Study Planner Configuration"
    Environment = "production"
    Project     = "study-planner"
  }
}

# Output the table names for reference
output "dynamodb_table_names" {
  description = "Names of the created DynamoDB tables"
  value = {
    subjects       = aws_dynamodb_table.upsc_subjects.name
    topics         = aws_dynamodb_table.upsc_topics.name
    subtopics      = aws_dynamodb_table.upsc_subtopics.name
    prep_modes     = aws_dynamodb_table.prep_modes.name
    archetypes     = aws_dynamodb_table.archetypes.name
    ncert_materials = aws_dynamodb_table.ncert_materials.name
    config         = aws_dynamodb_table.study_planner_config.name
  }
}

# Output the table ARNs for reference
output "dynamodb_table_arns" {
  description = "ARNs of the created DynamoDB tables"
  value = {
    subjects       = aws_dynamodb_table.upsc_subjects.arn
    topics         = aws_dynamodb_table.upsc_topics.arn
    subtopics      = aws_dynamodb_table.upsc_subtopics.arn
    prep_modes     = aws_dynamodb_table.prep_modes.arn
    archetypes     = aws_dynamodb_table.archetypes.arn
    ncert_materials = aws_dynamodb_table.ncert_materials.arn
    config         = aws_dynamodb_table.study_planner_config.arn
  }
}