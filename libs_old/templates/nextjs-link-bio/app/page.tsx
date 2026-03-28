"use client";

import { motion } from "framer-motion";
import { Link2, Github, Twitter, Instagram, Mail, Globe, Sparkles } from "lucide-react";

export default function Home() {
  const links = [
    { title: "Personal Website", icon: Globe, url: "#", color: "bg-blue-500" },
    { title: "Latest Project: MultiAgent", icon: Sparkles, url: "#", color: "bg-purple-500" },
    { title: "GitHub Profile", icon: Github, url: "#", color: "bg-slate-900" },
    { title: "Follow me on Twitter", icon: Twitter, url: "#", color: "bg-sky-400" },
    { title: "Instagram Vibes", icon: Instagram, url: "#", color: "bg-pink-500" },
    { title: "Work with Me", icon: Mail, url: "#", color: "bg-green-500" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 text-slate-900 font-sans flex justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-10">
        {/* Profile Section */}
        <section className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative inline-block"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-1">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Nova" 
                  alt="Nova Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-lg">
              <Sparkles size={16} className="text-yellow-500 animate-pulse" />
            </div>
          </motion.div>
          
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight">Nova Digital</h1>
            <p className="text-slate-500 font-medium italic">Building the future of Autonomous Platforms</p>
          </div>
        </section>

        {/* Links Section */}
        <section className="space-y-4">
          {links.map((link, index) => (
            <motion.a
              key={index}
              href={link.url}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 p-4 bg-white/70 backdrop-blur-md border border-white rounded-2xl shadow-sm hover:shadow-md hover:bg-white transition-all group"
            >
              <div className={`p-2.5 rounded-xl text-white ${link.color} shadow-sm group-hover:scale-110 transition-transform`}>
                <link.icon size={20} />
              </div>
              <span className="flex-1 font-bold text-slate-700">{link.title}</span>
              <Link2 size={16} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
            </motion.a>
          ))}
        </section>

        {/* Footer */}
        <footer className="text-center pt-8 space-y-4">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            Built with <Sparkles size={12} className="text-purple-500" /> MultiAgent
          </p>
          <div className="flex justify-center gap-6 text-slate-300">
             <Twitter size={20} className="hover:text-sky-400 cursor-pointer transition-colors" />
             <Github size={20} className="hover:text-slate-900 cursor-pointer transition-colors" />
             <Instagram size={20} className="hover:text-pink-500 cursor-pointer transition-colors" />
          </div>
        </footer>
      </div>
    </main>
  );
}
