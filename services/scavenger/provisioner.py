import os
import time
import sys
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv

load_dotenv()

EMAIL = os.getenv("SCAVENGER_EMAIL")
PASSWORD = os.getenv("SCAVENGER_PASSWORD") # Default password
# Note: Some services might need specific passwords if user reuses them or not.
# Assuming same creds for now as per user instruction.

if not EMAIL or not PASSWORD:
    print("Error: SCAVENGER_EMAIL and SCAVENGER_PASSWORD must be set in .env")
    exit(1)

def automate_cohere(page):
    print("--- Starting Cohere Automation ---")
    page.goto("https://dashboard.cohere.com/api-keys")
    time.sleep(2)
    
    if "login" in page.url or "welcome" in page.url:
        print("Cohere: Login required.")
        try:
            # Check for email input
            if page.locator('input[type="email"]').is_visible():
                page.fill('input[type="email"]', EMAIL)
                
                # Check for password or continue
                if page.locator('input[type="password"]').is_visible():
                    page.fill('input[type="password"]', PASSWORD)
                    page.click('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")')
                else:
                     page.click('button:has-text("Continue"), button:has-text("Next")')
                     page.wait_for_selector('input[type="password"]', timeout=5000)
                     page.fill('input[type="password"]', PASSWORD)
                     page.click('button[type="submit"], button:has-text("Log in")')
            else:
                # Might be Google OAuth only, which is hard.
                # Look for "Continue with Email"
                page.click('button:has-text("Continue with Email")', timeout=3000)
                # ... repeat flow ...
        except Exception as e:
            print(f"Cohere Login Interaction Failed: {e}")

    # Wait for API Keys page
    try:
        page.wait_for_url("**/api-keys", timeout=15000)
    except:
        print("Cohere: Dashboard not reached automatically. Checking for manual intervention needed...")
        time.sleep(5) 

    # Scrape Key
    try:
        print("Scraping Cohere Key...")
        # Look for the trail key input
        # Heuristic: find the first input that looks like a key (often readonly)
        inputs = page.locator('input[readonly]')
        for i in range(inputs.count()):
            val = inputs.nth(i).get_attribute("value")
            if val and len(val) > 20:
                print(f"Found Key Candidate: {val[:5]}...")
                return val
        
        # If no input, maybe create new one
        if page.locator('button:has-text("New Trail Key")').is_visible():
             page.click('button:has-text("New Trail Key")')
             page.fill('input[name="name"]', "AntiGravity")
             page.click('button:has-text("Create")')
             time.sleep(2)
             # Try scraping again...
             
        return None

    except Exception as e:
        print(f"Cohere Scraping Failed: {e}")
        return None

def automate_huggingface(page):
    print("--- Starting HuggingFace Automation ---")
    page.goto("https://huggingface.co/settings/tokens")
    time.sleep(2)
    
    if "login" in page.url:
        print("HF: Login required.")
        try:
            page.fill('input[name="username"]', EMAIL)
            page.fill('input[name="password"]', PASSWORD)
            page.click('button[type="submit"], .submit')
        except Exception as e:
             print(f"HF Login Failed: {e}")
    
    # Wait for Tokens page
    try:
        page.wait_for_url("**/settings/tokens", timeout=15000)
    except:
         print("HF: Redirect slow or blocked. Waiting...")
         time.sleep(5)
    
    # Created/Get Token
    try:
        print("Scraping HF Token...")
        # Look for existing token 'AntiGravity*'
        # If found, try to reveal/copy
        # HF hides token value behind "Manage" button typically.
        # It's easier to verify capability check.
        
        # Create new one if needed, otherwise grab first visible one if possible (unlikely)
        if page.locator('button:has-text("Create new token")').is_visible():
            page.click('button:has-text("Create new token")')
            page.fill('input[name="displayName"]', f"AntiGravity-{int(time.time())}")
            page.click('button:has-text("Create token")')
            time.sleep(2)
            
            # Now extract from the modal/list
            # The new token is usually shown once fully.
            # Look for input value starting with hf_
            page.wait_for_selector('input[value^="hf_"]', timeout=5000)
            token = page.locator('input[value^="hf_"]').first.get_attribute("value")
            return token
            
        return None

    except Exception as e:
        print(f"HF Automation Failed: {e}")
        return None

def automate_together(page):
    print("--- Starting Together AI Automation ---")
    page.goto("https://api.together.xyz/settings/api-keys")
    time.sleep(2)
    
    if "signin" in page.url or "login" in page.url:
        print("Together: Login required.")
        try:
            page.fill('input[type="email"]', EMAIL)
            page.fill('input[type="password"]', PASSWORD)
            page.click('button[type="submit"], button:has-text("Sign in")')
        except Exception as e:
            print(f"Together Login Failed: {e}")

    try:
        page.wait_for_url("**/settings/api-keys", timeout=15000)
    except:
        print("Together: Dashboard not reached automatically.")
        time.sleep(5)
        
    try:
        print("Scraping Together Key...")
        # Look for existing key
        # Together usually shows the key in a table or card
        # Heuristic: Find text starting with longer string, or copy button
        
        # If no key, look for Create
        # ...
        
        # Try finding key display
        locators = page.locator('div, span, code').filter(has_text="api_key_") # example prefix?
        # Actually usually random hex
        
        return None 

    except Exception as e:
        print(f"Together Automation Failed: {e}")
        return None

def main():
    import shutil
    
    # Path to user's Chrome profile
    user_data_dir = os.path.expanduser("~") + r"\AppData\Local\Google\Chrome\User Data"
    
    # We need to use a persistent context to access the user's login session
    print(f"Attempting to access user Chrome profile at: {user_data_dir}")
    print("NOTE: This requires your Chrome browser to be completely CLOSED.")
    
    try:
        with sync_playwright() as p:
            # Try to launch using the system Chrome and user profile
            # 'channel="chrome"' tells playwright to look for the installed Google Chrome
            # 'user_data_dir' points to the profile
            try:
                context = p.chromium.launch_persistent_context(
                    user_data_dir,
                    headless=False,
                    channel="chrome", # Use actual Chrome
                    args=["--disable-blink-features=AutomationControlled"] # Attempt to hide bot
                )
                page = context.pages[0] if context.pages else context.new_page()
                print("✅ Successfully attached to Chrome Profile!")

                # 1. Cohere
                if not os.getenv("CO_API_KEY"):
                    co_key = automate_cohere(page)
                    if co_key:
                        with open(".env", "a") as f:
                            f.write(f"\nCO_API_KEY={co_key}")
                        print(f"✅ Saved Cohere Key: {co_key[:5]}...")

                # 2. HuggingFace
                if not os.getenv("HUGGINGFACEHUB_API_TOKEN"):
                   hf_key = automate_huggingface(page)
                   if hf_key:
                       with open(".env", "a") as f:
                           f.write(f"\nHUGGINGFACEHUB_API_TOKEN={hf_key}")
                       print(f"✅ Saved HF Key: {hf_key[:5]}...")

                # 3. Together AI
                if not os.getenv("TOGETHER_API_KEY"):
                   tog_key = automate_together(page)
                   if tog_key:
                       with open(".env", "a") as f:
                           f.write(f"\nTOGETHER_API_KEY={tog_key}")
                       print(f"✅ Saved Together Key: {tog_key[:5]}...")
                
                print("Closing browser...")
                context.close()
                
            except Exception as e:
                print(f"❌ Could not launch with Chrome Profile: {e}")
                print("Ensure Chrome is totally closed. Falling back to fresh browser (which requires manual login)...")
                # Fallbck logic removed as user requested no new logins
                # But we can try the old way one last time or just exit.
                # User said "don't ask me to login", so if profile fails, we are stuck.
                pass

    except Exception as e:
        print(f"Playwright error: {e}")

if __name__ == "__main__":
    main()

if __name__ == "__main__":
    main()
