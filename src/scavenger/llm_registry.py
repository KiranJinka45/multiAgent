from typing import Dict, Any

class LLMProvider:
    def __init__(self, name: str, free_tier_limits: str, setup_snippet: str, model_id: str):
        self.name = name
        self.free_tier_limits = free_tier_limits
        self.setup_snippet = setup_snippet
        self.model_id = model_id

GROQ_SNIPPET = """
import os
from groq import Groq

key = os.environ.get("GROQ_API_KEY")
if not key:
    print("Error: GROQ_API_KEY not found in environment.")
else:
    client = Groq(api_key=key)
    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": "Hello"}],
        model="llama-3.3-70b-versatile",
    )
    print(chat_completion.choices[0].message.content)
"""

GEMINI_SNIPPET = """
import os
import google.generativeai as genai

key = os.environ.get("GOOGLE_API_KEY")
if not key:
    print("Error: GOOGLE_API_KEY not found.")
else:
    genai.configure(api_key=key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hello")
    print(response.text)
"""

HF_SNIPPET = """
import requests
import os

key = os.environ.get('HUGGINGFACEHUB_API_TOKEN')
if not key:
    print("Error: HUGGINGFACEHUB_API_TOKEN not found.")
else:
    API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
    headers = {"Authorization": f"Bearer {key}"}

    def query(payload):
        response = requests.post(API_URL, headers=headers, json=payload)
        return response.json()
        
    print(query({"inputs": "Hello"}))
"""

COHERE_SNIPPET = """
import cohere
import os

key = os.environ.get("CO_API_KEY")
if not key:
    print("Error: CO_API_KEY not found.")
else:
    co = cohere.Client(key)
    response = co.chat(message="Hello", model="command-r-plus")
    print(response.text)
"""

MISTRAL_SNIPPET = """
import os
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage

key = os.environ.get("MISTRAL_API_KEY")
if not key:
    print("Error: MISTRAL_API_KEY not found.")
else:
    client = MistralClient(api_key=key)
    chat_response = client.chat(
        model="mistral-large-latest",
        messages=[ChatMessage(role="user", content="Hello")]
    )
    print(chat_response.choices[0].message.content)
"""

SAMBANOVA_SNIPPET = """
import os
import openai

key = os.environ.get("SAMBANOVA_API_KEY")
if not key:
    print("Error: SAMBANOVA_API_KEY not found.")
else:
    client = openai.OpenAI(
        api_key=key,
        base_url="https://api.sambanova.ai/v1",
    )
    response = client.chat.completions.create(
        model="Meta-Llama-3.1-8B-Instruct",
        messages=[{"role": "user", "content": "Hello"}],
        stream=True
    )
    for chunk in response:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="")
"""

CEREBRAS_SNIPPET = """
import os
from cerebras.cloud.sdk import Cerebras

key = os.environ.get("CEREBRAS_API_KEY")
if not key:
    print("Error: CEREBRAS_API_KEY not found.")
else:
    client = Cerebras(api_key=key)
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": "Hello"}],
        model="llama3.1-8b",
    )
    print(response.choices[0].message.content)
"""

TOGETHER_SNIPPET = """
import os
from together import Together

key = os.environ.get("TOGETHER_API_KEY")
if not key:
    print("Error: TOGETHER_API_KEY not found.")
else:
    client = Together(api_key=key)
    response = client.chat.completions.create(
        model="meta-llama/Llama-3-8b-chat-hf",
        messages=[{"role": "user", "content": "Hello"}],
    )
    print(response.choices[0].message.content)
"""


start_registry = {
    "groq": LLMProvider(
        name="Groq",
        free_tier_limits="30 RPM, 14.4k RPD (varies by model). Ultra-fast inference.",
        setup_snippet=GROQ_SNIPPET,
        model_id="llama-3.3-70b-versatile"
    ),
    "gemini": LLMProvider(
        name="Google Gemini",
        free_tier_limits="15 RPM, 1.5k RPD. High capacity, large context.",
        setup_snippet=GEMINI_SNIPPET,
        model_id="gemini-1.5-flash" 
    ),
    "huggingface": LLMProvider(
        name="HuggingFace API",
        free_tier_limits="Rate limited, implies usage of smaller models.",
        setup_snippet=HF_SNIPPET,
        model_id="mistralai/Mistral-7B-Instruct-v0.2"
    ),
    "cohere": LLMProvider(
        name="Cohere",
        free_tier_limits="Trial keys available, restricted RPM.",
        setup_snippet=COHERE_SNIPPET,
        model_id="command-r-plus"
    ),
    "mistral": LLMProvider(
        name="Mistral AI",
        free_tier_limits="Free tier available for specific models.",
        setup_snippet=MISTRAL_SNIPPET,
        model_id="mistral-large-latest"
    ),
    "sambanova": LLMProvider(
        name="SambaNova",
        free_tier_limits="Free tier for fast inference (Llama 3.1).",
        setup_snippet=SAMBANOVA_SNIPPET,
        model_id="Meta-Llama-3.1-8B-Instruct"
    ),
    "cerebras": LLMProvider(
        name="Cerebras",
        free_tier_limits="High speed inference free tier.",
        setup_snippet=CEREBRAS_SNIPPET,
        model_id="llama3.1-8b"
    ),
    "together": LLMProvider(
        name="Together AI",
        free_tier_limits="$25 free credit for new accounts.",
        setup_snippet=TOGETHER_SNIPPET,
        model_id="meta-llama/Llama-3-8b-chat-hf"
    )
}

def get_llm_provider(name: str) -> Dict[str, Any]:
    """Returns details for a specific LLM provider."""
    provider = start_registry.get(name.lower())
    if provider:
        return {
            "name": provider.name,
            "limits": provider.free_tier_limits,
            "snippet": provider.setup_snippet,
            "model": provider.model_id
        }
    return None

def list_llm_providers() -> str:
    """Lists all available free LLM providers."""
    return ", ".join([p.name for p in start_registry.values()])
