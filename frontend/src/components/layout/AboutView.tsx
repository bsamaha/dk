import React from 'react';

const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gridiron-graphite dark:text-white mb-4">
          About TheSignalCallers
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Your premier destination for fantasy football draft analytics and insights
        </p>
      </div>

      {/* Mission Statement */}
      <div className="bg-white dark:bg-surface-dark-elev p-8 rounded-lg card-shadow">
        <h2 className="text-2xl font-semibold text-gridiron-graphite dark:text-white mb-4">
          Our Mission
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          TheSignalCallers is dedicated to providing fantasy football enthusiasts with 
          comprehensive draft analytics and data-driven insights. We analyze millions of 
          draft picks from real fantasy football leagues to help you make informed decisions 
          and gain a competitive edge in your fantasy football drafts.
        </p>
      </div>

      {/* What We Offer */}
      <div className="bg-white dark:bg-surface-dark-elev p-8 rounded-lg card-shadow">
        <h2 className="text-2xl font-semibold text-gridiron-graphite dark:text-white mb-6">
          What We Offer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-full bg-signal-green/20">
                <span className="text-signal-green text-lg">📊</span>
              </div>
              <div>
                <h3 className="font-semibold text-gridiron-graphite dark:text-white">
                  Comprehensive Analytics
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Deep dive into player performance, position trends, and draft patterns 
                  across thousands of fantasy football leagues.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-full bg-audible-gold/20">
                <span className="text-audible-gold text-lg">🎯</span>
              </div>
              <div>
                <h3 className="font-semibold text-gridiron-graphite dark:text-white">
                  Draft Strategy Insights
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Discover optimal draft positions, player combinations, and strategic 
                  approaches based on real-world draft data.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-full bg-turf-dark/20">
                <span className="text-turf-dark text-lg">📈</span>
              </div>
              <div>
                <h3 className="font-semibold text-gridiron-graphite dark:text-white">
                  Real-Time Data
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Access up-to-date statistics and trends from our comprehensive database 
                  of fantasy football drafts and player performances.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-full bg-signal-green/20">
                <span className="text-signal-green text-lg">🏆</span>
              </div>
              <div>
                <h3 className="font-semibold text-gridiron-graphite dark:text-white">
                  Expert Analysis
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Leverage our advanced analytics to identify undervalued players, 
                  optimal draft strategies, and winning combinations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-white dark:bg-surface-dark-elev p-8 rounded-lg card-shadow">
        <h2 className="text-2xl font-semibold text-gridiron-graphite dark:text-white mb-4">
          Our Data
        </h2>
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Our analytics are powered by a comprehensive dataset containing:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
            <li><strong>15,108+ Drafts</strong> analyzed from real fantasy football leagues</li>
            <li><strong>181,296+ Teams</strong> providing diverse draft strategies and outcomes</li>
            <li><strong>3.6+ Million Picks</strong> offering unprecedented insight into player selection patterns</li>
            <li><strong>601+ Unique Players</strong> with detailed performance metrics and draft trends</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mt-4">
            This extensive dataset allows us to provide you with the most accurate and 
            comprehensive fantasy football draft analytics available.
          </p>
        </div>
      </div>

      {/* Contact/Footer */}
      <div className="bg-white dark:bg-surface-dark-elev p-8 rounded-lg card-shadow text-center">
        <h2 className="text-2xl font-semibold text-gridiron-graphite dark:text-white mb-4">
          Get Started
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Ready to elevate your fantasy football game? Explore our analytics dashboard 
          and discover the insights that will give you the competitive advantage.
        </p>
        <div className="flex justify-center space-x-4">
          <a 
            href="https://thesignalcallers.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-3 bg-signal-green text-white rounded-lg hover:bg-signal-green/90 transition-colors font-medium"
          >
            Visit TheSignalCallers
          </a>
        </div>
      </div>
    </div>
  );
};

export default AboutView; 