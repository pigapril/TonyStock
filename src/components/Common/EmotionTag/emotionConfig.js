/**
 * Emotion configuration for different sentiment types
 */
export const EMOTION_CONFIG = {
  extremeFear: {
    color: '#0000FF',
    intensity: 'high',
    pulseSpeed: '2s',
    glowColor: 'rgba(0, 0, 255, 0.3)',
    description: 'Extreme fear zone - market panic and overselling'
  },
  fear: {
    color: '#5B9BD5',
    intensity: 'medium',
    pulseSpeed: '2.5s',
    glowColor: 'rgba(91, 155, 213, 0.3)',
    description: 'Fear zone - market uncertainty and caution'
  },
  neutral: {
    color: '#708090',
    intensity: 'low',
    pulseSpeed: '3s',
    glowColor: 'rgba(112, 128, 144, 0.3)',
    description: 'Neutral zone - balanced market sentiment'
  },
  greed: {
    color: '#F0B8CE',
    intensity: 'medium',
    pulseSpeed: '2.5s',
    glowColor: 'rgba(240, 184, 206, 0.3)',
    description: 'Greed zone - market optimism and risk-taking'
  },
  extremeGreed: {
    color: '#D24A93',
    intensity: 'high',
    pulseSpeed: '2s',
    glowColor: 'rgba(210, 74, 147, 0.3)',
    description: 'Extreme greed zone - market euphoria and overbuying'
  },
  notAvailable: {
    color: '#6c757d',
    intensity: 'none',
    pulseSpeed: 'none',
    glowColor: 'rgba(108, 117, 125, 0.2)',
    description: 'Data not available'
  }
};

/**
 * Get emotion configuration for a specific sentiment type
 * @param {string} sentimentType - The sentiment type
 * @returns {object} The emotion configuration
 */
export const getEmotionConfig = (sentimentType) => {
  return EMOTION_CONFIG[sentimentType] || EMOTION_CONFIG.neutral;
};

/**
 * Get all available sentiment types
 * @returns {string[]} Array of sentiment type keys
 */
export const getSentimentTypes = () => {
  return Object.keys(EMOTION_CONFIG);
};

/**
 * Check if a sentiment type is extreme (high intensity)
 * @param {string} sentimentType - The sentiment type
 * @returns {boolean} True if the sentiment is extreme
 */
export const isExtremeSentiment = (sentimentType) => {
  const config = getEmotionConfig(sentimentType);
  return config.intensity === 'high';
};

/**
 * Get CSS custom properties for a sentiment type
 * @param {string} sentimentType - The sentiment type
 * @returns {object} CSS custom properties object
 */
export const getSentimentCSSProperties = (sentimentType) => {
  const config = getEmotionConfig(sentimentType);
  return {
    '--emotion-sentiment-color': config.color,
    '--emotion-sentiment-glow': config.glowColor,
    '--emotion-pulse-speed': config.pulseSpeed
  };
};