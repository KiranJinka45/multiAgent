"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
function Home() {
    return (<main className="min-h-screen flex flex-col items-center justify-center p-8 bg-black">
      <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm font-medium">
          <lucide_react_1.Terminal size={16}/> 
          <span>Autonomous Build Active</span>
        </div>

        {/* @section: HERO */}
        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase italic">
          MultiAgent <br />
          <span className="text-primary-500">Premium SaaS</span>
        </h1>

        <p className="text-xl text-white/40 max-w-2xl mx-auto leading-relaxed">
          Your autonomous mission has successfully initialized this senior-tier foundation. 
          Ready for advanced feature generation and deployment.
        </p>
        {/* @endsection: HERO */}

        {/* @section: FEATURES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          {[
            { icon: lucide_react_1.Rocket, title: "Edge Ready", desc: "Optimized for global performance." },
            { icon: lucide_react_1.Shield, title: "Auth Secure", desc: "Hardened security patterns pre-integrated." },
            { icon: lucide_react_1.Zap, title: "AI Optimized", desc: "Clean architecture for autonomous expansion." }
        ].map((feature, i) => (<div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-left hover:bg-white/[0.04] transition-all">
              <feature.icon className="text-primary-500 mb-4" size={24}/>
              <h3 className="font-bold text-white uppercase text-sm mb-2">{feature.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{feature.desc}</p>
            </div>))}
        </div>
        {/* @endsection: FEATURES */}

        {/* @section: CTA */}
        {/* Add Call to Action here */}
        {/* @endsection: CTA */}
      </framer_motion_1.motion.div>
    </main>);
}
//# sourceMappingURL=page.js.map