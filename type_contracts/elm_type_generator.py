#!/usr/bin/env python3
"""
Elm Type Generator from JSON Schema
Generates Elm type definitions and JSON decoders/encoders from JSON Schema
to ensure type safety between Elm frontend and Python API.
"""

import json
import re
from typing import Dict, Any, List

def json_schema_to_elm_type(schema: Dict[str, Any], type_name: str) -> str:
    """Convert JSON Schema to Elm type alias definition"""
    
    if schema.get("type") != "object":
        raise ValueError(f"Only object schemas supported, got {schema.get('type')}")
    
    properties = schema.get("properties", {})
    required = set(schema.get("required", []))
    
    elm_fields = []
    for field_name, field_schema in properties.items():
        elm_field_name = snake_to_camel(field_name)
        elm_type = json_type_to_elm_type(field_schema, field_name not in required)
        elm_fields.append(f"    , {elm_field_name} : {elm_type}")
    
    # Remove leading comma from first field
    if elm_fields:
        elm_fields[0] = elm_fields[0].replace("    , ", "    ")
    
    fields_str = "\n".join(elm_fields)
    
    return f"""type alias {type_name} =
    {{ {fields_str}
    }}"""

def json_type_to_elm_type(schema: Dict[str, Any], optional: bool = False) -> str:
    """Convert JSON Schema type to Elm type"""
    
    json_type = schema.get("type")
    
    if isinstance(json_type, list):
        # Handle union types like ["string", "null"]
        if "null" in json_type:
            non_null_types = [t for t in json_type if t != "null"]
            if len(non_null_types) == 1:
                base_type = json_type_to_elm_type({"type": non_null_types[0]}, False)
                return f"Maybe {base_type}"
    
    if json_type == "string":
        if "enum" in schema:
            # Handle enums - could generate custom types
            return "String"
        return "String"
    elif json_type == "integer":
        return "Int"
    elif json_type == "number":
        return "Float"
    elif json_type == "boolean":
        return "Bool"
    elif json_type == "array":
        items_schema = schema.get("items", {"type": "string"})
        item_type = json_type_to_elm_type(items_schema, False)
        base_type = f"List {item_type}"
        return f"Maybe {base_type}" if optional else base_type
    elif json_type == "object":
        return "Value"  # Use Json.Encode.Value for nested objects
    
    return "String"  # Default fallback

def snake_to_camel(snake_str: str) -> str:
    """Convert snake_case to camelCase"""
    components = snake_str.split('_')
    return components[0] + ''.join(word.capitalize() for word in components[1:])

def generate_elm_decoder(schema: Dict[str, Any], type_name: str) -> str:
    """Generate Elm JSON decoder for the type"""
    
    properties = schema.get("properties", {})
    required = set(schema.get("required", []))
    
    decoder_fields = []
    for field_name, field_schema in properties.items():
        elm_field_name = snake_to_camel(field_name)
        decoder_expr = json_schema_to_decoder_expr(field_schema, field_name, field_name not in required)
        decoder_fields.append(f'        (Decode.field "{field_name}" {decoder_expr})')
    
    decoder_name = f"decode{type_name}"
    field_count = len(decoder_fields)
    
    if field_count <= 8:
        map_func = f"Decode.map{field_count}" if field_count > 1 else "Decode.map"
        fields_str = "\n".join(decoder_fields)
        
        return f"""{decoder_name} : Decode.Decoder {type_name}
{decoder_name} =
    {map_func} {type_name}
{fields_str}"""
    else:
        # Use pipeline decoder for more than 8 fields
        pipeline_fields = "\n".join([f"        |> required \"{field_name.split('(')[0].strip()}\" {json_schema_to_decoder_expr(field_schema, field_name, field_name not in required)}" 
                                   for field_name, field_schema in properties.items()])
        
        return f"""{decoder_name} : Decode.Decoder {type_name}
{decoder_name} =
    Decode.succeed {type_name}
{pipeline_fields}"""

def json_schema_to_decoder_expr(schema: Dict[str, Any], field_name: str, optional: bool) -> str:
    """Generate decoder expression for a field"""
    
    json_type = schema.get("type")
    
    if isinstance(json_type, list) and "null" in json_type:
        non_null_types = [t for t in json_type if t != "null"]
        if len(non_null_types) == 1:
            base_decoder = json_schema_to_decoder_expr({"type": non_null_types[0]}, field_name, False)
            return f"(Decode.nullable {base_decoder})"
    
    if json_type == "string":
        return "Decode.string"
    elif json_type == "integer":
        return "Decode.int"
    elif json_type == "number":
        return "Decode.float"
    elif json_type == "boolean":
        return "Decode.bool"
    elif json_type == "array":
        items_schema = schema.get("items", {"type": "string"})
        item_decoder = json_schema_to_decoder_expr(items_schema, "item", False)
        base_decoder = f"(Decode.list {item_decoder})"
        return f"(Decode.nullable {base_decoder})" if optional else base_decoder
    
    return "Decode.value"

def generate_elm_encoder(schema: Dict[str, Any], type_name: str) -> str:
    """Generate Elm JSON encoder for the type"""
    
    properties = schema.get("properties", {})
    
    encoder_fields = []
    for field_name, field_schema in properties.items():
        elm_field_name = snake_to_camel(field_name)
        encoder_expr = json_schema_to_encoder_expr(field_schema, f"input.{elm_field_name}")
        encoder_fields.append(f'        , ("{field_name}", {encoder_expr})')
    
    # Remove leading comma from first field
    if encoder_fields:
        encoder_fields[0] = encoder_fields[0].replace("        , ", "        ")
    
    fields_str = "\n".join(encoder_fields)
    encoder_name = f"encode{type_name}"
    
    return f"""{encoder_name} : {type_name} -> Encode.Value
{encoder_name} input =
    Encode.object
        [ {fields_str}
        ]"""

def json_schema_to_encoder_expr(schema: Dict[str, Any], value_expr: str) -> str:
    """Generate encoder expression for a field"""
    
    json_type = schema.get("type")
    
    if isinstance(json_type, list) and "null" in json_type:
        non_null_types = [t for t in json_type if t != "null"]
        if len(non_null_types) == 1:
            base_encoder = json_schema_to_encoder_expr({"type": non_null_types[0]}, "v")
            return f"(case {value_expr} of Just v -> {base_encoder}; Nothing -> Encode.null)"
    
    if json_type == "string":
        return f"Encode.string {value_expr}"
    elif json_type == "integer":
        return f"Encode.int {value_expr}"
    elif json_type == "number":
        return f"Encode.float {value_expr}"
    elif json_type == "boolean":
        return f"Encode.bool {value_expr}"
    elif json_type == "array":
        items_schema = schema.get("items", {"type": "string"})
        item_encoder = json_schema_to_encoder_expr(items_schema, "item")
        base_encoder = f"Encode.list (\\item -> {item_encoder}) {value_expr}"
        return f"(case {value_expr} of Just list -> {base_encoder}; Nothing -> Encode.null)"
    
    return f"Encode.value {value_expr}"

def generate_elm_module(schema_file: str, output_file: str):
    """Generate complete Elm module from JSON Schema"""
    
    # Handle relative paths when running from different directories
    from pathlib import Path
    
    schema_path = Path(schema_file)
    if not schema_path.exists():
        # Try relative to current script location
        script_dir = Path(__file__).parent
        schema_path = script_dir / "interface_schemas.json"
        if not schema_path.exists():
            # Try relative to parent directory
            schema_path = script_dir.parent / "type_contracts/interface_schemas.json"
    
    output_path = Path(output_file)
    if not output_path.is_absolute():
        # Make output path relative to script directory
        script_dir = Path(__file__).parent
        output_path = script_dir.parent / output_file
    
    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(schema_path, 'r') as f:
        schema = json.load(f)
    
    definitions = schema.get("definitions", {})
    
    elm_content = [
        "module Generated.Types exposing (..)",
        "",
        "import Json.Decode as Decode exposing (Decoder)",
        "import Json.Encode as Encode",
        "",
        "{-| Auto-generated types from JSON Schema",
        "DO NOT EDIT - Generated by elm_type_generator.py",
        "-}",
        ""
    ]
    
    # Generate type aliases
    for type_name, type_schema in definitions.items():
        if type_schema.get("type") == "object":
            elm_content.append(json_schema_to_elm_type(type_schema, type_name))
            elm_content.append("")
    
    elm_content.append("")
    elm_content.append("-- JSON DECODERS")
    elm_content.append("")
    
    # Generate decoders
    for type_name, type_schema in definitions.items():
        if type_schema.get("type") == "object":
            elm_content.append(generate_elm_decoder(type_schema, type_name))
            elm_content.append("")
    
    elm_content.append("")
    elm_content.append("-- JSON ENCODERS")
    elm_content.append("")
    
    # Generate encoders
    for type_name, type_schema in definitions.items():
        if type_schema.get("type") == "object":
            elm_content.append(generate_elm_encoder(type_schema, type_name))
    
    # Write the generated content to file
    with open(output_path, 'w') as f:
        f.write('\n'.join(elm_content))

if __name__ == "__main__":
    generate_elm_module(
        "type_contracts/interface_schemas.json",
        "mentora-ui/src/Generated/Types.elm"
    )
    print("Generated Elm types from JSON Schema")
