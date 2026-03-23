const scriptPromises = new Map();

function getScriptElement(id) {
  return typeof document === 'undefined' ? null : document.getElementById(id);
}

export function loadExternalScript({
  id,
  src,
  async = true,
  defer = true,
  attributes = {},
  onLoad
}) {
  if (typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  const existingPromise = scriptPromises.get(id);
  if (existingPromise) {
    return existingPromise;
  }

  const existingScript = getScriptElement(id);
  if (existingScript) {
    const resolvedPromise = Promise.resolve(existingScript);
    scriptPromises.set(id, resolvedPromise);
    return resolvedPromise;
  }

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = async;
    script.defer = defer;

    Object.entries(attributes).forEach(([name, value]) => {
      if (value !== undefined && value !== null) {
        script.setAttribute(name, value);
      }
    });

    script.onload = () => {
      onLoad?.();
      resolve(script);
    };
    script.onerror = (error) => {
      scriptPromises.delete(id);
      reject(error);
    };

    document.head.appendChild(script);
  });

  scriptPromises.set(id, promise);
  return promise;
}

export function ensureDataLayer() {
  if (typeof window === 'undefined') {
    return [];
  }

  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

export function ensureGoogleTagManager(containerId) {
  if (!containerId || typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  const dataLayer = ensureDataLayer();
  const alreadyBootstrapped = window.__gtmContainerId === containerId;

  if (!alreadyBootstrapped) {
    dataLayer.push({
      'gtm.start': Date.now(),
      event: 'gtm.js'
    });
    window.__gtmContainerId = containerId;
  }

  return loadExternalScript({
    id: `gtm-script-${containerId}`,
    src: `https://www.googletagmanager.com/gtm.js?id=${containerId}`
  });
}

export function ensureGoogleIdentityScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  return loadExternalScript({
    id: 'google-identity-service',
    src: 'https://accounts.google.com/gsi/client',
    onLoad: () => {
      if (typeof window.googleSDKLoaded === 'function') {
        window.googleSDKLoaded();
      }
    }
  }).then(() => window.google);
}

export function ensureAdSenseScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (window.adsbygoogle?.loaded) {
    return Promise.resolve(window.adsbygoogle);
  }

  return loadExternalScript({
    id: 'adsense-script',
    src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9124378768777425',
    attributes: {
      crossorigin: 'anonymous'
    }
  }).then(() => window.adsbygoogle);
}
