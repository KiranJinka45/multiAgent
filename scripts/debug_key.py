import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
print(f"Loaded API Key: {api_key}")

if not api_key:
    print("Error: GOOGLE_API_KEY not found.")
    exit(1)

# Try initializing the model
try:
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", google_api_key=api_key)
    msg = HumanMessage(content="Hello")
    response = llm.invoke([msg])
    print(f"Success! Response: {response.content}")
except Exception as e:
    print(f"Error invoking model: {e}")
