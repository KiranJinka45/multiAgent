import json
import os
from langchain_core.tools import tool

@tool
def create_design_document(project_name: str, architecture_json: str) -> str:
    """
    Saves the project architecture blueprint to a file.
    Args:
        project_name: Name of the project (e.g., "dog_tinder").
        architecture_json: JSON string containing db_schema, tech_stack, and user_stories.
    """
    try:
        # Validate JSON
        data = json.loads(architecture_json)
        
        # Ensure 'brain' directory exists or use project root
        filename = f"{project_name}_architecture.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
        return f"✅ Architecture blueprint saved to {filename}. You may now proceed to Scavenging."
    except json.JSONDecodeError:
        return "❌ Error: Invalid JSON format for architecture_json."
    except Exception as e:
        return f"❌ Error saving design document: {str(e)}"
