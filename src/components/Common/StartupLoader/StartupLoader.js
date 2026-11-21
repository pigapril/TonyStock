import React, { useEffect, useState } from 'react';
import BrandLogo from '../BrandLogo/BrandLogo';
import './StartupLoader.css';

const StartupLoader = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Avoid flashing a loader when the application is ready almost immediately.
    const timer = window.setTimeout(() => setIsVisible(true), 150);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main
      className={`startup-loader${isVisible ? ' startup-loader--visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading Sentiment Inside Out"
    >
      <div className="startup-loader__content" aria-hidden={!isVisible}>
        <BrandLogo
          alt="Sentiment Inside Out"
          className="startup-loader__logo"
          width={212}
          height={36}
        />

        <div className="startup-loader__signal" aria-hidden="true">
          <svg viewBox="0 0 220 38" focusable="false">
            <defs>
              <linearGradient id="startup-loader-signal-gradient" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#28d7e5" />
                <stop offset="0.58" stopColor="#6b79f3" />
                <stop offset="1" stopColor="#ef3f98" />
              </linearGradient>
            </defs>
            <path
              className="startup-loader__signal-track"
              d="M1 20 H30 L42 13 L52 24 L63 8 L73 20 H112 L124 15 L133 22 L143 10 L154 20 H219"
            />
            <path
              className="startup-loader__signal-pulse"
              d="M1 20 H30 L42 13 L52 24 L63 8 L73 20 H112 L124 15 L133 22 L143 10 L154 20 H219"
            />
            <circle className="startup-loader__signal-point" cx="143" cy="10" r="3" />
          </svg>
        </div>

        <div className="startup-loader__progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </main>
  );
};

export default StartupLoader;
