import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://redepa.net';
  const lastModified = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '/', priority: 1.0, changeFrequency: 'monthly' },
    { path: '/congreso', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/premio', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/sumate', priority: 0.7, changeFrequency: 'yearly' },
    { path: '/submit', priority: 0.6, changeFrequency: 'yearly' },
    { path: '/sign-in', priority: 0.3, changeFrequency: 'yearly' },
  ];

  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
