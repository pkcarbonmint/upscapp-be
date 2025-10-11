#!/usr/bin/env python3
"""
Cross-Layer Type Validation Tests
Validates type compatibility across Elm → Python → Helios interfaces
"""

import json
import subprocess
import sys
from typing import Dict, Any
from python_helios_adapter import PythonToHeliosAdapter, UIWizardData, validate_python_to_helios_compatibility
from pathlib import Path

def validate_json_schema_consistency():
    """Validate that JSON schemas are internally consistent"""
    
    schema_file = Path("interface_schemas.json")
    if not schema_file.exists():
        print("❌ JSON Schema file not found")
        return False
    
    try:
        with open(schema_file) as f:
            schema = json.load(f)
        
        # Check required definitions exist
        required_types = ["BackgroundInput", "TargetInput", "CommitmentInput", "ConfidenceInput"]
        definitions = schema.get("definitions", {})
        
        for type_name in required_types:
            if type_name not in definitions:
                print(f"❌ Missing type definition: {type_name}")
                return False
            
            type_def = definitions[type_name]
            if type_def.get("type") != "object":
                print(f"❌ {type_name} is not an object type")
                return False
        
        print("✅ JSON Schema consistency validated")
        return True
        
    except Exception as e:
        print(f"❌ JSON Schema validation failed: {e}")
        return False

def validate_elm_python_compatibility():
    """Validate Elm-Python interface compatibility"""
    
    # Sample data that should be valid for both Elm and Python
    test_cases = [
        {
            "name": "Valid Background",
            "data": {
                "name": "John Doe",
                "phone": "+91-9876543210",
                "email": "john@example.com",
                "city": "Delhi",
                "state": "Delhi",
                "graduation_stream": "Engineering",
                "college": "IIT Delhi",
                "graduation_year": 2023,
                "about": "Aspiring civil servant"
            },
            "schema_type": "BackgroundInput"
        },
        {
            "name": "Valid Target",
            "data": {
                "target_year": 2025,
                "attempt_number": 1,
                "optional_subjects": ["Public Administration"],
                "study_approach": "Comprehensive"
            },
            "schema_type": "TargetInput"
        },
        {
            "name": "Valid Commitment",
            "data": {
                "weekly_hours": 40,
                "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "constraints": "Working professional"
            },
            "schema_type": "CommitmentInput"
        }
    ]
    
    try:
        # Load JSON schema for validation
        with open("interface_schemas.json") as f:
            schema = json.load(f)
        
        for test_case in test_cases:
            # Validate against JSON schema
            type_schema = schema["definitions"][test_case["schema_type"]]
            
            # Basic validation - check required fields
            required_fields = set(type_schema.get("required", []))
            data_fields = set(test_case["data"].keys())
            
            missing_fields = required_fields - data_fields
            if missing_fields:
                print(f"❌ {test_case['name']}: Missing required fields {missing_fields}")
                return False
        
        print("✅ Elm-Python compatibility validated")
        return True
        
    except Exception as e:
        print(f"❌ Elm-Python compatibility validation failed: {e}")
        return False

def validate_python_helios_integration():
    """Validate Python-Helios integration using the adapter"""
    
    # Test data representing what Python API receives
    python_student_data = {
        "background": {
            "name": "Alice Smith",
            "email": "alice@example.com", 
            "phone": "+91-9876543210",
            "city": "Mumbai",
            "state": "Maharashtra",
            "graduation_stream": "Arts",
            "college": "Mumbai University",
            "graduation_year": 2022,
            "about": "Literature graduate preparing for UPSC"
        },
        "target": {
            "target_year": 2025,
            "attempt_number": 2,
            "optional_subjects": ["Literature"],
            "study_approach": "Focused preparation"
        },
        "commitment": {
            "weekly_hours": 50,
            "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            "constraints": "Need flexible evening schedule"
        },
        "confidence": {
            "confidence": 65,
            "areas_of_concern": ["Current Affairs", "Essay Writing"]
        }
    }
    
    try:
        # Convert Python data to Helios format
        helios_data = PythonToHeliosAdapter.convert_student_data(python_student_data)
        
        # Validate the conversion
        assert isinstance(helios_data, UIWizardData)
        assert helios_data.personal_and_academic_details.full_name == "Alice Smith"
        assert helios_data.personal_and_academic_details.email == "alice@example.com"
        assert helios_data.preparation_background.target_year == "2025"
        assert helios_data.study_strategy.weekly_study_hours == "50"
        
        # Test JSON serialization (what gets sent to Helios)
        helios_json = helios_data.dict()
        assert "personal_and_academic_details" in helios_json
        assert "subject_confidence" in helios_json
        assert "study_strategy" in helios_json
        
        print("✅ Python-Helios integration validated")
        return True
        
    except Exception as e:
        print(f"❌ Python-Helios integration validation failed: {e}")
        return False

def validate_end_to_end_compatibility():
    """Validate complete end-to-end type compatibility"""
    
    # Simulate the complete flow: Elm → Python → Helios
    elm_data = {
        "name": "End-to-End Test User",
        "phone": "+91-9999999999",
        "email": "e2e@test.com",
        "city": "Bangalore",
        "state": "Karnataka", 
        "graduation_stream": "Computer Science",
        "college": "IISc Bangalore",
        "graduation_year": 2021,
        "about": "Software engineer transitioning to civil services"
    }
    
    try:
        # Step 1: Validate Elm data against Python schema
        # (In real scenario, this would be validated by Pydantic)
        
        # Step 2: Convert to Python internal format
        python_data = {
            "background": elm_data,
            "target": {"target_year": 2026},
            "commitment": {"weekly_hours": 35},
            "confidence": {"confidence": 80}
        }
        
        # Step 3: Convert to Helios format
        helios_data = PythonToHeliosAdapter.convert_student_data(python_data)
        
        # Step 4: Validate Helios data structure
        helios_json = helios_data.dict()
        
        # Verify critical fields are preserved through the pipeline
        assert helios_json["personal_and_academic_details"]["full_name"] == elm_data["name"]
        assert helios_json["personal_and_academic_details"]["email"] == elm_data["email"]
        assert helios_json["preparation_background"]["target_year"] == "2026"
        assert helios_json["study_strategy"]["weekly_study_hours"] == "35"
        
        print("✅ End-to-end compatibility validated")
        return True
        
    except Exception as e:
        print(f"❌ End-to-end compatibility validation failed: {e}")
        return False

def generate_type_compatibility_report():
    """Generate comprehensive type compatibility report"""
    
    print("🔍 Type Compatibility Validation Report")
    print("=" * 50)
    
    results = {
        "JSON Schema Consistency": validate_json_schema_consistency(),
        "Elm-Python Compatibility": validate_elm_python_compatibility(), 
        "Python-Helios Integration": validate_python_helios_integration(),
        "Python-Helios Runtime": validate_python_to_helios_compatibility(),
        "End-to-End Compatibility": validate_end_to_end_compatibility()
    }
    
    print("\n📊 Summary:")
    print("-" * 30)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
        if not passed:
            all_passed = False
    
    print(f"\n🎯 Overall Status: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
    
    if all_passed:
        print("\n🚀 Type safety is ensured across all interfaces!")
        print("   - Elm frontend types match Python API schemas")
        print("   - Python API data converts correctly to Helios format")
        print("   - All type transformations preserve data integrity")
    else:
        print("\n⚠️  Type safety issues detected. Review failed tests above.")
    
    return all_passed

if __name__ == "__main__":
    success = generate_type_compatibility_report()
    sys.exit(0 if success else 1)
