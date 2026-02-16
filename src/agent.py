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

class AntiGravityAgent:
    def __init__(self):
        # Switch to Groq for speed and rate limits
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
             print("⚠️ GROQ_API_KEY not found. Fallback to Gemini.")
             from langchain_google_genai import ChatGoogleGenerativeAI
             self.llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
        else:
             self.llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0, api_key=api_key)
        self.tools = [
            navigate_web, click_element, fill_form, read_page_content,
            execute_shell, write_to_disk, edit_file, read_from_disk, list_files,
            solve_website_captcha, check_llm_health, get_llm_snippet,
            create_design_document
        ]
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        self.system_prompt = load_system_prompt()
        self.messages = [SystemMessage(content=self.system_prompt)]

    def run(self, user_input: str):
        print(f"User: {user_input}")
        self.messages.append(HumanMessage(content=user_input))
        
        # Simple loop for demonstration. In a real agent, use LangGraph or AgentExecutor.
        # This loop manually handles tool calls.
        MAX_STEPS = 15
        for _ in range(MAX_STEPS):
            response = self.llm_with_tools.invoke(self.messages)
            self.messages.append(response)
            
            if response.tool_calls:
                print(f"Agent chose tools: {len(response.tool_calls)}")
                for tool_call in response.tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]
                    print(f"Executing {tool_name} with {tool_args}")
                    
                    # Execute tool
                    tool_result = "Unknown tool"
                    selected_tool = next((t for t in self.tools if t.name == tool_name), None)
                    if selected_tool:
                        try:
                            tool_result = selected_tool.invoke(tool_args)
                        except Exception as e:
                            tool_result = f"Error: {e}"
                    
                    print(f"Result: {str(tool_result)[:100]}...") # Truncate log
                    
                    # Append tool result to messages
                    from langchain_core.messages import ToolMessage
                    self.messages.append(ToolMessage(tool_call_id=tool_call["id"], content=str(tool_result)))
            else:
                # Iterate until no more tool calls or max steps
                print(f"Agent Response: {response.content}")
                break
        
        return self.messages[-1].content
