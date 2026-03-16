from playwright.sync_api import sync_playwright
from typing import Optional

class BrowserTool:
    def __init__(self, headless: bool = False):
        self.headless = headless
        self.playwright = None
        self.browser = None
        self.page = None

    def start(self):
        if not self.playwright:
            self.playwright = sync_playwright().start()
            self.browser = self.playwright.chromium.launch(headless=self.headless)
            self.page = self.browser.new_page()

    def navigate(self, url: str) -> str:
        self.start()
        try:
            self.page.goto(url)
            return f"Navigated to {url}"
        except Exception as e:
            return f"Error navigating: {str(e)}"

    def click(self, selector: str) -> str:
        self.start()
        try:
            self.page.click(selector)
            return f"Clicked {selector}"
        except Exception as e:
            return f"Error clicking: {str(e)}"

    def fill(self, selector: str, text: str) -> str:
        self.start()
        try:
            self.page.fill(selector, text)
            return f"Filled {selector} with text"
        except Exception as e:
            return f"Error filling: {str(e)}"

    def get_content(self) -> str:
        self.start()
        try:
            return self.page.content()
        except Exception as e:
            return f"Error getting content: {str(e)}"

    def stop(self):
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
