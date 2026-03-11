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
    CREATE TABLE IF NOT EXISTS agents_execution (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID REFERENCES projects(id) ON DELETE CASCADE, agent_name TEXT, input_json JSONB, output_json JSONB, status TEXT);
    CREATE TABLE IF NOT EXISTS build_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID REFERENCES projects(id) ON DELETE CASCADE, phase TEXT, log_output TEXT, success BOOLEAN);
    CREATE TABLE IF NOT EXISTS error_memory (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), error_hash TEXT, resolution_patch JSONB);
    CREATE TABLE IF NOT EXISTS deployments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID REFERENCES projects(id) ON DELETE CASCADE, vercel_url TEXT, render_url TEXT, status TEXT);
    CREATE TABLE IF NOT EXISTS usage_tracking (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID REFERENCES projects(id) ON DELETE CASCADE, tokens_used INT, feature TEXT);

    ALTER TABLE projects ADD COLUMN IF NOT EXISTS generating BOOLEAN DEFAULT FALSE;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS building BOOLEAN DEFAULT FALSE;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS debugging BOOLEAN DEFAULT FALSE;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS deployed BOOLEAN DEFAULT FALSE;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS failed BOOLEAN DEFAULT FALSE;
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
