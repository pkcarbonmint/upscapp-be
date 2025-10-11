#!/bin/bash

# Simple Onboarding Wizard Test Script
# Tests core API functionality step by step

BASE_URL="http://localhost:3000/api/studyplanner/onboarding"
STUDENT_ID=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing Onboarding Wizard API${NC}\n"

# Test 1: Create Student
echo -e "${YELLOW}[1/4]${NC} Creating student..."
response=$(curl -s -X POST "$BASE_URL/students" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Student",
    "phone": "+919876543210", 
    "email": "test@example.com",
    "city": "Mumbai",
    "state": "Maharashtra",
    "graduation_stream": "Engineering",
    "college": "IIT Bombay",
    "graduation_year": 2023,
    "about": "Test student for API validation"
  }')

if echo "$response" | grep -q "student_id"; then
    STUDENT_ID=$(echo "$response" | grep -o '"student_id":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Student created: $STUDENT_ID${NC}"
else
    echo -e "${RED}❌ Failed to create student${NC}"
    echo "$response"
    exit 1
fi

# Test 2: Update Target
echo -e "${YELLOW}[2/4]${NC} Updating target information..."
response=$(curl -s -X PATCH "$BASE_URL/students/$STUDENT_ID/target" \
  -H "Content-Type: application/json" \
  -d '{
    "target_year": 2025,
    "attempt_number": 1,
    "optional_subjects": ["Geography"],
    "study_approach": "comprehensive"
  }')

if echo "$response" | grep -q "updated.*true"; then
    echo -e "${GREEN}✅ Target updated${NC}"
else
    echo -e "${RED}❌ Failed to update target${NC}"
    echo "$response"
fi

# Test 3: Update Commitment  
echo -e "${YELLOW}[3/4]${NC} Updating commitment information..."
response=$(curl -s -X PATCH "$BASE_URL/students/$STUDENT_ID/commitment" \
  -H "Content-Type: application/json" \
  -d '{
    "weekly_hours": 40,
    "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "constraints": "Evening study preferred"
  }')

if echo "$response" | grep -q "updated.*true"; then
    echo -e "${GREEN}✅ Commitment updated${NC}"
else
    echo -e "${RED}❌ Failed to update commitment${NC}"
    echo "$response"
fi

# Test 4: Update Confidence
echo -e "${YELLOW}[4/4]${NC} Updating confidence information..."
response=$(curl -s -X PATCH "$BASE_URL/students/$STUDENT_ID/confidence" \
  -H "Content-Type: application/json" \
  -d '{
    "confidence": 70,
    "areas_of_concern": ["Current Affairs", "Essay Writing"]
  }')

if echo "$response" | grep -q "updated.*true"; then
    echo -e "${GREEN}✅ Confidence updated${NC}"
else
    echo -e "${RED}❌ Failed to update confidence${NC}"
    echo "$response"
fi

# Verify in Database
echo -e "\n${BLUE}📊 Database Verification${NC}"
docker-compose exec -T app_db psql -U app -d app -c "
SELECT 
    id,
    background->>'name' as name,
    background->>'email' as email,
    target->>'target_year' as target_year,
    commitment->>'weekly_hours' as weekly_hours,
    confidence->>'confidence' as confidence_level
FROM onboarding_students 
WHERE id = '$STUDENT_ID';" 2>/dev/null

echo -e "\n${GREEN}🎉 Wizard API test completed!${NC}"
echo -e "${BLUE}Student ID:${NC} $STUDENT_ID"
