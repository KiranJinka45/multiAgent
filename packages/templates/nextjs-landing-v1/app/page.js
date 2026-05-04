"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const lucide_react_1 = require("lucide-react");
function Home() {
    return (<main className="min-h-screen bg-white text-slate-900 font-sans">
      {/* @section: NAVIGATION */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="text-xl font-bold tracking-tight">LANDING<span className="text-blue-600">PRO</span></div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#testimonials" className="hover:text-blue-600 transition-colors">Success Stories</a>
          <button className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition-all flex items-center gap-2">
            Get Started <lucide_react_1.ArrowRight size={16}/>
          </button>
        </div>
      </nav>
      {/* @endsection: NAVIGATION */}

      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        {/* @section: HERO */}
        <section className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider">
            <lucide_react_1.Star size={12} fill="currentColor"/>
            <span>Top Rated Pro Solution</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
            Build something <br />
            <span className="text-blue-600">truly remarkable.</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed">
            The premium landing page template for high-growth startups. 
            Designed to convert, built to scale, and optimized for performance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all text-lg shadow-xl shadow-slate-200">
              Start Building Now
            </button>
            <button className="w-full sm:w-auto bg-white text-slate-600 border border-slate-200 px-8 py-4 rounded-xl font-bold hover:bg-slate-50 transition-all text-lg">
              View Showcase
            </button>
          </div>
        </section>
        {/* @endsection: HERO */}

        {/* @section: FEATURES */}
        <section id="features" className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-32">
          {[
            { title: "Lightning Fast", desc: "Built with Next.js 14 for sub-second page loads." },
            { title: "Fully Responsive", desc: "Looks perfect on everything from phones to monitors." },
            { title: "Conversion First", desc: "Engineered based on years of CRO best practices." }
        ].map((f, i) => (<div key={i} className="group space-y-4 p-8 rounded-3xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                <lucide_react_1.CheckCircle size={24}/>
              </div>
              <h3 className="text-xl font-bold">{f.title}</h3>
              <p className="text-slate-500 leading-relaxed">{f.desc}</p>
            </div>))}
        </section>
        {/* @endsection: FEATURES */}

        {/* @section: TESTIMONIALS */}
        {/* Testimonials will be injected here */}
        {/* @endsection: TESTIMONIALS */}

        {/* @section: FOOTER */}
        <footer className="mt-40 pt-20 border-t border-slate-100 pb-10 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} MultiAgent Factory. All rights reserved.
        </footer>
        {/* @endsection: FOOTER */}
      </div>
    </main>);
}
//# sourceMappingURL=page.js.map