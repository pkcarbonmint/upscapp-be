#!/bin/bash

# Test script for document generation API endpoints
# Tests both DOCX and PDF export functionality

echo "=== Document Generation API Test ==="
echo "Testing DOCX and PDF export endpoints"
echo

# First, let's create a study plan through the database to get a valid study plan ID
# We'll use a simple SQL insert to create test data

echo "Step 1: Creating test study plan in database..."

# Connect to database and create a test study plan
PGPASSWORD=app psql -h localhost -U app -d app -c "
INSERT INTO study_plans (id, user_id, title, curated_resources, created_at, updated_at) 
VALUES (9999, '0bfd3139-1fc9-4f2c-b517-ee31b33aea87', 'Test Study Plan for Document Generation', 
        '{\"books\": [\"NCERT\"], \"online\": [\"Vision IAS\"]}', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    curated_resources = EXCLUDED.curated_resources,
    updated_at = NOW();
"

if [ $? -eq 0 ]; then
    echo "✅ Test study plan created with ID: 9999"
else
    echo "❌ Failed to create test study plan"
    exit 1
fi

echo
echo "Step 2: Creating test plan tasks..."

# Create some test plan tasks with cycle information
PGPASSWORD=app psql -h localhost -U app -d app -c "
INSERT INTO plan_tasks (studyplan_id, title, task_type, status, subject_area, duration_weeks, start_date, end_date, created_at, updated_at)
VALUES 
    (9999, 'Foundation Phase', 'study', 'pending', 'General Studies', 8, '2024-01-01', '2024-02-26', NOW(), NOW()),
    (9999, 'Prelims Preparation', 'practice', 'pending', 'Current Affairs', 12, '2024-02-27', '2024-05-20', NOW(), NOW()),
    (9999, 'Mains Preparation', 'test', 'pending', 'Optional Subject', 16, '2024-05-21', '2024-09-09', NOW(), NOW())
ON CONFLICT DO NOTHING;
"

if [ $? -eq 0 ]; then
    echo "✅ Test plan tasks created"
else
    echo "❌ Failed to create test plan tasks"
fi

echo
echo "Step 3: Testing DOCX export endpoint..."

# Test DOCX export
curl -s -X GET "http://localhost:8000/v2/helios/plan/9999/export/docx" \
     -H "Accept: application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
     -o "/tmp/test_study_plan.docx"

if [ $? -eq 0 ] && [ -f "/tmp/test_study_plan.docx" ]; then
    file_size=$(stat -c%s "/tmp/test_study_plan.docx" 2>/dev/null || stat -f%z "/tmp/test_study_plan.docx" 2>/dev/null)
    if [ "$file_size" -gt 0 ]; then
        echo "✅ DOCX export successful"
        echo "   File: /tmp/test_study_plan.docx"
        echo "   Size: $file_size bytes"
    else
        echo "❌ DOCX file created but is empty"
        echo "Response content:"
        cat "/tmp/test_study_plan.docx"
    fi
else
    echo "❌ DOCX export failed"
    echo "Trying to get error response:"
    curl -s -X GET "http://localhost:8000/v2/helios/plan/9999/export/docx"
fi

echo
echo "Step 4: Testing PDF export endpoint..."

# Test PDF export
curl -s -X GET "http://localhost:8000/v2/helios/plan/9999/export/pdf" \
     -H "Accept: application/pdf" \
     -o "/tmp/test_study_plan.pdf"

if [ $? -eq 0 ] && [ -f "/tmp/test_study_plan.pdf" ]; then
    file_size=$(stat -c%s "/tmp/test_study_plan.pdf" 2>/dev/null || stat -f%z "/tmp/test_study_plan.pdf" 2>/dev/null)
    if [ "$file_size" -gt 0 ]; then
        echo "✅ PDF export successful"
        echo "   File: /tmp/test_study_plan.pdf"
        echo "   Size: $file_size bytes"
    else
        echo "❌ PDF file created but is empty"
        echo "Response content:"
        cat "/tmp/test_study_plan.pdf"
    fi
else
    echo "❌ PDF export failed"
    echo "Trying to get error response:"
    curl -s -X GET "http://localhost:8000/v2/helios/plan/9999/export/pdf"
fi

echo
echo "=== Test Summary ==="

docx_success=false
pdf_success=false

if [ -f "/tmp/test_study_plan.docx" ] && [ -s "/tmp/test_study_plan.docx" ]; then
    docx_success=true
    echo "✅ DOCX: /tmp/test_study_plan.docx"
else
    echo "❌ DOCX: Failed"
fi

if [ -f "/tmp/test_study_plan.pdf" ] && [ -s "/tmp/test_study_plan.pdf" ]; then
    pdf_success=true
    echo "✅ PDF: /tmp/test_study_plan.pdf"
else
    echo "❌ PDF: Failed"
fi

if [ "$docx_success" = true ] && [ "$pdf_success" = true ]; then
    echo
    echo "🎉 All document generation tests passed!"
    exit 0
else
    echo
    echo "⚠️  Some tests failed. Check the error messages above."
    exit 1
fi
