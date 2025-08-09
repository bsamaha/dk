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

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gradient-to-b from-gridiron-graphite to-surface-dark">
      {/* Hero */}
      <section className="px-4 sm:px-6 md:px-10 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="flex items-center justify-center md:justify-start">
            <Logo
              variant="horizontal"
              className="w-[280px] sm:w-[340px] md:w-[400px] drop-shadow-lg"
            />
          </div>
          <div className="text-left text-white space-y-4">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold">
              The Signal Callers
            </h1>
            <p className="text-base sm:text-lg text-gray-200 leading-relaxed">
              Read the coverage. Call the win. We turn thousands of real draft
              rooms into clear, actionable insights so you can out‑draft the
              room with confidence.
            </p>
            {/* No CTAs in hero to avoid duplication; see unified socials below */}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="flex-grow px-4 sm:px-6 md:px-10 pb-12">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* About Section */}
          <div className="bg-white dark:bg-surface-dark rounded-card border border-gray-200 dark:border-white/10 p-6 sm:p-8 shadow-card">
            <div className="text-left">
              <p className="text-base sm:text-lg leading-relaxed text-gray-700 dark:text-gray-200">
                Welcome to your go‑to hub for Best Ball fantasy football
                analytics. Our platform delivers a data‑driven edge, powered by
                insights derived from thousands of real‑world drafts.
              </p>
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-gray-700 dark:text-gray-200">
                We analyze Average Draft Position (ADP), draft trends, player
                combinations, and roster constructions to help you build
                winning teams. Whether you are new to best ball or a seasoned
                grinder, our tools are designed to make smarter decisions
                faster.
              </p>
            </div>
          </div>

        {/* What You'll Find - quick value props */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center text-center gap-2">
            <IconChartBar className="text-signal-green" />
            <h4 className="font-semibold">Actionable Insights</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ADP trends, roster construction tips, and player correlations you
              can use today.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center text-center gap-2">
            <IconDeviceAnalytics className="text-signal-green" />
            <h4 className="font-semibold">Transparent Methods</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We explain the why behind the numbers so you learn as you draft.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center text-center gap-2">
            <IconTrophy className="text-signal-green" />
            <h4 className="font-semibold">Built To Win</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tools for both newcomers and sharps to make better, faster calls.
            </p>
          </div>
        </div>

        {/* Socials Section - one place for all channels */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gridiron-graphite dark:text-white mb-2">
              Follow us
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your choice of platform — same handle, same signal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <a
              href={SPOTIFY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium"
              aria-label="Listen on Spotify"
              title="Listen on Spotify"
            >
              <IconBrandSpotify size={18} />
              <span>Spotify</span>
            </a>
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              aria-label="Watch on YouTube"
              title="Watch on YouTube"
            >
              <IconBrandYoutube size={18} />
              <span>YouTube</span>
            </a>
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              aria-label="Follow on X"
              title="Follow on X"
            >
              <IconBrandX size={18} />
              <span>X</span>
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 text-white hover:from-pink-600 hover:to-violet-700 transition-colors font-medium"
              aria-label="Follow on Instagram"
              title="Follow on Instagram"
            >
              <IconBrandInstagram size={18} />
              <span>Instagram</span>
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-black text-white hover:bg-neutral-900 transition-colors font-medium"
              aria-label="Follow on TikTok"
              title="Follow on TikTok"
            >
              <IconBrandTiktok size={18} />
              <span>TikTok</span>
            </a>
          </div>
        </div>

        {/* Contact Section - single place for outreach */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gridiron-graphite dark:text-white mb-2">
              Have a Suggestion or Question?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              We'd love to hear from you! The best ways to reach us are below.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:team@thesignalcallers.com"
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-signal-green text-white rounded-lg hover:bg-signal-green/90 transition-colors font-medium"
            >
              <IconMail size={18} />
              <span>Email us at team@thesignalcallers.com</span>
            </a>
          </div>
        </div>
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
