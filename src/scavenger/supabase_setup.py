import os
import time
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv

# Load existing env to append to it later
load_dotenv()

def update_env_file(file_path, key, value):
    """Updates or appends a key-value pair in an .env file."""
    lines = []
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            lines = f.readlines()

    key_found = False
    new_lines = []
    for line in lines:
        if line.startswith(f"{key}="):
            new_lines.append(f"{key}={value}\n")
            key_found = True
        else:
            new_lines.append(line)
    
    if not key_found:
        if new_lines and not new_lines[-1].endswith("\n"):
            new_lines.append("\n")
        new_lines.append(f"{key}={value}\n")

    with open(file_path, "w") as f:
        f.writelines(new_lines)
    print(f"✅ Updated {key} in {file_path}")

def main():
    print("--- Starting Supabase Scavenger (Automated) ---")
    
    # Credentials from user (using env if available)
    EMAIL = os.getenv("SCAVENGER_EMAIL", "kiranjinkakumar@gmail.com")
    PASSWORD = os.getenv("SCAVENGER_PASSWORD", "Kiran@4518")
    PROJECT_ID = "shvwmatbjvjspijslawl"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        try:
            print(f"Logging in as {EMAIL}...")
            page.goto("https://supabase.com/dashboard/sign-in")
            
            # Fill login form
            page.click('input[name="email"]')
            page.keyboard.type(EMAIL, delay=100)
            
            page.click('input[name="password"]')
            page.keyboard.type(PASSWORD, delay=100)
            
            page.click('button:has-text("Sign In")')
            
            # Wait for dashboard
            print("Waiting for dashboard redirect...")
            try:
                page.wait_for_url("**/projects**", timeout=30000)
                print("✅ Logged in successfully!")
            except Exception as e:
                print(f"Login timeout. Current URL: {page.url}")
                page.screenshot(path="login_failed.png")
                # Try to check if we are still on login page or captcha
                if "sign-in" in page.url:
                    print("Still on sign-in page. Please solve captcha if present.")
                    # Wait for user manual intervention
                    page.wait_for_url("**/projects**", timeout=60000)
            
            # Navigate to API settings directly
            api_settings_url = f"https://supabase.com/dashboard/project/{PROJECT_ID}/settings/api"
            print(f"Navigating to API Settings: {api_settings_url}")
            page.goto(api_settings_url)
            
            # Wait for keys
            print("Scraping API Keys...")
            try:
                page.wait_for_selector("text=Project URL", timeout=20000)
            except Exception as e:
                print("Could not find 'Project URL' text.")
                page.screenshot(path="settings_failure.png")
                return

            # Scrape URL
            project_url = page.locator('input[value^="https://"][readonly]').first.get_attribute("value")
            
            # Scrape Anon Key
            anon_key = ""
            time.sleep(2)
            
            inputs = page.locator('input[readonly]')
            count = inputs.count()
            
            for i in range(count):
                val = inputs.nth(i).get_attribute("value")
                if val and val.startswith("ey") and "service_role" not in val:
                     anon_key = val
                     break
            
            if project_url and anon_key:
                print("\n🎉 Keys Found!")
                print(f"URL: {project_url}")
                # Update files
                base_dir = os.getcwd()
                env_local_path = os.path.join(base_dir, ".env.local")
                env_path = os.path.join(base_dir, ".env")
                
                update_env_file(env_local_path, "NEXT_PUBLIC_SUPABASE_URL", project_url)
                update_env_file(env_local_path, "NEXT_PUBLIC_SUPABASE_ANON_KEY", anon_key)

                update_env_file(env_path, "NEXT_PUBLIC_SUPABASE_URL", project_url)
                update_env_file(env_path, "NEXT_PUBLIC_SUPABASE_ANON_KEY", anon_key)
                
                print("\n✅ Environment variables updated!")
            else:
                print("❌ Could not automatically find both keys.")
                page.screenshot(path="scrape_failure.png")

        except Exception as e:
            print(f"❌ An error occurred: {e}")
            page.screenshot(path="error_snapshot.png")
            time.sleep(5)
        
        finally:
            browser.close()

if __name__ == "__main__":
    main()
