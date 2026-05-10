import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

# Ambiguous key parts: 0 (zero) vs O (uppercase o)
# Base key: [REDACTED]

# HARDENED: Secrets must be provided via environment variables or manual input.
# Do not hardcode API keys in this script.
variants = [os.getenv("GOOGLE_API_KEY")] if os.getenv("GOOGLE_API_KEY") else []

print(f"Testing {len(variants)} API key variants...")

for i, key in enumerate(variants):
    print(f"\n--- Testing Variant {i+1}: ...{key[25:35]}... ---")
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=key)
        msg = HumanMessage(content="Hello")
        response = llm.invoke([msg])
        print(f"✅ SUCCESS with Variant {i+1}!")
        print(f"Response: {response.content}")
        
        # Save the working key to .env
        with open(".env", "w") as f:
            f.write(f"GOOGLE_API_KEY={key}\n")
        print(f"✅ Updated .env with working key.")
        exit(0)
    except Exception as e:
        print(f"❌ Failed with Variant {i+1}")
        # print(f"Error: {e}") # Suppress full error for cleaner output

print("\n❌ All variants failed.")
