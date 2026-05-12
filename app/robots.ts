import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/me', '/api', '/auth'],
      },
    ],
    sitemap: 'https://redepa.net/sitemap.xml',
    host: 'https://redepa.net',
  };
}
