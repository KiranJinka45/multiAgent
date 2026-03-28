import { Metadata } from 'next';
import { db } from '@packages/db';
import { notFound } from 'next/navigation';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await db.product.findUnique({
    where: { slug: params.slug },
  });

  if (!product) return {};

  return {
    title: `${product.name} | Build with MultiAgent`,
    description: product.description || 'Power your projects with autonomous AI agents.',
  };
}

export default async function Page({ params }: Props) {
  const product = await db.product.findUnique({
    where: { slug: params.slug },
  });

  if (!product) notFound();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-6xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          {product.name}
        </h1>
        <p className="text-2xl text-zinc-400">
          {product.description || 'This autonomous agent is currently being built and optimized by the MultiAgent strategy engine.'}
        </p>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
          <h2 className="text-3xl font-semibold">Ready to get started?</h2>
          <p className="text-zinc-500">
            Join the autonomous revolution. This product is ready for instant deployment.
          </p>
          <button className="bg-white text-black px-8 py-4 rounded-full font-bold text-xl hover:bg-zinc-200 transition-colors">
            Start Building {product.name}
          </button>
        </div>
      </div>
    </div>
  );
}
