

export const LightningLandingPageTemplate = {
  id: 'lightning-landing-page',
  name: 'Lightning Landing Page',
  description: 'Ultra-fast, high-conversion landing page for service businesses.',
  techStack: {
    frontend: 'nextjs',
    styling: 'tailwind',
    database: 'supabase',
  },
  files: [
    {
      path: 'app/page.tsx',
      content: `
import React from 'react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Hero Section */}
      <header className="py-20 px-6 max-w-7xl mx-auto text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Grow Your Business with a Professional Online Presence
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          Get a high-converting landing page built and deployed in minutes. Perfect for dentists, gyms, and local service providers.
        </p>
        <div className="flex justify-center gap-4">
          <button className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition">
            Start Generating Now
          </button>
          <button className="px-8 py-4 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition">
            View Live Demo
          </button>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div>
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-2xl font-bold mb-4">Ultra Fast</h3>
            <p className="text-gray-600">Built for speed. 100/100 Lighthouse scores guaranteed.</p>
          </div>
          <div>
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="text-2xl font-bold mb-4">High Conversion</h3>
            <p className="text-gray-600">Psychology-backed layouts designed to turn visitors into leads.</p>
          </div>
          <div>
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-2xl font-bold mb-4">Mobile Ready</h3>
            <p className="text-gray-600">Perfectly responsive on every device, from iPhone to Desktop.</p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <footer className="py-12 border-t border-gray-200 text-center text-gray-500">
        <p>© 2026 Lightning Labs. All rights reserved.</p>
      </footer>
    </div>
  );
}
      `
    }
  ]
};

