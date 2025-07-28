/**
 * Bundle optimization utilities
 * Helps reduce bundle size and improve loading performance
 */

// Tree shaking helper - only import what's needed
export const importOnlyNeeded = {
  // Lodash utilities (import only specific functions)
  debounce: () => import('lodash/debounce'),
  throttle: () => import('lodash/throttle'),
  memoize: () => import('lodash/memoize'),
  
  // Chart.js components (import only needed chart types)
  LineChart: () => import('chart.js/auto').then(module => module.LineController),
  BarChart: () => import('chart.js/auto').then(module => module.BarController),
  
  // Date utilities (import only needed functions)
  formatDate: () => import('date-fns/format'),
  parseDate: () => import('date-fns/parse'),
  isValid: () => import('date-fns/isValid'),
};

// Dynamic import helper with error handling
export const dynamicImport = async (importFn, fallback = null) => {
  try {
    const module = await importFn();
    return module.default || module;
  } catch (error) {
    console.warn('Dynamic import failed:', error);
    return fallback;
  }
};

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload critical CSS
  const criticalCSS = [
    '/static/css/subscription.css',
    '/static/css/apple-design.css'
  ];
  
  criticalCSS.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    document.head.appendChild(link);
  });
  
  // Preload critical fonts
  const criticalFonts = [
    '/static/fonts/sf-pro-display.woff2',
    '/static/fonts/sf-pro-text.woff2'
  ];
  
  criticalFonts.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = href;
    document.head.appendChild(link);
  });
};

// Resource hints for better performance
export const addResourceHints = () => {
  // DNS prefetch for external resources
  const dnsPrefetch = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ];
  
  dnsPrefetch.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = href;
    document.head.appendChild(link);
  });
  
  // Preconnect to critical origins
  const preconnect = [
    'https://api.example.com'
  ];
  
  preconnect.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// Webpack bundle analyzer helper (development only)
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    // Log bundle information
    console.group('Bundle Analysis');
    console.log('Main bundle size:', document.querySelector('script[src*="main"]')?.src);
    console.log('Vendor bundle size:', document.querySelector('script[src*="vendor"]')?.src);
    console.log('CSS bundle size:', document.querySelector('link[href*="main"]')?.href);
    console.groupEnd();
  }
};

// Performance monitoring
export const monitorPerformance = () => {
  if ('performance' in window) {
    // Monitor First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          console.log('FCP:', entry.startTime);
        }
        if (entry.name === 'largest-contentful-paint') {
          console.log('LCP:', entry.startTime);
        }
      }
    });
    
    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
    
    // Monitor bundle loading times
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      console.log('Page load time:', navigation.loadEventEnd - navigation.loadEventStart);
      
      const resources = performance.getEntriesByType('resource');
      const jsResources = resources.filter(r => r.name.includes('.js'));
      const cssResources = resources.filter(r => r.name.includes('.css'));
      
      console.log('JS loading time:', jsResources.reduce((sum, r) => sum + r.duration, 0));
      console.log('CSS loading time:', cssResources.reduce((sum, r) => sum + r.duration, 0));
    });
  }
};

// Initialize performance optimizations
export const initializeOptimizations = () => {
  preloadCriticalResources();
  addResourceHints();
  
  if (process.env.NODE_ENV === 'development') {
    analyzeBundleSize();
    monitorPerformance();
  }
};