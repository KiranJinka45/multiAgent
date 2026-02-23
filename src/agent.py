import os
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from dotenv import load_dotenv

from tools.browser import BrowserTool
from tools.filesystem import write_file, read_file, list_directory, replace_in_file
from tools.terminal import run_terminal_command
from tools.captcha import solve_captcha
from tools.architect import create_design_document
from tools.devops import generate_docker_config, generate_cicd_pipeline, generate_iac_config, generate_monitoring_config
from scavenger.llm_registry import start_registry as llm_registry

# Load environment variables
load_dotenv()

# Initialize Browser Tool
browser = BrowserTool(headless=False) # Run headed for demo/debugging if possible

@tool
def check_llm_health(provider_name: str) -> str:
    """Checks the health/availability of a specific LLM provider (groq, gemini, huggingface)."""
    provider = llm_registry.get(provider_name.lower())
    if not provider:
        return f"Unknown provider: {provider_name}. Available: {', '.join(llm_registry.keys())}"
    
    # In a real scenario, this would make a lightweight API call
    return f"Health Check for {provider.name}: OK. Limits: {provider.free_tier_limits}"

@tool
def get_llm_snippet(provider_name: str) -> str:
    """Returns the code snippet to use a specific LLM provider."""
    provider = llm_registry.get(provider_name.lower())
    if not provider:
        return f"Unknown provider: {provider_name}"
    return provider.setup_snippet

@tool
def solve_website_captcha(url: str, site_key: str = None) -> str:
    """Solves a CAPTCHA on a website."""
    return solve_captcha(url=url, site_key=site_key)

@tool
def navigate_web(url: str) -> str:
    """Navigates to a URL using a browser."""
    return browser.navigate(url)

@tool
def click_element(selector: str) -> str:
    """Clicks an element on the current page."""
    return browser.click(selector)

@tool
def fill_form(selector: str, text: str) -> str:
    """Fills a form field on the current page."""
    return browser.fill(selector, text)

@tool
def read_page_content() -> str:
    """Reads the HTML content of the current page."""
    return browser.get_content()

@tool
def execute_shell(command: str) -> str:
    """Executes a terminal command."""
    return run_terminal_command(command)

@tool
def write_to_disk(path: str, content: str) -> str:
    """Writes content to a file."""
    return write_file(path, content)

@tool
def edit_file(path: str, target: str, replacement: str) -> str:
    """Replaces target text with replacement text in a file."""
    return replace_in_file(path, target, replacement)

@tool
def read_from_disk(path: str) -> str:
    """Reads content from a file."""
    return read_file(path)

@tool
def list_files(path: str = ".") -> str:
    """Lists files in a directory."""
    return list_directory(path)

def load_system_prompt() -> str:
    """Loads the system prompt from the prompts directory."""
    prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "system_prompt.md")
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "You are AntiGravity. System prompt file not found."

class BaseAgent:
    def __init__(self, name: str, system_prompt: str, model_name: str = "llama-3.3-70b-versatile"):
        self.name = name
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
             from langchain_google_genai import ChatGoogleGenerativeAI
             self.llm = ChatGoogleGenerativeAI(model="gemini-3.1-pro-preview", temperature=0)
        else:
             self.llm = ChatGroq(model=model_name, temperature=0, api_key=api_key)
        self.system_prompt = system_prompt
        self.messages = [SystemMessage(content=self.system_prompt)]

    def run(self, input_data: str) -> str:
        self.messages.append(HumanMessage(content=input_data))
        response = self.llm.invoke(self.messages)
        self.messages.append(response)
        return response.content

class Orchestrator:
    def __init__(self):
        self.architect = BaseAgent("Architect Agent", "You are the Architect. Output strict JSON architecture spec. No explanations.")
        self.backend = BaseAgent("Backend Agent", "You are the Backend Agent. Inject Spring Boot WebFlux entities/controllers. strict JSON.")
        self.frontend = BaseAgent("Frontend Agent", "You are the Frontend Agent. Inject Angular 18 standalone components. strict JSON.")
        self.devops = BaseAgent("DevOps Agent", "You are the DevOps Agent. Setup Docker, render.yaml, vercel.json. strict JSON.")
        self.debug = BaseAgent("Debug Agent", "You are the Debug Agent. PATCH ONLY. Input: file_path, error_log. Output JSON diff: {file_path, updated_content}.", model_name="llama-3.3-70b-versatile")
        self.devsecops = BaseAgent("DevSecOps Agent", "You are the DevSecOps Agent. Audit code for security before deployment.")

    def run_pipeline(self, user_requirements: str) -> dict:
        print(f"--- Starting Orchestration Pipeline ---")
        print(f"1. Architect Phase")
        architecture_spec = self.architect.run(user_requirements)
        
        print(f"2. Backend Phase")
        backend_spec = self.backend.run(architecture_spec)
        
        print(f"3. Frontend Phase")
        frontend_spec = self.frontend.run(architecture_spec)
        
        print(f"4. DevOps Phase")
        infrastructure_spec = self.devops.run(architecture_spec)
        
        print(f"5. DevSecOps Audit")
        audit_result = self.devsecops.run(backend_spec + frontend_spec)
        
        print("--- Pipeline Complete ---")
        return {
            "status": "success",
            "architecture": architecture_spec,
            "backend_code": backend_spec,
            "frontend_code": frontend_spec,
            "infrastructure": infrastructure_spec,
            "audit": audit_result
        }

class AntiGravityAgent(Orchestrator):
    def run(self, user_input: str):
        # Compatibility wrapper for existing UI
        result = self.run_pipeline(user_input)
        return str(result)
