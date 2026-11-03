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

  app.use(express.json({ limit: '5mb' }));

  // In-memory idempotency cache for deduplicating server-side notifications
  const processedIdempotencyKeys = new Set<string>();

  // Automated Student Email Notification Dispatch Endpoint
  app.post('/api/send-notification-email', async (req, res) => {
    try {
      const payload = req.body || {};
      const {
        type = 'announcement',
        title = '',
        subtitle = '',
        summary = '',
        contentHtml = '',
        targetUrl = 'https://darswithosama.com',
        targetButtonText = '',
        idempotencyKey = '',
        recipientEmails,
        isManualBroadcast = false
      } = payload;

      if (!title || !summary) {
        res.status(400).json({ error: 'Judul dan ringkasan notifikasi wajib diisi.' });
        return;
      }

      // 1. Idempotency Check (Pencegahan Pengiriman Ganda)
      const cleanKey = String(idempotencyKey || '').trim();
      if (cleanKey && processedIdempotencyKeys.has(cleanKey)) {
        res.status(200).json({
          success: true,
          idempotentSkipped: true,
          totalRecipients: 0,
          successCount: 0,
          failureCount: 0,
          status: 'completed',
          provider: 'none',
          idempotencyKey: cleanKey,
          message: 'Notifikasi ini telah dikirimkan sebelumnya (idempotent).'
        });
        return;
      }

      // Import email template helpers dynamically
      const {
        generateEmailHtml,
        generateEmailPlainText,
        generateEmailSubject,
        filterRecipientsByPreferences
      } = await import('./src/utils/emailTemplateHelper.ts');

      // 2. Determine target recipient emails respecting preferences & QA privacy
      let finalTargetEmails: Array<{ email: string; name?: string }> = [];

      if (Array.isArray(recipientEmails) && recipientEmails.length > 0) {
        // Explicit recipients (e.g. Q&A answer sent exclusively to the asker)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        finalTargetEmails = recipientEmails
          .map((e: any) => String(e || '').trim().toLowerCase())
          .filter((e: string) => emailRegex.test(e))
          .map((e: string) => ({ email: e }));
      } else {
        // General student list (default mock registered active students for fallback)
        const sampleStudents = [
          { id: 'st-1', email: 'masagitu233@gmail.com', displayName: 'Siswa Dars', role: 'student' as const },
          { id: 'st-2', email: 'osamanursamsil@gmail.com', displayName: 'Pengasuh', role: 'admin' as const }
        ];

        const eligibleStudents = filterRecipientsByPreferences(sampleStudents, type);
        finalTargetEmails = eligibleStudents.map(s => ({ email: s.email, name: s.displayName }));
      }

      // Avoid sending to empty list
      if (finalTargetEmails.length === 0) {
        res.status(200).json({
          success: true,
          totalRecipients: 0,
          successCount: 0,
          failureCount: 0,
          status: 'completed',
          provider: 'none',
          idempotencyKey: cleanKey,
          message: 'Tidak ada penerima yang memenuhi syarat preferensi notifikasi.'
        });
        return;
      }

      // 3. Determine Provider (Resend, Brevo, or Simulated)
      const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
      const brevoApiKey = process.env.BREVO_API_KEY || process.env.VITE_BREVO_API_KEY;

      let provider: 'resend' | 'brevo' | 'simulated' = 'simulated';
      let successCount = 0;
      let failureCount = 0;

      const subjectLine = generateEmailSubject(type, title);

      if (resendApiKey) {
        provider = 'resend';
        for (const target of finalTargetEmails) {
          try {
            const html = generateEmailHtml({
              type,
              title,
              subtitle,
              summary,
              contentHtml,
              targetUrl,
              targetButtonText,
              recipientEmail: target.email,
              recipientName: target.name
            });

            const rRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'Dars with Osama <notifikasi@darswithosama.com>',
                to: [target.email],
                subject: subjectLine,
                html
              })
            });

            if (rRes.ok) {
              successCount++;
            } else {
              failureCount++;
            }
          } catch {
            failureCount++;
          }
        }
      } else if (brevoApiKey) {
        provider = 'brevo';
        for (const target of finalTargetEmails) {
          try {
            const html = generateEmailHtml({
              type,
              title,
              subtitle,
              summary,
              contentHtml,
              targetUrl,
              targetButtonText,
              recipientEmail: target.email,
              recipientName: target.name
            });

            const bRes = await fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              headers: {
                'api-key': brevoApiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                sender: { name: 'Dars with Osama', email: 'notifikasi@darswithosama.com' },
                to: [{ email: target.email, name: target.name || 'Siswa' }],
                subject: subjectLine,
                htmlContent: html
              })
            });

            if (bRes.ok) {
              successCount++;
            } else {
              failureCount++;
            }
          } catch {
            failureCount++;
          }
        }
      } else {
        // Safe Simulated Mode (Zero runtime error, zero cost, full log compliance)
        provider = 'simulated';
        successCount = finalTargetEmails.length;
        failureCount = 0;
      }

      // Mark idempotency key as processed
      if (cleanKey) {
        processedIdempotencyKeys.add(cleanKey);
      }

      res.status(200).json({
        success: true,
        totalRecipients: finalTargetEmails.length,
        successCount,
        failureCount,
        status: provider === 'simulated' ? 'simulated' : failureCount === 0 ? 'completed' : 'partial',
        provider,
        idempotencyKey: cleanKey,
        recipientsSample: finalTargetEmails.slice(0, 5).map(t => t.email)
      });
    } catch (error: any) {
      console.error('/api/send-notification-email error:', error);
      res.status(500).json({
        error: error?.message || 'Gagal memproses pengiriman notifikasi email.'
      });
    }
  });

  // Google Drive audio streaming proxy endpoint with download confirmation bypass and range support
  app.all('/api/gdrive-audio', async (req, res) => {
    // 1. Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Origin, Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.status(204).end();
      return;
    }

    try {
      const fileId = String(req.query.id || '').trim();

      if (!/^[a-zA-Z0-9_-]{10,120}$/.test(fileId)) {
        res.status(400).json({
          error: 'ID berkas Google Drive tidak valid atau tidak ditemukan dalam tautan.',
          code: 'INVALID_ID'
        });
        return;
      }

      const requestHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': '*/*',
      };
      if (req.headers && req.headers.range) {
        requestHeaders['Range'] = String(req.headers.range);
      }

      const requestedFormat = String(req.query.format || '').toLowerCase();

      // Multi-strategy candidate URLs
      const candidateUrls = [
        `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
        `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`,
        `https://docs.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`
      ];

      let activeRes: Response | null = null;
      let lastHtmlSnippet = '';
      const cookies: string[] = [];

      for (const targetUrl of candidateUrls) {
        try {
          const fetchHeaders: Record<string, string> = { ...requestHeaders };
          if (cookies.length > 0) {
            fetchHeaders['Cookie'] = cookies.join('; ');
          }

          const candidateRes = await fetch(targetUrl, {
            method: req.method === 'HEAD' ? 'HEAD' : 'GET',
            headers: fetchHeaders,
            redirect: 'follow',
          });

          // Collect Set-Cookie headers
          const setCookieHeaders = (candidateRes.headers as any).getSetCookie
            ? (candidateRes.headers as any).getSetCookie()
            : candidateRes.headers.get('set-cookie')
            ? [candidateRes.headers.get('set-cookie')!]
            : [];
          for (const sc of setCookieHeaders) {
            const cookiePart = sc.split(';')[0];
            if (cookiePart && !cookies.includes(cookiePart)) {
              cookies.push(cookiePart);
            }
          }

          const cType = (candidateRes.headers.get('content-type') || '').toLowerCase();

          // Successful binary audio stream
          if (candidateRes.ok && !cType.includes('text/html')) {
            activeRes = candidateRes;
            break;
          }

          // If Google Drive returned an HTML page, check if it's a large file confirmation warning
          if (cType.includes('text/html')) {
            const htmlText = await candidateRes.text();
            lastHtmlSnippet = htmlText;

            // Extract confirmation token or uuid
            const confirmTokenMatch =
              htmlText.match(/[?&]confirm=([a-zA-Z0-9_-]+)/i) ||
              htmlText.match(/name="confirm"\s+value="([a-zA-Z0-9_-]+)"/i);
            const uuidMatch =
              htmlText.match(/[?&]uuid=([a-zA-Z0-9_-]+)/i) ||
              htmlText.match(/name="uuid"\s+value="([a-zA-Z0-9_-]+)"/i);

            if (confirmTokenMatch && confirmTokenMatch[1]) {
              const confirmToken = confirmTokenMatch[1];
              const uuidParam = uuidMatch && uuidMatch[1] ? `&uuid=${encodeURIComponent(uuidMatch[1])}` : '';
              const confirmedUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=${encodeURIComponent(confirmToken)}${uuidParam}`;

              const retryHeaders: Record<string, string> = { ...requestHeaders };
              if (cookies.length > 0) {
                retryHeaders['Cookie'] = cookies.join('; ');
              }

              const confirmedRes = await fetch(confirmedUrl, {
                method: req.method === 'HEAD' ? 'HEAD' : 'GET',
                headers: retryHeaders,
                redirect: 'follow',
              });

              const confirmedCType = (confirmedRes.headers.get('content-type') || '').toLowerCase();
              if (confirmedRes.ok && !confirmedCType.includes('text/html')) {
                activeRes = confirmedRes;
                break;
              }
            }
          }
        } catch {
          // Continue to next candidate URL
        }
      }

      // If no valid audio stream was obtained, classify the failure with precision
      if (!activeRes) {
        const lowerHtml = lastHtmlSnippet.toLowerCase();

        let statusCode = 403;
        let errorMessage = 'Akses berkas Google Drive ditolak (403). Pastikan akses umum berkas telah diatur ke "Siapa saja yang memiliki link" (Anyone with the link).';
        let errorCode = 'PERMISSION_DENIED';

        if (lowerHtml.includes('the file you requested does not exist') || lowerHtml.includes('file not found') || lowerHtml.includes('error 404')) {
          statusCode = 404;
          errorCode = 'NOT_FOUND';
          errorMessage = 'Berkas audio tidak ditemukan di Google Drive (404). Periksa kembali apakah tautan atau ID berkas valid dan belum dihapus.';
        } else if (lowerHtml.includes('too many users have viewed or downloaded') || lowerHtml.includes('quota') || lowerHtml.includes('rate limit')) {
          statusCode = 429;
          errorCode = 'QUOTA_EXCEEDED';
          errorMessage = 'Batas kuota pengunduhan Google Drive untuk berkas ini sedang terlampaui (429). Google membatasi pengunduhan berulang. Coba kembali beberapa saat lagi.';
        } else if (lowerHtml.includes('docs.google.com/document') || lowerHtml.includes('google-apps.document') || lowerHtml.includes('google-apps.spreadsheet')) {
          statusCode = 415;
          errorCode = 'NOT_AUDIO';
          errorMessage = 'Tautan yang dimasukkan mengarah ke Google Dokumen/Spreadsheet, bukan berkas audio (.mp3 atau .wav).';
        } else if (lowerHtml.includes('servicelogin') || lowerHtml.includes('accounts.google.com') || lowerHtml.includes('you need permission')) {
          statusCode = 403;
          errorCode = 'PERMISSION_DENIED';
          errorMessage = 'Akses berkas Google Drive dibatasi (403). Pastikan akses umum telah diatur ke "Siapa saja yang memiliki link" (Anyone with the link).';
        } else if (lowerHtml.includes("can't scan this file for viruses") || lowerHtml.includes('download_warning')) {
          statusCode = 502;
          errorCode = 'CONFIRMATION_REQUIRED';
          errorMessage = 'Google Drive memerlukan konfirmasi unduhan antivirus manual untuk berkas ini.';
        } else {
          statusCode = 502;
          errorCode = 'UPSTREAM_ERROR';
          errorMessage = 'Server Google Drive mengembalikan respons yang tidak dapat diputar sebagai berkas audio. Pastikan berkas berformat MP3 atau WAV standar.';
        }

        res.status(statusCode).json({
          error: errorMessage,
          code: errorCode,
          fileId
        });
        return;
      }

      const upstreamContentType = (
        activeRes.headers.get('content-type') || ''
      ).toLowerCase();
      const upstreamContentDisposition = (
        activeRes.headers.get('content-disposition') || ''
      ).toLowerCase();

      let resolvedMime = 'audio/mpeg';
      let recognizedFormat: 'mp3' | 'wav' | 'm4a' | 'ogg' = 'mp3';

      if (
        upstreamContentType.includes('wav') ||
        upstreamContentType.includes('wave') ||
        upstreamContentType.includes('x-wav') ||
        upstreamContentDisposition.includes('.wav') ||
        requestedFormat === 'wav'
      ) {
        resolvedMime = 'audio/wav';
        recognizedFormat = 'wav';
      } else if (
        upstreamContentType.includes('mp4') ||
        upstreamContentType.includes('m4a') ||
        upstreamContentDisposition.includes('.m4a') ||
        requestedFormat === 'm4a'
      ) {
        resolvedMime = 'audio/mp4';
        recognizedFormat = 'm4a';
      } else if (
        upstreamContentType.includes('ogg') ||
        upstreamContentDisposition.includes('.ogg') ||
        requestedFormat === 'ogg'
      ) {
        resolvedMime = 'audio/ogg';
        recognizedFormat = 'ogg';
      } else if (
        upstreamContentDisposition.includes('.mp3') ||
        upstreamContentType.includes('mpeg') ||
        requestedFormat === 'mp3'
      ) {
        resolvedMime = 'audio/mpeg';
        recognizedFormat = 'mp3';
      } else if (upstreamContentType.startsWith('audio/')) {
        resolvedMime = upstreamContentType;
      }

      res.status(activeRes.status);
      res.setHeader('Content-Type', resolvedMime);
      res.setHeader('X-Audio-Format', recognizedFormat);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Origin, Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, X-Audio-Format');

      const contentLength = activeRes.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      const contentRange = activeRes.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }

      if (req.method === 'HEAD' || !activeRes.body) {
        res.end();
        return;
      }

      const nodeStream = Readable.fromWeb(activeRes.body as any);
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
          code: 'CONNECTION_FAILED'
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
