import React from 'react';
import Logo from '../ui/Logo';
import { IconMail, IconBrandX } from '@tabler/icons-react';

const AboutView: React.FC = () => {
  const handleXDM = () => {
    window.open('https://x.com/signalcallers', '_blank');
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto bg-neutral-900">
      {/* Centered Header with larger logo */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center text-center space-y-4">
        <Logo variant="mark" size={500} className="drop-shadow-lg" />
        <h1 className="text-3xl font-bold text-white">The Signal Callers</h1>
      </div>

      {/* Main Content */}
      <div className="flex-grow bg-white dark:bg-surface-dark p-6 sm:p-8 rounded-lg shadow-sm space-y-8 max-w-4xl mx-auto w-full">
        {/* About Section - Centered and improved text flow */}
        <div className="prose prose-lg dark:prose-invert max-w-none text-center">
          <p className="text-xl leading-relaxed">
            Welcome to your go-to hub for Best Ball fantasy football analytics.
            Our platform is designed to give you a data-driven edge in your
            drafts by providing insights derived from thousands of real-world
            drafts.
          </p>
          <p>
            We analyze Average Draft Position (ADP), draft trends, player
            combinations, and roster constructions to help you build winning
            teams. Our tools are built for both seasoned pros and newcomers
            looking to sharpen their strategy.
          </p>
        </div>

        {/* Contact/Suggestion Section */}
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

            <button
              onClick={handleXDM}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              <IconBrandX size={18} />
              <span>DM @SignalCallers on X</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center flex-shrink-0">
        <p className="text-sm text-gray-300">
          Built with ❤️ for the DFS community
        </p>
      </div>
    </div>
  );
};

export default AboutView;
