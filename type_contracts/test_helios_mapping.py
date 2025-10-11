#!/usr/bin/env python3
"""
Test Helios Mapping - Validate Python to UIWizardData transformation
"""

import sys
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

try:
    from src.modules.studyplanner.onboarding.helios_mapper import HeliosDataMapper, map_student_to_helios
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def create_test_student_data():
    """Create comprehensive test student data"""
    return {
        "background": {
            "name": "Priya Sharma",
            "phone": "9876543210",
            "email": "priya.sharma@example.com",
            "city": "Delhi",
            "state": "Delhi",
            "graduation_stream": "Political Science",
            "college": "Delhi University",
            "graduation_year": 2023,
            "about": "Aspiring civil servant with strong academic background"
        },
        "target": {
            "exam": "UPSC CSE",
            "target_year": 2026,
            "optional_subject": "Public Administration",
            "preferred_language": "English"
        },
        "commitment": {
            "study_hours_per_day": 10,
            "study_days_per_week": 6,
            "start_date": "2025-02-01",
            "flexibility": "medium"
        },
        "confidence": {
            "general_studies_1": "high",
            "general_studies_2": "medium",
            "general_studies_3": "low",
            "general_studies_4": "medium",
            "optional_subject": "high",
            "essay": "medium",
            "csat": "high"
        }
    }

def test_mapping_completeness():
    """Test that all required UIWizardData fields are mapped"""
    print("🔍 Testing mapping completeness...")
    
    student_data = create_test_student_data()
    mapper = HeliosDataMapper()
    
    try:
        uiwizard_data = mapper.map_onboarding_to_uiwizard(student_data)
        
        # Check top-level structure
        required_fields = [
            "personal_and_academic_details",
            "preparation_background",
            "coaching_and_mentorship",
            "optional_subject_details", 
            "test_series_and_csat",
            "syllabus_and_pyq_awareness",
            "subject_confidence",
            "study_strategy"
        ]
        
        for field in required_fields:
            if field not in uiwizard_data:
                print(f"❌ Missing field: {field}")
                return False
            print(f"✅ {field}")
        
        # Check nested confidence structure
        subject_conf = uiwizard_data["subject_confidence"]
        confidence_sections = [
            "prelims_confidence",
            "mains_gs1_confidence",
            "mains_gs2_confidence", 
            "mains_gs3_confidence",
            "mains_gs4_optional_confidence"
        ]
        
        for section in confidence_sections:
            if section not in subject_conf:
                print(f"❌ Missing confidence section: {section}")
                return False
            print(f"✅ {section}")
        
        print("✅ Mapping completeness: PASS")
        return True
        
    except Exception as e:
        print(f"❌ Mapping failed: {e}")
        return False

def test_data_accuracy():
    """Test that mapped data preserves original values correctly"""
    print("\n🔍 Testing data accuracy...")
    
    student_data = create_test_student_data()
    uiwizard_data = map_student_to_helios(student_data)
    
    # Test personal details mapping
    personal = uiwizard_data["personal_and_academic_details"]
    background = student_data["background"]
    
    checks = [
        (personal["full_name"], background["name"], "name mapping"),
        (personal["email"], background["email"], "email mapping"),
        (personal["phone_number"], background["phone"], "phone mapping"),
        (personal["graduation_stream"], background["graduation_stream"], "graduation stream mapping"),
        (personal["year_of_passing"], background["graduation_year"], "graduation year mapping")
    ]
    
    for actual, expected, description in checks:
        if actual == expected:
            print(f"✅ {description}")
        else:
            print(f"❌ {description}: expected {expected}, got {actual}")
            return False
    
    # Test confidence mapping
    confidence = uiwizard_data["subject_confidence"]
    original_conf = student_data["confidence"]
    
    # Check that confidence levels are properly mapped
    gs1_conf = confidence["mains_gs1_confidence"]["gs1_essay"]
    expected_essay = "Medium"  # medium -> Medium
    if gs1_conf == expected_essay:
        print("✅ Confidence level mapping")
    else:
        print(f"❌ Confidence mapping: expected {expected_essay}, got {gs1_conf}")
        return False
    
    print("✅ Data accuracy: PASS")
    return True

def test_json_serialization():
    """Test that mapped data can be JSON serialized for HTTP"""
    print("\n🔍 Testing JSON serialization...")
    
    student_data = create_test_student_data()
    uiwizard_data = map_student_to_helios(student_data)
    
    try:
        json_str = json.dumps(uiwizard_data, indent=2)
        parsed_back = json.loads(json_str)
        
        if parsed_back == uiwizard_data:
            print("✅ JSON serialization: PASS")
            return True
        else:
            print("❌ JSON round-trip failed")
            return False
            
    except Exception as e:
        print(f"❌ JSON serialization failed: {e}")
        return False

def test_validation():
    """Test built-in validation"""
    print("\n🔍 Testing validation...")
    
    student_data = create_test_student_data()
    mapper = HeliosDataMapper()
    uiwizard_data = mapper.map_onboarding_to_uiwizard(student_data)
    
    if mapper.validate_uiwizard_data(uiwizard_data):
        print("✅ Validation: PASS")
        return True
    else:
        print("❌ Validation: FAIL")
        return False

def print_sample_output():
    """Print sample mapped output for inspection"""
    print("\n📋 Sample UIWizardData output:")
    print("=" * 50)
    
    student_data = create_test_student_data()
    uiwizard_data = map_student_to_helios(student_data)
    
    print(json.dumps(uiwizard_data, indent=2))

def main():
    """Run all mapping tests"""
    print("🚀 Testing Python → Helios UIWizardData mapping")
    print("=" * 60)
    
    tests = [
        test_mapping_completeness,
        test_data_accuracy,
        test_json_serialization,
        test_validation
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    print("\n" + "=" * 60)
    if all(results):
        print("🎯 All mapping tests: PASS")
        print_sample_output()
        return True
    else:
        print("❌ Some mapping tests failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
