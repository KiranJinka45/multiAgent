export const VITE_BOILERPLATE: Record<string, string> = {
  "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MultiAgent Sandbox</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- Branding Footer -->
    <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: sans-serif;">
      <a href="https://multiagent.app?via=sandbox" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 99px; text-decoration: none; color: white; font-size: 11px; font-weight: 600; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
        <span style="width: 8px; height: 8px; background: linear-gradient(to top right, #9333ea, #3b82f6); border-radius: 2px;"></span>
        Built with MultiAgent ⚡ <span style="opacity: 0.5; margin-left: 4px; font-weight: 400;">Build yours in 60s</span>
      </a>
    </div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
  "src/main.tsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
  "src/index.css": `@tailwind base;
@tailwind components;
@tailwind utilities;`,
  "vite.config.ts": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
})`,
  "tailwind.config.js": `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
  "postcss.config.js": `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
};
