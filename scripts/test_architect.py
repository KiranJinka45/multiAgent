import sys
import os

# Ensure src is in path
sys.path.append(os.path.join(os.getcwd(), 'src'))

from agent import AntiGravityAgent
from tools.architect import create_design_document

def main():
    print("🧪 Starting Architect Persona Test...")
    agent = AntiGravityAgent()
    
    prompt = """
    I want to build a 'To-Do List' app where users can add tasks, mark them as done, and see a history.
    Please start the project.
    """
    
    print(f"User Prompt: {prompt}")
    
    try:
        response = agent.run(prompt)
        print("\n✅ Test Completed.")
        print(f"Agent Response: {response}")
        
        # Verify architecture file creation
        if os.path.exists("todo_app_architecture.json") or os.path.exists("To-Do_List_architecture.json"):
            print("✅ Architecture JSON found!")
        else:
            print("⚠️ Architecture JSON NOT found (Agent might have named it differently or skipped step).")
            # Check for any json file
            files = os.listdir(".")
            json_files = [f for f in files if f.endswith("_architecture.json")]
            if json_files:
                print(f"✅ Found similar file: {json_files[0]}")
            
    except Exception as e:
        print(f"❌ Test Failed: {e}")

if __name__ == "__main__":
    main()
