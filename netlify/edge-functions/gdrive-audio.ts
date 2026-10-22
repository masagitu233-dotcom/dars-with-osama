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

  const upstreamUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
    fileId
  )}&export=download&confirm=t`;

  const requestHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  };

  const rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    requestHeaders['Range'] = rangeHeader;
  }

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: requestHeaders,
      redirect: 'follow'
    });

    const upstreamContentType = (
      upstreamRes.headers.get('content-type') || ''
    ).toLowerCase();

    if (!upstreamRes.ok || upstreamContentType.includes('text/html')) {
      return new Response(
        JSON.stringify({
          error:
            'Berkas audio dari Google Drive tidak dapat diakses secara publik. Pastikan akses berkas diatur ke "Siapa saja yang memiliki link" (Anyone with the link) dan berkas berformat audio (.mp3/.m4a/.wav).'
        }),
        {
          status: upstreamRes.status === 404 ? 404 : 403,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }

    const resolvedMime = upstreamContentType.startsWith('audio/')
      ? upstreamContentType
      : 'audio/mpeg';

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', resolvedMime);
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Content-Disposition', 'inline');
    responseHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }
    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    return new Response(request.method === 'HEAD' ? null : upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders
    });
  } catch {
    return new Response(
      JSON.stringify({
        error: 'Gagal menghubungi server penyimpanan Google Drive.'
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
}
