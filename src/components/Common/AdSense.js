import React, { useEffect } from 'react';

function AdSense({ client, slot, layout, format }) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error("AdSense error:", error);
    }
  }, []);

  return (
    <ins className="adsbygoogle"
      style={{ display: 'block', textAlign: 'center' }}
      data-ad-layout={layout}
      data-ad-format={format}
      data-ad-client={client}
      data-ad-slot={slot}></ins>
  );
}

export default AdSense; 