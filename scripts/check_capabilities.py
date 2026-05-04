import os
from dotenv import load_dotenv
import google.generativeai as genai
from groq import Groq

# Load env but don't fail if missing
load_dotenv()

def print_status(provider, status, details=""):
    symbol = "✅" if status == "Active" else "❌" if status == "Failed" else "⚠️"
    print(f"{symbol} **{provider}**: {status}")
    if details:
        print(f"   └─ {details}")

def check_gemini():
    key = os.getenv("GOOGLE_API_KEY")
    if not key:
        print_status("Google Gemini", "Missing Key", "Add GOOGLE_API_KEY to .env")
        return
    
    try:
        genai.configure(api_key=key)
        model = genai.GenerativeModel('gemini-3-flash-preview')
        response = model.generate_content("Ping")
        print_status("Google Gemini", "Active", f"Model: gemini-3-flash-preview")
    except Exception as e:
        print_status("Google Gemini", "Failed", str(e))

def check_groq():
    key = os.getenv("GROQ_API_KEY")
    if not key:
        print_status("Groq", "Missing Key", "Add GROQ_API_KEY to .env")
        return

    try:
        client = Groq(api_key=key)
        client.chat.completions.create(
            messages=[{"role": "user", "content": "Ping"}],
            model="llama-3.3-70b-versatile",
        )
        print_status("Groq", "Active", "Model: llama-3.3-70b-versatile")
    except Exception as e:
        print_status("Groq", "Failed", str(e))

def check_others():
    others = [
        ("Cohere", "CO_API_KEY"),
        ("HuggingFace", "HUGGINGFACEHUB_API_TOKEN"),
        ("Together AI", "TOGETHER_API_KEY"),
        ("Mistral", "MISTRAL_API_KEY"),
        ("SambaNova", "SAMBANOVA_API_KEY"),
    ]
    
    for name, env_var in others:
        key = os.getenv(env_var)
        if key:
            print_status(name, "Key Found", "(Not strictly verified via API call in this summary)")
        else:
            print_status(name, "Inactive", f"Missing {env_var}")

if __name__ == "__main__":
    print("\n🔎 **AntiGravity AI Stack Status** 🔎\n")
    check_gemini()
    check_groq()
    check_others()
    print("\n" + "="*40 + "\n")
