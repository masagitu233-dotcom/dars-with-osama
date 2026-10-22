import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {Readable} from 'stream';
import {defineConfig, Plugin} from 'vite';
import {SEED_COURSES, SEED_SESSIONS} from './src/data/seedData';
import {getCourses, getSessionsByCourse} from './src/firebase/services';
import {Course, Session} from './src/types';
import {
  buildSessionMetaTagsHtml,
  canAccessSessionPublicly,
  injectSeoMetaIntoHtml,
  matchesSessionIdentifier,
} from './src/utils/sessionShareHelper';

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

    // 1. Seed courses & sessions baseline
    for (const c of SEED_COURSES) {
      if (!c.isPublished) continue;
      for (const s of SEED_SESSIONS.filter(
        x => x.courseId === c.id && x.isPublished
      )) {
        entriesMap.set(s.id, {course: c, session: s});
      }
    }

    // 2. Load from public/session-seo-manifest.json if present
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

    // 3. Also query live Cloud Firestore via Firebase SDK for any newly published sessions
    try {
      const liveCourses = await getCourses(false);
      for (const c of liveCourses) {
        if (!c.isPublished) continue;
        const liveSessions = await getSessionsByCourse(c.id, false);
        for (const s of liveSessions) {
          if (s.isPublished) {
            entriesMap.set(s.id, {course: c, session: s});
          }
        }
      }
    } catch {
      // Fallback to manifest + seed data if offline
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
  };
}

function gdriveAudioProxyPlugin(): Plugin {
  const handleGdriveAudioMiddleware = async (req: any, res: any, next: any) => {
    const rawUrl = req.url || '';
    if (!rawUrl.startsWith('/api/gdrive-audio')) {
      return next();
    }

    try {
      const parsed = new URL(rawUrl, 'http://localhost:3000');
      const fileId = (parsed.searchParams.get('id') || '').trim();

      if (!/^[a-zA-Z0-9_-]{10,120}$/.test(fileId)) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            error: 'ID berkas Google Drive tidak valid.',
          })
        );
        return;
      }

      const upstreamUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
        fileId
      )}&export=download&confirm=t`;

      const requestHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      };
      if (req.headers && req.headers.range) {
        requestHeaders['Range'] = String(req.headers.range);
      }

      const upstreamRes = await fetch(upstreamUrl, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: requestHeaders,
        redirect: 'follow',
      });

      const upstreamContentType = (
        upstreamRes.headers.get('content-type') || ''
      ).toLowerCase();

      // If Google Drive returns an HTML page (login prompt, permission denied, or 404 page)
      if (!upstreamRes.ok || upstreamContentType.includes('text/html')) {
        res.statusCode = upstreamRes.status === 404 ? 404 : 403;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            error:
              'Berkas audio dari Google Drive tidak dapat diakses secara publik. Pastikan akses berkas diatur ke "Siapa saja yang memiliki link" (Anyone with the link) dan berkas berformat audio (.mp3/.m4a/.wav).',
          })
        );
        return;
      }

      const resolvedMime = upstreamContentType.startsWith('audio/')
        ? upstreamContentType
        : 'audio/mpeg';

      res.statusCode = upstreamRes.status;
      res.setHeader('Content-Type', resolvedMime);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const contentLength = upstreamRes.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      const contentRange = upstreamRes.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }

      if (req.method === 'HEAD' || !upstreamRes.body) {
        res.end();
        return;
      }

      const nodeStream = Readable.fromWeb(upstreamRes.body as any);
      nodeStream.on('error', () => {
        if (!res.writableEnded) res.end();
      });
      req.on('close', () => {
        nodeStream.destroy();
      });
      nodeStream.pipe(res);
    } catch (err: any) {
      if (!res.headersSent) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            error: 'Gagal menghubungi server penyimpanan Google Drive.',
          })
        );
      }
    }
  };

  return {
    name: 'dars-gdrive-audio-proxy',
    configureServer(server) {
      server.middlewares.use(handleGdriveAudioMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleGdriveAudioMiddleware);
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      gdriveAudioProxyPlugin(),
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
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

