/**
 * Helper to resolve media/upload URLs dynamically across production (Vercel/Netlify) and local development.
 * Eliminates hardcoded 127.0.0.1:5000 dependencies in production builds.
 */
export const getMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_URL || '';
  if (apiBase && apiBase.startsWith('http')) {
    try {
      const origin = new URL(apiBase).origin;
      return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
    } catch {
      return url;
    }
  }
  return url;
};
