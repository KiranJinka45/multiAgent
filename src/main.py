import sys
import os

# Ensure src is in path so we can import tools and agent
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agent import AntiGravityAgent

def main():
    print("Initializing AntiGravity Agent...")
    try:
        agent = AntiGravityAgent()
    except Exception as e:
        print(f"Failed to initialize agent: {e}")
        return

    if len(sys.argv) > 1:
        prompt = sys.argv[1]
    else:
        # Default prompt for testing if none provided
        prompt = "Build a simple HTML page that says 'Hello AntiGravity' and save it to 'hello.html'"
    
    print(f"\n🚀 Mission Directive: {prompt}\n")
    
    try:
        result = agent.run(prompt)
        print(f"\n✅ Mission Outcome:\n{result}")
    except Exception as e:
        print(f"\n❌ Mission Failed:\n{e}")

if __name__ == "__main__":
    main()
