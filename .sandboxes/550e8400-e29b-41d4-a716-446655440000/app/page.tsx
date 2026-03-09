import { Sparkles, ArrowRight, Github } from 'lucide-react';
import { motion } from 'framer-motion';

const { primaryColor, textColor } = theme;

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12">
            <div className="space-y-4">
                <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-${primaryColor} to-${primaryColor} bg-clip-text text-transparent italic">
                    The Art of Pizza
                </h1>
                <p className="text-xl text-${textColor} max-w-2xl mx-auto font-medium">
                    Experience the freshest ingredients, crafted with love
                </p>
            </div>

            <div className="flex items-center gap-6">
                <button className="px-8 py-3 bg-${primaryColor} hover:bg-${primaryColor} rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-${primaryColor}/40">
                    Order Now
                    <ArrowRight size={20} />
                </button>
                <button className="px-8 py-3 bg-${primaryColor} hover:bg-${primaryColor} rounded-full font-bold flex items-center gap-2 transition-all border border-${primaryColor}">
                    <Github size={20} />
                    Github
                </button>
            </div>

            <div className="grid grid-cols-3 gap-8 w-full max-w-5xl mt-24">
                {pizzaItems.map((item) => (
                    <div key={item.id} className="p-8 rounded-3xl bg-${primaryColor}/50 border border-${primaryColor} hover:border-${primaryColor}/50 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-${primaryColor}/10 flex items-center justify-center text-${textColor} mb-6 group-hover:bg-${primaryColor} group-hover:text-white transition-all">
                            <Sparkles size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 italic uppercase tracking-tight">{item.name}</h3>
                        <p className="text-${textColor} text-sm leading-relaxed">
                            {item.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}