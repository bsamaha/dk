import React from 'react';
import Logo from '../ui/Logo';

const AboutView: React.FC = () => {
  return (
    <div className="space-y-8 w-full">
      {/* Header with Large Logo */}
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <Logo variant="mark" size={450} className="drop-shadow-lg" />
        </div>
        <h1 className="text-4xl font-bold text-gridiron-graphite dark:text-white mb-6">
          Welcome to The Signal Callers!
        </h1>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-surface-dark-elev p-8 rounded-lg card-shadow max-w-4xl mx-auto">
        <div className="text-center">
          <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            We are DFS diehards who want dig into the data and share our
            knowledge with our degenerate brethren. This is currently a side
            project we are testing out, so please feel free to give us some
            feedback{' '}
            <span className="text-signal-green font-semibold">
              [PLACEHOLD FOR CONTACT INFO]
            </span>
          </p>
        </div>
      </div>

      {/* Optional Footer Section */}
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Built with ❤️ for the DFS community
        </p>
      </div>
    </div>
  );
};

export default AboutView;
