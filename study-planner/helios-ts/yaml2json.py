import yaml
import json
import sys

def yaml_to_json(yaml_file_path, json_file_path=None):
    with open(yaml_file_path, 'r') as yaml_file:
        data = yaml.safe_load(yaml_file)

    json_output = json.dumps(data, indent=2)

    if json_file_path:
        with open(json_file_path, 'w') as json_file:
            json_file.write(json_output)
        print(f"✅ JSON written to {json_file_path}")
    else:
        print(json_output)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python yaml_to_json.py <input.yaml> [output.json]")
    else:
        yaml_path = sys.argv[1]
        json_path = sys.argv[2] if len(sys.argv) > 2 else None
        yaml_to_json(yaml_path, json_path)
