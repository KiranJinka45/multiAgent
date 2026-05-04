import os
import google.generativeai as genai
from dotenv import load_dotenv

# The previous error "ModuleNotFoundError: No module named 'google.generativeai'" suggests
# we only installed `langchain-google-genai` which might not expose `google.generativeai` directly
# or it's a version mismatch.
# Let's try using `langchain_google_genai` to list models if possible, or just install the missing package.
# Actually, `langchain-google-genai` depends on `google-generativeai`.
# Let's try installing it explicitly to be sure.

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

try:
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    print("Listing available models...")
    for m in genai.list_models():
        print(f"- {m.name}")
except ImportError:
    print("Installing google-generativeai...")
    os.system("pip install google-generativeai")
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    for m in genai.list_models():
        print(f"- {m.name}")
except Exception as e:
    print(f"Error: {e}")
print("Listing available models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")
