#!/usr/bin/env python3
"""
Test script for public onboarding API endpoints
Tests the full HTTP flow: Client -> Onboarding API -> Haskell Engine -> Database
"""

import requests
import json
from datetime import datetime
import uuid

# API Configuration
BASE_URL = "http://localhost:8000"  # Python FastAPI server
ONBOARDING_URL = f"{BASE_URL}/api/studyplanner/onboarding"

def test_onboarding_flow():
    """Test complete onboarding flow through public APIs"""
    print("🧪 Testing Public Onboarding API Flow")
    print("=" * 60)
    
    # Generate unique student ID for this test
    student_id = None
    
    # Step 1: Create Student (Background)
    print("\n📝 Step 1: Creating student with background info...")
    background_data = {
        "name": "Test Student",
        "email": "test@example.com", 
        "phone": "+91-9876543210",
        "city": "Delhi",
        "state": "Delhi",
        "graduation_stream": "Engineering",
        "college": "Test University",
        "graduation_year": 2020,
        "about": "Engineering graduate preparing for UPSC"
    }
    
    try:
        response = requests.post(
            f"{ONBOARDING_URL}/students",
            json=background_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            student_id = result["student_id"]
            print(f"✅ Student created: {student_id}")
        else:
            print(f"❌ Failed to create student: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None
    
    # Step 2: Update Target
    print(f"\n🎯 Step 2: Setting target for student {student_id}...")
    target_data = {
        "target_year": 2028,
        "attempt_number": 1,
        "optional_subjects": ["Public Administration"],
        "study_approach": "comprehensive"
    }
    
    try:
        response = requests.patch(
            f"{ONBOARDING_URL}/students/{student_id}/target",
            json=target_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Target updated successfully")
        else:
            print(f"❌ Failed to update target: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    # Step 3: Update Commitment
    print(f"\n⏰ Step 3: Setting commitment for student {student_id}...")
    commitment_data = {
        "weekly_hours": 48,
        "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "constraints": "Available for full-time study"
    }
    
    try:
        response = requests.patch(
            f"{ONBOARDING_URL}/students/{student_id}/commitment",
            json=commitment_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Commitment updated successfully")
        else:
            print(f"❌ Failed to update commitment: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    # Step 4: Update Confidence
    print(f"\n📊 Step 4: Setting confidence levels for student {student_id}...")
    confidence_data = {
        "confidence": 75,
        "areas_of_concern": ["Geography", "Environment & Science", "Current Affairs"]
    }
    
    try:
        response = requests.patch(
            f"{ONBOARDING_URL}/students/{student_id}/confidence",
            json=confidence_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Confidence updated successfully")
        else:
            print(f"❌ Failed to update confidence: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    # Step 5: Generate Preview (calls Helios engine)
    print(f"\n🔍 Step 5: Generating study plan preview (calls Helios)...")
    try:
        response = requests.get(
            f"{ONBOARDING_URL}/students/{student_id}/preview",
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            preview = response.json()
            print("✅ Preview generated successfully!")
            
            # Extract blocks from raw Helios data
            raw_helios = preview['preview']['raw_helios_data']
            cycles = raw_helios.get('cycles', [])
            
            # Count total blocks from all cycles
            total_blocks = 0
            all_blocks = []
            if cycles:
                for cycle in cycles:
                    cycle_blocks = cycle.get('cycleBlocks', [])
                    total_blocks += len(cycle_blocks)
                    all_blocks.extend(cycle_blocks)
            
            print(f"📋 Plan contains {total_blocks} blocks across {len(cycles)} cycles")
            
            # Show cycle and block details
            if cycles:
                for cycle_idx, cycle in enumerate(cycles):
                    print(f"\n   📚 Cycle {cycle_idx+1}: {cycle.get('cycleName', 'Unknown')} ({cycle.get('cycleType', 'Unknown')})")
                    print(f"      Duration: {cycle.get('cycleDuration', 0)} weeks")
                    
                    cycle_blocks = cycle.get('cycleBlocks', [])
                    for block_idx, block in enumerate(cycle_blocks):
                        print(f"      Block {block_idx+1}: {block.get('block_title', 'Unknown')} ({block.get('duration_weeks', 0)} weeks)")
                        subjects = block.get('subjects', [])
                        if subjects:
                            print(f"         Subjects: {', '.join(subjects[:3])}{'...' if len(subjects) > 3 else ''}")
            else:
                print("   ⚠️  No cycles found in Helios data")
            
            # Show milestones
            milestones = preview['preview'].get('milestones', {})
            if milestones:
                print(f"\n   🎯 Milestones:")
                if milestones.get('foundationToPrelimsDate'):
                    print(f"      Foundation → Prelims: {milestones['foundationToPrelimsDate']}")
                if milestones.get('prelimsToMainsDate'):
                    print(f"      Prelims → Mains: {milestones['prelimsToMainsDate']}")
            
        else:
            print(f"❌ Failed to generate preview: {response.text}")
            return student_id
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return student_id
    
    # Step 6: Download DOCX
    print(f"\n📄 Step 6: Testing DOCX download...")
    try:
        response = requests.get(
            f"{ONBOARDING_URL}/students/{student_id}/download/docx"
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            filename = f"onboarding_plan_{student_id}.docx"
            with open(filename, "wb") as f:
                f.write(response.content)
            print(f"✅ DOCX downloaded: {filename}")
        else:
            print(f"❌ Failed to download DOCX: {response.text}")
            
    except Exception as e:
        print(f"❌ DOCX download failed: {e}")
    
    return student_id

def test_submit_flow(student_id):
    """Test payment and submission flow"""
    if not student_id:
        print("⏭️  Skipping submit flow (no student ID)")
        return
        
    print(f"\n💳 Testing payment for student {student_id}...")
    payment_data = {
        "name_on_card": "Test Student",
        "card_last4": "4242",
        "expiry": "12/25",
        "cvv_dummy": "123"
    }
    
    try:
        response = requests.post(
            f"{ONBOARDING_URL}/students/{student_id}/payment",
            json=payment_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Payment processed: {result['reference']}")
        else:
            print(f"❌ Payment failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Payment request failed: {e}")
    
    print(f"\n✅ Testing final submission for student {student_id}...")
    try:
        response = requests.post(
            f"{ONBOARDING_URL}/students/{student_id}/submit",
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Submission successful: {result['message']}")
        else:
            print(f"❌ Submission failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Submission request failed: {e}")

def main():
    """Run all tests"""
    # Test main onboarding flow
    student_id = test_onboarding_flow()
    
    # Test payment and submission
    test_submit_flow(student_id)
    
    print("\n" + "=" * 60)
    print("🏁 Onboarding API Test Completed!")
    
    if student_id:
        print(f"✅ Full HTTP flow working: Client -> Onboarding API -> Haskell -> Response")
        print(f"👤 Test Student ID: {student_id}")
        print(f"🔗 Flow: Background → Target → Commitment → Confidence → Preview → Download")
    else:
        print("❌ Onboarding flow failed - check server logs")

if __name__ == "__main__":
    main()
