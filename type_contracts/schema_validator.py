#!/usr/bin/env python3
"""
Schema Validator - Distributed validation using versioned JSON Schema
Each service validates against the shared schema independently
"""

import json
import os
from typing import Dict, Any, Optional
from pathlib import Path
import jsonschema
from jsonschema import validate, ValidationError

class SchemaValidator:
    """Validates data against versioned JSON Schema"""
    
    def __init__(self, schema_path: Optional[str] = None):
        if schema_path is None:
            # Default to schema in same directory
            schema_path = Path(__file__).parent / "interface_schemas.json"
        
        with open(schema_path, 'r') as f:
            self.schema = json.load(f)
            
        self.version = self.schema.get("version", "unknown")
        self.schema_version = self.schema.get("schemaVersion", "unknown")
        
    def get_schema_info(self) -> Dict[str, Any]:
        """Get schema version and compatibility info"""
        return {
            "version": self.version,
            "schemaVersion": self.schema_version,
            "compatibility": self.schema.get("compatibility", {}),
            "title": self.schema.get("title", "Unknown Schema")
        }
    
    def validate_background_input(self, data: Dict[str, Any]) -> bool:
        """Validate BackgroundInput data"""
        try:
            validate(instance=data, schema=self.schema["definitions"]["BackgroundInput"])
            return True
        except ValidationError as e:
            print(f"❌ BackgroundInput validation failed: {e.message}")
            return False
    
    def validate_target_input(self, data: Dict[str, Any]) -> bool:
        """Validate TargetInput data"""
        try:
            validate(instance=data, schema=self.schema["definitions"]["TargetInput"])
            return True
        except ValidationError as e:
            print(f"❌ TargetInput validation failed: {e.message}")
            return False
    
    def validate_commitment_input(self, data: Dict[str, Any]) -> bool:
        """Validate CommitmentInput data"""
        try:
            validate(instance=data, schema=self.schema["definitions"]["CommitmentInput"])
            return True
        except ValidationError as e:
            print(f"❌ CommitmentInput validation failed: {e.message}")
            return False
    
    def validate_confidence_input(self, data: Dict[str, Any]) -> bool:
        """Validate ConfidenceInput data"""
        try:
            validate(instance=data, schema=self.schema["definitions"]["ConfidenceInput"])
            return True
        except ValidationError as e:
            print(f"❌ ConfidenceInput validation failed: {e.message}")
            return False
    
    def validate_any(self, data: Dict[str, Any], schema_name: str) -> bool:
        """Validate data against any schema definition"""
        try:
            if schema_name not in self.schema["definitions"]:
                print(f"❌ Schema '{schema_name}' not found")
                return False
                
            validate(instance=data, schema=self.schema["definitions"][schema_name])
            return True
        except ValidationError as e:
            print(f"❌ {schema_name} validation failed: {e.message}")
            return False

def main():
    """CLI interface for schema validation"""
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python schema_validator.py <schema_name> <json_data>")
        print("Example: python schema_validator.py BackgroundInput '{\"name\":\"John\"}'")
        sys.exit(1)
    
    schema_name = sys.argv[1]
    json_data = sys.argv[2]
    
    try:
        data = json.loads(json_data)
        validator = SchemaValidator()
        
        print(f"📋 Schema Info: {validator.get_schema_info()}")
        
        if validator.validate_any(data, schema_name):
            print(f"✅ {schema_name} validation passed")
            sys.exit(0)
        else:
            sys.exit(1)
            
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
