import React from 'react';
import Logo from '../ui/Logo';
import {
  IconMail,
  IconBrandX,
  IconBrandSpotify,
  IconBrandYoutube,
  IconBrandInstagram,
  IconBrandTiktok,
  IconChartBar,
  IconDeviceAnalytics,
  IconTrophy,
} from '@tabler/icons-react';

const AboutView: React.FC = () => {
  // Links
  const SPOTIFY_URL =
    'https://open.spotify.com/show/5bN7N0PinX56rsSAomHZd8';
  const YOUTUBE_URL = 'https://www.youtube.com/@TheSignalCallers/videos';
  const X_URL = 'https://x.com/signalcallers';
  const INSTAGRAM_URL = 'https://www.instagram.com/thesignalcallers';
  const TIKTOK_URL = 'https://www.tiktok.com/@thesignalcallers';

  // Embeds
  const SPOTIFY_EMBED_SRC =
    'https://open.spotify.com/embed/show/5bN7N0PinX56rsSAomHZd8?utm_source=generator';
  // If you know the YouTube uploads playlist (UU...) set VITE_YT_UPLOADS_PLAYLIST_ID in env
  const YT_UPLOADS_PLAYLIST_ID = (import.meta as any).env
    ?.VITE_YT_UPLOADS_PLAYLIST_ID as string | undefined;
  const YT_CHANNEL_ID = (import.meta as any).env
    ?.VITE_YT_CHANNEL_ID as string | undefined;
  const deriveUploadsPlaylistId = (channelId?: string): string | undefined => {
    if (!channelId) return undefined;
    return channelId.startsWith('UC')
      ? `UU${channelId.substring(2)}`
      : undefined;
  };
  const YT_EFFECTIVE_PLAYLIST_ID =
    YT_UPLOADS_PLAYLIST_ID || deriveUploadsPlaylistId(YT_CHANNEL_ID);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gradient-to-b from-gridiron-graphite to-surface-dark">
      {/* Hero */}
      <section className="px-4 sm:px-6 md:px-10 py-8 sm:py-10">
        <div className="max-w-6xl mx-auto grid grid-cols-12 gap-6 md:gap-8 items-start">
          {/* Left: Logo */}
          <div className="col-span-12 lg:col-span-4 flex items-center justify-start">
            <Logo
              variant="horizontal"
              className="w-48 sm:w-60 md:w-72 drop-shadow-lg"
            />
          </div>

          {/* Right: All buttons stacked vertically */}
          <div className="col-span-12 lg:col-span-8 w-full flex">
            <div className="flex flex-col gap-2.5 w-full max-w-sm items-stretch">
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 px-4 rounded-lg bg-black text-white hover:bg-neutral-900 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="Follow on X"
                title="Follow on X"
              >
                <IconBrandX size={18} /> Follow on X
              </a>
              <a
                href={YOUTUBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60"
                aria-label="Watch on YouTube"
                title="Watch on YouTube"
              >
                <IconBrandYoutube size={18} /> Watch on YouTube
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 px-4 rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 text-white hover:from-pink-600 hover:to-violet-700 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/60"
                aria-label="Follow on Instagram"
                title="Follow on Instagram"
              >
                <IconBrandInstagram size={18} /> Follow on Instagram
              </a>
              <a
                href={SPOTIFY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
                aria-label="Listen on Spotify"
                title="Listen on Spotify"
              >
                <IconBrandSpotify size={18} /> Listen on Spotify
              </a>
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 px-4 rounded-lg bg-black text-white hover:bg-neutral-900 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="Follow on TikTok"
                title="Follow on TikTok"
              >
                <IconBrandTiktok size={18} /> Follow on TikTok
              </a>
              <a
                href="mailto:team@thesignalcallers.com"
                className="inline-flex h-11 items-center justify-center gap-2 px-4 rounded-lg bg-surface-dark text-gray-200 hover:bg-surface-dark-elev border border-white/10 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                <IconMail size={18} /> Email us: team@thesignalcallers.com
              </a>
            </div>
          </div>

          {/* Full-width copy below */}
          <div className="col-span-12 text-left text-white space-y-2 max-w-5xl">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold">
              The Signal Callers
            </h1>
            <p className="text-base sm:text-lg text-gray-200 leading-relaxed">
              Need a pod that blends contest-level DFS theory with locker-room
              laughs? Welcome to The Signal Callers DFS Show. Kevin runs the
              production board, Trey dissects rising ADPs, and Blake - our Data
              Wizard - spins machine-learning models into actionable lineup
              advice. We grade our own bad plays live, because “learn how we
              lose money so you don’t have to” is the motto. Light swearing,
              sharp data, and the occasional on-air beverage included.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="flex-grow px-4 sm:px-6 md:px-10 pb-12">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Latest media embeds (stacked vertically) */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-surface-dark rounded-card border border-gray-200 dark:border-white/10 p-4 sm:p-5 shadow-card">
              <h3 className="text-base font-semibold mb-3 text-gridiron-graphite dark:text-white">
                Latest on Spotify
              </h3>
              <div className="relative w-full max-w-xl mx-auto" style={{ paddingTop: '152px' }}>
                <iframe
                  title="Spotify latest show"
                  src={SPOTIFY_EMBED_SRC}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="absolute top-0 left-0 w-full h-[152px] rounded-lg border-0"
                />
              </div>
            </div>
            <div className="bg-white dark:bg-surface-dark rounded-card border border-gray-200 dark:border-white/10 p-4 sm:p-5 shadow-card">
              <h3 className="text-base font-semibold mb-3 text-gridiron-graphite dark:text-white">
                Latest on YouTube
              </h3>
              {YT_EFFECTIVE_PLAYLIST_ID ? (
                <div className="relative w-full max-w-xl mx-auto" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    title="YouTube latest uploads"
                    src={`https://www.youtube.com/embed?listType=playlist&list=${YT_EFFECTIVE_PLAYLIST_ID}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    loading="lazy"
                    className="absolute top-0 left-0 w-full h-full rounded-lg border-0"
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Set <code className="font-code">VITE_YT_UPLOADS_PLAYLIST_ID</code> or
                  <code className="font-code"> VITE_YT_CHANNEL_ID</code> to auto‑embed
                  the latest video. For now, visit our channel:
                  <a
                    href={YOUTUBE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-signal-green underline"
                  >
                    YouTube @TheSignalCallers
                  </a>
                  .
                </p>
              )}
            </div>
          </div>
          {/* About Section removed per request */}

        {/* Value props section removed per request */}

        {/* Socials & contact are now in the hero; no duplication here */}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center flex-shrink-0 pb-8">
        <p className="text-sm text-gray-300">Built with ❤️ for the DFS community</p>
      </div>
    </div>
  );
};

export default AboutView;
