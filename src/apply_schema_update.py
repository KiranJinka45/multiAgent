import os
import time
from playwright.sync_api import sync_playwright

def main():
    print("--- Applying Schema Update (Automated) ---")
    
    # Credentials (from supabase_setup.py)
    EMAIL = "kiranjinkakumar@gmail.com"
    PASSWORD = "multiAgent@000"
    PROJECT_ID = "shvwmatbjvjspijslawl"
    
    SQL_COMMAND = """
    alter table chats add column if not exists is_pinned boolean default false;
    alter table chats add column if not exists is_archived boolean default false;
    alter table chats add column if not exists is_public boolean default false;
    """

    with sync_playwright() as p:
        # Launch non-headless so user can see/interact if needed
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        try:
            print(f"Logging in as {EMAIL}...")
            page.goto("https://supabase.com/dashboard/sign-in")
            
            # Fill login form
            page.click('input[name="email"]')
            page.keyboard.type(EMAIL, delay=50)
            
            page.click('input[name="password"]')
            page.keyboard.type(PASSWORD, delay=50)
            
            page.click('button:has-text("Sign In")')
            
            # Wait for dashboard
            print("Waiting for dashboard redirect...")
            try:
                page.wait_for_url("**/projects**", timeout=30000)
                print("✅ Logged in successfully!")
            except Exception:
                print(f"Login timeout/captcha? Check browser.")
                page.wait_for_url("**/projects**", timeout=60000)
            
            # Navigate to SQL Editor
            sql_url = f"https://supabase.com/dashboard/project/{PROJECT_ID}/sql"
            print(f"Navigating to SQL Editor: {sql_url}")
            page.goto(sql_url)
            
            # Reset/New Query
            print("Creating new query...")
            # Wait for the editor to load
            time.sleep(5) 
            
            # Try to find "New query" button
            try:
                 page.click('button:has-text("New query")', timeout=5000)
            except:
                 print("Could not find 'New query' button, might be already on a blank query or different UI.")

            # Type SQL
            print("Typing SQL command...")
            # Focus the editor (Monaco editor usually captures focus)
            page.keyboard.press("Control+A")
            page.keyboard.press("Backspace")
            page.keyboard.insert_text(SQL_COMMAND)
            
            # Run
            print("Running query...")
            run_btn = page.get_by_role("button", name="Run")
            if run_btn.count() > 0:
                run_btn.first.click()
            else:
                page.click('button:has-text("Run")')
            
            # Wait for result
            time.sleep(5)
            print("✅ Query executed (presumably). Check result in browser.")
            
        except Exception as e:
            print(f"❌ An error occurred: {e}")
            page.screenshot(path="schema_update_error.png")
            time.sleep(5)
        
        finally:
            print("Closing browser in 5 seconds...")
            time.sleep(5)
            browser.close()

if __name__ == "__main__":
    main()
