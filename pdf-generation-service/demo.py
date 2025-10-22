#!/usr/bin/env python3
"""
Demo script showing how to use the PDF Generation Service.
This script demonstrates various ways to interact with the service.
"""

import requests
import json
import time
from datetime import datetime


def demo_basic_usage():
    """Demonstrate basic PDF generation."""
    print("🚀 PDF Generation Service Demo")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    # 1. Health Check
    print("\n1. Health Check...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"   ✅ Service Status: {health_data['status']}")
            print(f"   📊 Dependencies: {health_data['dependencies']}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Cannot connect to service: {e}")
        print("   💡 Make sure the service is running: python3 main.py")
        return
    
    # 2. Get Sample Data
    print("\n2. Getting Sample Data...")
    try:
        study_plan_response = requests.get(f"{base_url}/sample-data/study-plan")
        student_intake_response = requests.get(f"{base_url}/sample-data/student-intake")
        
        if study_plan_response.status_code == 200 and student_intake_response.status_code == 200:
            study_plan = study_plan_response.json()
            student_intake = student_intake_response.json()
            print(f"   ✅ Study Plan: {study_plan['plan_title']}")
            print(f"   ✅ Student: {student_intake['personal_details']['full_name']}")
        else:
            print("   ❌ Failed to get sample data")
            return
    except Exception as e:
        print(f"   ❌ Error getting sample data: {e}")
        return
    
    # 3. Generate PDF
    print("\n3. Generating PDF...")
    try:
        request_data = {
            "study_plan": study_plan,
            "student_intake": student_intake,
            "filename": f"demo-study-plan-{int(time.time())}.pdf"
        }
        
        start_time = time.time()
        response = requests.post(f"{base_url}/generate-pdf", json=request_data, timeout=60)
        generation_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ PDF Generated Successfully!")
            print(f"   📄 Filename: {result['filename']}")
            print(f"   📊 File Size: {result['file_size']:,} bytes")
            print(f"   ⏱️  Generation Time: {result['generation_time']:.2f}s")
            print(f"   🌐 Total Request Time: {generation_time:.2f}s")
        else:
            print(f"   ❌ PDF generation failed: {response.status_code}")
            print(f"   📝 Error: {response.text}")
            return
    except Exception as e:
        print(f"   ❌ Error generating PDF: {e}")
        return
    
    # 4. Download PDF
    print("\n4. Downloading PDF...")
    try:
        download_response = requests.post(f"{base_url}/generate-pdf-download", json=request_data, timeout=60)
        
        if download_response.status_code == 200:
            filename = f"downloaded-{request_data['filename']}"
            with open(filename, 'wb') as f:
                f.write(download_response.content)
            
            print(f"   ✅ PDF Downloaded: {filename}")
            print(f"   📊 Size: {len(download_response.content):,} bytes")
        else:
            print(f"   ❌ Download failed: {download_response.status_code}")
    except Exception as e:
        print(f"   ❌ Error downloading PDF: {e}")
    
    # 5. Test Quick Generate
    print("\n5. Quick Test Generate...")
    try:
        quick_response = requests.post(f"{base_url}/test-generate", timeout=60)
        
        if quick_response.status_code == 200:
            filename = f"quick-test-{int(time.time())}.pdf"
            with open(filename, 'wb') as f:
                f.write(quick_response.content)
            
            print(f"   ✅ Quick PDF Generated: {filename}")
            print(f"   📊 Size: {len(quick_response.content):,} bytes")
        else:
            print(f"   ❌ Quick generation failed: {quick_response.status_code}")
    except Exception as e:
        print(f"   ❌ Error in quick generation: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Demo Complete!")
    print("\n💡 Tips:")
    print("   • View generated PDFs with any PDF viewer")
    print("   • Check the API docs at http://localhost:8000/docs")
    print("   • Customize the data in the request for different outputs")
    print("   • Use the streaming endpoint for large documents")


def demo_custom_data():
    """Demonstrate PDF generation with custom data."""
    print("\n🎨 Custom Data Demo")
    print("=" * 30)
    
    base_url = "http://localhost:8000"
    
    # Create custom study plan data
    custom_study_plan = {
        "targeted_year": 2026,
        "start_date": "2024-01-01",
        "study_plan_id": "custom-plan-001",
        "user_id": "demo-user",
        "plan_title": "Custom UPSC 2026 Intensive Study Plan",
        "curated_resources": {"essential_resources": []},
        "cycles": [
            {
                "cycleId": "custom-cycle-001",
                "cycleType": "C1",
                "cycleIntensity": "Foundation",
                "cycleDuration": 16,
                "cycleOrder": 1,
                "cycleName": "Intensive Foundation Cycle",
                "cycleBlocks": [
                    {
                        "block_id": "custom-block-001",
                        "block_title": "Ancient & Medieval History Mastery",
                        "subjects": ["Ancient History", "Medieval History", "Art & Culture"],
                        "duration_weeks": 6,
                        "weekly_plan": [],
                        "block_resources": {
                            "primary_books": [],
                            "supplementary_materials": [],
                            "practice_resources": [],
                            "video_content": [],
                            "current_affairs_sources": [],
                            "revision_materials": [],
                            "expert_recommendations": []
                        },
                        "block_start_date": "2024-01-01",
                        "block_end_date": "2024-02-15"
                    },
                    {
                        "block_id": "custom-block-002",
                        "block_title": "Geography & Environment Deep Dive",
                        "subjects": ["Physical Geography", "Human Geography", "Environment & Ecology"],
                        "duration_weeks": 6,
                        "weekly_plan": [],
                        "block_resources": {
                            "primary_books": [],
                            "supplementary_materials": [],
                            "practice_resources": [],
                            "video_content": [],
                            "current_affairs_sources": [],
                            "revision_materials": [],
                            "expert_recommendations": []
                        },
                        "block_start_date": "2024-02-16",
                        "block_end_date": "2024-03-31"
                    }
                ],
                "cycleDescription": "Intensive foundation building with focus on conceptual clarity",
                "cycleStartDate": "2024-01-01",
                "cycleEndDate": "2024-03-31"
            },
            {
                "cycleId": "custom-cycle-002",
                "cycleType": "C4",
                "cycleIntensity": "PreExam",
                "cycleDuration": 12,
                "cycleOrder": 2,
                "cycleName": "Prelims Intensive Reading",
                "cycleBlocks": [
                    {
                        "block_id": "custom-block-003",
                        "block_title": "Polity & Governance Mastery",
                        "subjects": ["Indian Polity", "Governance", "Constitutional Law"],
                        "duration_weeks": 4,
                        "weekly_plan": [],
                        "block_resources": {
                            "primary_books": [],
                            "supplementary_materials": [],
                            "practice_resources": [],
                            "video_content": [],
                            "current_affairs_sources": [],
                            "revision_materials": [],
                            "expert_recommendations": []
                        },
                        "block_start_date": "2025-01-01",
                        "block_end_date": "2025-01-31"
                    }
                ],
                "cycleDescription": "High-intensity prelims preparation with extensive practice",
                "cycleStartDate": "2025-01-01",
                "cycleEndDate": "2025-03-31"
            }
        ]
    }
    
    # Create custom student data
    custom_student = {
        "subject_confidence": {
            "History": "Strong",
            "Geography": "Moderate",
            "Polity": "VeryStrong",
            "Economics": "Weak"
        },
        "study_strategy": {
            "study_focus_combo": "OneGSPlusOptional",
            "weekly_study_hours": "60-70",
            "time_distribution": "PracticeHeavy",
            "study_approach": "WeakFirst",
            "revision_strategy": "Intensive",
            "test_frequency": "Daily",
            "seasonal_windows": ["Morning", "Afternoon", "Evening"],
            "catch_up_day_preference": "Sunday",
            "optional_first_preference": True,
            "upsc_optional_subject": "Psychology",
            "weekly_test_day_preference": "Saturday"
        },
        "target_year": "2026",
        "start_date": "2024-01-01",
        "personal_details": {
            "full_name": "Aarav Kumar Singh",
            "email": "aarav.singh@example.com",
            "phone_number": "+91-9876543210",
            "present_location": "Mumbai, Maharashtra",
            "student_archetype": "Intensive Full-Timer",
            "graduation_stream": "Psychology",
            "college_university": "University of Mumbai",
            "year_of_passing": 2023
        },
        "preparation_background": {
            "preparing_since": "1 year",
            "number_of_attempts": "1",
            "highest_stage_per_attempt": "Prelims Qualified"
        },
        "optional_subject": {
            "optional_subject_name": "Psychology",
            "optional_status": "Confident",
            "optional_taken_from": "Graduation"
        }
    }
    
    # Generate PDF with custom data
    try:
        request_data = {
            "study_plan": custom_study_plan,
            "student_intake": custom_student,
            "filename": f"custom-intensive-plan-{int(time.time())}.pdf"
        }
        
        print("   📝 Generating custom PDF...")
        start_time = time.time()
        response = requests.post(f"{base_url}/generate-pdf-download", json=request_data, timeout=60)
        generation_time = time.time() - start_time
        
        if response.status_code == 200:
            filename = f"custom-{request_data['filename']}"
            with open(filename, 'wb') as f:
                f.write(response.content)
            
            print(f"   ✅ Custom PDF Generated: {filename}")
            print(f"   👤 Student: {custom_student['personal_details']['full_name']}")
            print(f"   📚 Plan: {custom_study_plan['plan_title']}")
            print(f"   📊 Size: {len(response.content):,} bytes")
            print(f"   ⏱️  Time: {generation_time:.2f}s")
        else:
            print(f"   ❌ Custom generation failed: {response.status_code}")
            print(f"   📝 Error: {response.text}")
    
    except Exception as e:
        print(f"   ❌ Error generating custom PDF: {e}")


if __name__ == "__main__":
    # Run basic demo
    demo_basic_usage()
    
    # Run custom data demo
    demo_custom_data()
    
    print("\n🔗 Next Steps:")
    print("   • Integrate with your application using the REST API")
    print("   • Customize the PDF styling in pdf_generator.py")
    print("   • Add more cycle types and colors as needed")
    print("   • Deploy using Docker for production use")
    print("   • Check the comprehensive README.md for more details")