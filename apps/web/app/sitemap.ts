import { MetadataRoute } from 'next';
import { db } from '@libs/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({
    select: { slug: true, createdAt: true }
  });

  const productUrls = products.map((product) => ({
    url: `${process.env.APP_URL}/p/${product.slug}`,
    lastModified: product.createdAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: `${process.env.APP_URL}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...productUrls,
  ];
}
