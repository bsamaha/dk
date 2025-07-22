import React, { useState } from 'react';
import Logo from '../ui/Logo';
import { IconMail, IconBrandX } from '@tabler/icons-react';

const AboutView: React.FC = () => {
  const [suggestion, setSuggestion] = useState('');
  const [email, setEmail] = useState('');

  const handleEmailSuggestion = () => {
    const subject = encodeURIComponent(
      'TheSignalCallers - Suggestion/Feedback'
    );
    const body = encodeURIComponent(
      `Hi Signal Callers team,\n\nI have a suggestion/feedback:\n\n${suggestion}\n\n${email ? `Please reply to: ${email}` : ''}\n\nThanks!`
    );
    const mailtoLink = `mailto:team@thesignalcallers.com?subject=${subject}&body=${body}`;
    const a = document.createElement('a');
    a.href = mailtoLink;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleXDM = () => {
    window.open('https://x.com/signalcallers', '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-12">
      {/* Header Section */}
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <Logo variant="mark" size={250} className="drop-shadow-lg" />
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gridiron-graphite dark:text-white">
            Welcome to The Signal Callers!
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
            We are DFS diehards who want to dig into the data and share our
            knowledge with our degenerate brethren. This is currently a side
            project we are testing out, so please feel free to give us some
            feedback!
          </p>
        </div>
      </div>

      {/* Contact & Feedback Section */}
      <div className="bg-white dark:bg-surface-dark-elev rounded-xl card-shadow p-8 space-y-8">
        {/* Contact Information */}
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-gridiron-graphite dark:text-white">
            Get in Touch
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:team@thesignalcallers.com"
              className="flex items-center space-x-2 px-4 py-2 text-signal-green hover:text-signal-green/80 transition-colors"
            >
              <IconMail size={18} />
              <span>team@thesignalcallers.com</span>
            </a>
            <span className="text-gray-400">•</span>
            <a
              href="https://x.com/signalcallers"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <IconBrandX size={18} />
              <span>@signalcallers</span>
            </a>
          </div>
        </div>

        {/* Suggestion Box */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gridiron-graphite dark:text-white mb-2">
              Have a Suggestion?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We'd love to hear your ideas for improving The Signal Callers!
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your email (optional - for follow-up questions)"
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-surface-dark text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-signal-green focus:border-transparent"
            />

            <textarea
              value={suggestion}
              onChange={e => setSuggestion(e.target.value)}
              placeholder="Share your suggestions, feedback, or ideas for new features..."
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-surface-dark text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-signal-green focus:border-transparent resize-none"
              rows={3}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleEmailSuggestion}
                disabled={!suggestion.trim()}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-signal-green text-white rounded-lg hover:bg-signal-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <IconMail size={18} />
                <span>Email Suggestion</span>
              </button>

              <button
                onClick={handleXDM}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                <IconBrandX size={18} />
                <span>DM on X</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Built with ❤️ for the DFS community
        </p>
      </div>
    </div>
  );
};

export default AboutView;
