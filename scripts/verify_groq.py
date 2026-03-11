import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("Error: GROQ_API_KEY not found.")
    exit(1)

print(f"Testing Groq Key: {api_key[:10]}...")

try:
    client = Groq(api_key=api_key)
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": "Hello! Are you Llama 3?",
            }
        ],
        model="llama-3.3-70b-versatile",
    )
    print("✅ Success! Response from Groq:")
    print(chat_completion.choices[0].message.content)
except Exception as e:
    print(f"❌ Error: {e}")
