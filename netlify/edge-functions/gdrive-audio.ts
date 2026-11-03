export default async function gdriveAudioEdgeHandler(
  request: Request
): Promise<Response> {
  const url = new URL(request.url);
  const fileId = (url.searchParams.get('id') || '').trim();

  if (!/^[a-zA-Z0-9_-]{10,120}$/.test(fileId)) {
    return new Response(
      JSON.stringify({ error: 'ID berkas Google Drive tidak valid.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }

  // 1. Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Accept, Origin, Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  const requestHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': '*/*'
  };

  const rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    requestHeaders['Range'] = rangeHeader;
  }

  const requestedFormat = (url.searchParams.get('format') || '').toLowerCase();

  const candidateUrls = [
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`,
    `https://docs.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`
  ];

  let activeRes: Response | null = null;
  let lastHtmlSnippet = '';
  const cookies: string[] = [];

  try {
    for (const targetUrl of candidateUrls) {
      try {
        const fetchHeaders: Record<string, string> = { ...requestHeaders };
        if (cookies.length > 0) {
          fetchHeaders['Cookie'] = cookies.join('; ');
        }

        const candidateRes = await fetch(targetUrl, {
          method: request.method === 'HEAD' ? 'HEAD' : 'GET',
          headers: fetchHeaders,
          redirect: 'follow'
        });

        const setCookie = candidateRes.headers.get('set-cookie');
        if (setCookie) {
          const cookiePart = setCookie.split(';')[0];
          if (cookiePart && !cookies.includes(cookiePart)) {
            cookies.push(cookiePart);
          }
        }

        const cType = (candidateRes.headers.get('content-type') || '').toLowerCase();

        if (candidateRes.ok && !cType.includes('text/html')) {
          activeRes = candidateRes;
          break;
        }

        if (cType.includes('text/html')) {
          const htmlText = await candidateRes.text();
          lastHtmlSnippet = htmlText;

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
              method: request.method === 'HEAD' ? 'HEAD' : 'GET',
              headers: retryHeaders,
              redirect: 'follow'
            });

            const confirmedCType = (confirmedRes.headers.get('content-type') || '').toLowerCase();
            if (confirmedRes.ok && !confirmedCType.includes('text/html')) {
              activeRes = confirmedRes;
              break;
            }
          }
        }
      } catch {
        // Continue
      }
    }

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

      return new Response(
        JSON.stringify({ error: errorMessage, code: errorCode, fileId }),
        {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
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

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', resolvedMime);
    responseHeaders.set('X-Audio-Format', recognizedFormat);
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Content-Disposition', 'inline');
    responseHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Accept, Origin, Content-Type');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, X-Audio-Format');

    const contentLength = activeRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }
    const contentRange = activeRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    return new Response(request.method === 'HEAD' ? null : activeRes.body, {
      status: activeRes.status,
      headers: responseHeaders
    });
  } catch {
    return new Response(
      JSON.stringify({
        error: 'Gagal menghubungi server penyimpanan Google Drive.',
        code: 'CONNECTION_FAILED'
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}
