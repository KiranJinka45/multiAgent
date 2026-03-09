import { useState } from 'react';

export default function PizzaMenu() {
    const [pizzaItems, setPizzaItems] = useState(
        [
            { id: 1, name: "Margherita", description: "Fresh tomatoes, mozzarella, basil" },
            { id: 2, name: "Quattro Formaggi", description: "Four types of cheese, perfect for cheese lovers" },
            { id: 3, name: "Prosciutto e Funghi", description: "Cured ham and mushrooms, a classic combination" },
        ]
    );

    return (
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
    );
}