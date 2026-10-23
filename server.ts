import express from 'express';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type { Course, Session } from './src/types/index.ts';
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
  entries: Array<{ course: Course; session: Session }>;
} | null = null;

async function getPublishedSessionForSeo(
  identifier: string
): Promise<{ session: Session; course: Course | null } | null> {
  const now = Date.now();
  if (!cachedEntries || now - cachedEntries.timestamp > 30000) {
    const entriesMap = new Map<string, { course: Course; session: Session }>();

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

  for (const { course, session } of cachedEntries.entries) {
    if (matchesSessionIdentifier(session, identifier)) {
      if (!canAccessSessionPublicly(session, course)) {
        return null;
      }
      return { session, course };
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Google Drive audio streaming proxy endpoint
  app.all('/api/gdrive-audio', async (req, res) => {
    try {
      const fileId = String(req.query.id || '').trim();

      if (!/^[a-zA-Z0-9_-]{10,120}$/.test(fileId)) {
        res.status(400).json({
          error: 'ID berkas Google Drive tidak valid.',
        });
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

      if (!upstreamRes.ok || upstreamContentType.includes('text/html')) {
        res.status(upstreamRes.status === 404 ? 404 : 403).json({
          error:
            'Berkas audio dari Google Drive tidak dapat diakses secara publik. Pastikan akses berkas diatur ke "Siapa saja yang memiliki link" (Anyone with the link) dan berkas berformat audio (.mp3/.m4a/.wav).',
        });
        return;
      }

      const resolvedMime = upstreamContentType.startsWith('audio/')
        ? upstreamContentType
        : 'audio/mpeg';

      res.status(upstreamRes.status);
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
    } catch {
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Gagal menghubungi server penyimpanan Google Drive.',
        });
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', async (req, res) => {
      try {
        const indexPath = path.join(distPath, 'index.html');
        if (!fs.existsSync(indexPath)) {
          res.status(404).send('Not found');
          return;
        }
        let html = fs.readFileSync(indexPath, 'utf-8');
        const pathMatch = req.path.match(/^\/session\/([^/]+)\/?$/i);
        const identifier = pathMatch
          ? decodeURIComponent(pathMatch[1])
          : (req.query.session as string) || (req.query.sessionId as string);

        if (identifier) {
          const resolved = await getPublishedSessionForSeo(identifier);
          if (resolved) {
            const seoMetaTags = buildSessionMetaTagsHtml(
              resolved.session,
              resolved.course,
              'https://darswithosama.com'
            );
            html = injectSeoMetaIntoHtml(html, seoMetaTags);
          }
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
      } catch {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });
}

startServer();
