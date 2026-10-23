import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig, Plugin} from 'vite';
import type {Course, Session} from './src/types/index.ts';
import {
  buildSessionMetaTagsHtml,
  canAccessSessionPublicly,
  injectSeoMetaIntoHtml,
  matchesSessionIdentifier,
} from './src/utils/sessionShareHelper.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedEntries: {
  timestamp: number;
  entries: Array<{course: Course; session: Session}>;
} | null = null;

async function getPublishedSessionForSeo(
  identifier: string
): Promise<{session: Session; course: Course | null} | null> {
  const now = Date.now();
  if (!cachedEntries || now - cachedEntries.timestamp > 30000) {
    const entriesMap = new Map<string, {course: Course; session: Session}>();

    // Load from public/session-seo-manifest.json if present
    try {
      const manifestPath = path.resolve(
        __dirname,
        'public/session-seo-manifest.json'
      );
      if (fs.existsSync(manifestPath)) {
        const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        for (const item of parsed.entries || []) {
          if (item.session && item.course) {
            entriesMap.set(item.session.id, item);
          }
        }
      }
    } catch {
      // Ignore manifest read error
    }

    cachedEntries = {
      timestamp: now,
      entries: Array.from(entriesMap.values()),
    };
  }

  for (const {course, session} of cachedEntries.entries) {
    if (matchesSessionIdentifier(session, identifier)) {
      if (!canAccessSessionPublicly(session, course)) {
        return null;
      }
      return {session, course};
    }
  }

  return null;
}

function sessionSeoServerPlugin(): Plugin {
  return {
    name: 'dars-session-seo-ssr',
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        const rawUrl = ctx.originalUrl || '';
        if (!rawUrl) return html;

        const parsed = new URL(rawUrl, 'https://darswithosama.com');
        const pathMatch = parsed.pathname.match(/^\/session\/([^/]+)\/?$/i);
        const identifier = pathMatch
          ? decodeURIComponent(pathMatch[1])
          : parsed.searchParams.get('session') ||
            parsed.searchParams.get('sessionId');

        if (!identifier) return html;

        const resolved = await getPublishedSessionForSeo(identifier);
        if (!resolved) return html;

        const seoMetaTags = buildSessionMetaTagsHtml(
          resolved.session,
          resolved.course,
          'https://darswithosama.com'
        );
        return injectSeoMetaIntoHtml(html, seoMetaTags);
      },
    },
    closeBundle() {
      const seoScript = path.resolve(
        __dirname,
        'scripts/generate-article-seo.ts'
      );
      if (fs.existsSync(seoScript)) {
        try {
          execFileSync('npx', ['tsx', seoScript], {
            cwd: __dirname,
            stdio: 'inherit',
            timeout: 15000,
          });
        } catch (err) {
          console.warn(
            'generate-article-seo notice (continuing build):',
            err instanceof Error ? err.message : String(err)
          );
        }
      }

      const indexHtml = path.resolve(__dirname, 'dist/index.html');
      const notFoundHtml = path.resolve(__dirname, 'dist/404.html');
      if (fs.existsSync(indexHtml)) {
        try {
          fs.copyFileSync(indexHtml, notFoundHtml);
        } catch {
          // Ignore copy error
        }
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/',
    build: {
      chunkSizeWarningLimit: 2500,
    },
    plugins: [
      sessionSeoServerPlugin(),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

