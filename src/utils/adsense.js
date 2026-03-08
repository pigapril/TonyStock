const AD_INIT_ATTRIBUTE = 'data-ad-init-pending';

export function getAdElement(container) {
  if (!container) {
    return null;
  }

  if (container instanceof HTMLElement && container.matches('ins.adsbygoogle')) {
    return container;
  }

  return container.querySelector?.('ins.adsbygoogle') ?? null;
}

export function isAdInitialized(adElement) {
  if (!adElement) {
    return false;
  }

  return adElement.hasAttribute('data-adsbygoogle-status') || adElement.hasAttribute(AD_INIT_ATTRIBUTE);
}

export function initializeAdSlot(adElement) {
  if (!adElement || isAdInitialized(adElement)) {
    return false;
  }

  adElement.setAttribute(AD_INIT_ATTRIBUTE, 'true');

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    return true;
  } catch (error) {
    adElement.removeAttribute(AD_INIT_ATTRIBUTE);
    throw error;
  }
}
