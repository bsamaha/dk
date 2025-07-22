import React, { useState } from 'react';
import Logo from '../ui/Logo';
import {
  IconMail,
  IconBrandX,
  IconSend,
  IconMessage,
} from '@tabler/icons-react';

const AboutView: React.FC = () => {
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleEmailSuggestion = () => {
    const subject = encodeURIComponent(
      'TheSignalCallers - Suggestion/Feedback'
    );
    const body = encodeURIComponent(
      `Hi Signal Callers team,\n\nI have a suggestion/feedback:\n\n${suggestion}\n\nThanks!`
    );
    window.open(
      `mailto:team@thesignalcallers.com?subject=${subject}&body=${body}`
    );
  };

  const handleXDM = () => {
    window.open('https://x.com/signalcallers', '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    setIsSubmitting(true);

    // Simulate submission delay
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setSuggestion('');

      // Reset after 3 seconds
      setTimeout(() => setSubmitted(false), 3000);
    }, 1000);
  };

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
            We are DFS diehards who want to dig into the data and share our
            knowledge with our degenerate brethren. This is currently a side
            project we are testing out, so please feel free to give us some
            feedback!
          </p>

          {/* Contact Information */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
            <a
              href="mailto:team@thesignalcallers.com"
              className="flex items-center space-x-2 px-4 py-2 bg-signal-green text-white rounded-lg hover:bg-signal-green/90 transition-colors"
            >
              <IconMail size={20} />
              <span>team@thesignalcallers.com</span>
            </a>
            <a
              href="https://x.com/signalcallers"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-colors"
            >
              <IconBrandX size={20} />
              <span>@signalcallers</span>
            </a>
          </div>
        </div>
      </div>

      {/* Suggestion Box */}
      <div className="bg-white dark:bg-surface-dark-elev p-8 rounded-lg card-shadow max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gridiron-graphite dark:text-white mb-4 text-center">
          Have a Suggestion?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
          We'd love to hear your ideas for improving The Signal Callers!
        </p>

        {submitted ? (
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-700 dark:text-green-300 font-medium">
              Thanks for your suggestion! We'll review it and get back to you.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={suggestion}
                onChange={e => setSuggestion(e.target.value)}
                placeholder="Share your suggestions, feedback, or ideas for new features..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-surface-dark text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-signal-green focus:border-transparent resize-none"
                rows={4}
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !suggestion.trim()}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-signal-green text-white rounded-lg hover:bg-signal-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <IconSend size={18} />
                    <span>Submit Suggestion</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleEmailSuggestion}
                disabled={!suggestion.trim()}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <IconMail size={18} />
                <span>Email Us</span>
              </button>

              <button
                type="button"
                onClick={handleXDM}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-colors"
              >
                <IconMessage size={18} />
                <span>DM on X</span>
              </button>
            </div>
          </form>
        )}
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
