// components/Card.tsx

interface CardProps {
  title: string;
  value: string;
}

export function Card({ title, value }: CardProps) {
  return (
    <div className="p-6 border rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h2>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
