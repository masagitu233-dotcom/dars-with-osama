import React from 'react';
import { ExternalLink, Video } from 'lucide-react';

interface YouTubeEmbedProps {
  url?: string;
  title?: string;
  className?: string;
}

export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  // Match youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ url, title = 'Video Pembelajaran', className = '' }) => {
  const videoId = extractYouTubeId(url);

  if (!url) {
    return (
      <div className={`bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 aspect-video rounded-2xl flex flex-col items-center justify-center text-stone-500 dark:text-stone-400 p-6 ${className}`}>
        <Video className="w-12 h-12 mb-3 text-stone-400 dark:text-stone-600" />
        <p className="text-sm font-medium">Belum ada video rekaman untuk sesi ini</p>
      </div>
    );
  }

  if (!videoId) {
    // Might be direct video link or non-standard URL
    return (
      <div className={`bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 aspect-video rounded-2xl flex flex-col items-center justify-center text-stone-800 dark:text-stone-200 p-6 ${className}`}>
        <Video className="w-12 h-12 mb-3 text-emerald-600 dark:text-emerald-400" />
        <p className="text-base font-semibold mb-2">Tautan Video Eksternal</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition cursor-pointer shadow-md"
        >
          <span>Buka Pemutar Video</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg border border-stone-800 ${className}`}>
      <iframe
        className="w-full h-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
};
