import sys
import os

# Ensure src is in path
sys.path.append(os.path.join(os.getcwd(), 'src'))

from agent import AntiGravityAgent

def main():
    print("🧪 Starting 'Hello World' App Generation Test...")
    agent = AntiGravityAgent()
    
    prompt = """
    Act as The Engineer.
    Create a single file 'index.html' in the current directory.
    It should contain a modern, beautiful 'Hello AntiGravity' landing page.
    Use internal CSS for styling (dark mode, centered text, system fonts).
    Add a button that says 'Click Me' which alerts 'System Online'.
    """
    
    try:
        response = agent.run(prompt)
        print("\n✅ Test Execution Completed.")
        print(f"Agent Response: {response}")
        
        # Verify file creation
        if os.path.exists("index.html"):
            print("✅ File 'index.html' creation verified.")
        else:
            print("❌ File 'index.html' NOT found.")
            
    except Exception as e:
        print(f"❌ Test Failed: {e}")

if __name__ == "__main__":
    main()
