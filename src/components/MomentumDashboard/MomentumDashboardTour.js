import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './MomentumDashboardTour.css';

const STEPS = [
  { key: 'screen', selector: '.momentum-primary-tabs' },
  { key: 'scope', selector: '.momentum-controls' },
  { key: 'map', selector: '.momentum-tile' },
  { key: 'asset', selector: '.momentum-row' }
];
const GAP = 14;
const readRect = (selector) => {
  const element = document.querySelector(`.momentum-page ${selector}`);
  const rect = element?.getBoundingClientRect();
  return rect?.width && rect?.height
    ? { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }
    : null;
};

export default function MomentumDashboardTour({ text, onFinish, metric = 'rank' }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [missing, setMissing] = useState(false);
  const [cardHeight, setCardHeight] = useState(220);
  const cardRef = useRef(null);
  const nextRef = useRef(null);
  const previousFocus = useRef(document.activeElement);
  const hasRect = Boolean(rect);
  const step = STEPS[index];
  const copyKey = step.key === 'map' && metric === 'daily' ? 'mapDaily' : step.key;
  const measure = useCallback(() => setRect(readRect(STEPS[index].selector)), [index]);

  useEffect(() => {
    const target = document.querySelector(`.momentum-page ${STEPS[index].selector}`);
    target?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
    setMissing(false);
    measure();
    const timers = [60, 200, 450].map(delay => window.setTimeout(measure, delay));
    timers.push(window.setTimeout(() => {
      if (readRect(STEPS[index].selector)) return;
      if (index < STEPS.length - 1) setIndex(index + 1);
      else setMissing(true);
    }, 600));
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [index, measure]);

  useLayoutEffect(() => {
    const height = cardRef.current?.getBoundingClientRect().height;
    if (height) setCardHeight(height);
  }, [index, rect, missing, text]);
  useLayoutEffect(() => { nextRef.current?.focus({ preventScroll: true }); }, [index, hasRect, missing]);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); onFinish(); }
      if (event.key === 'Tab' && cardRef.current) {
        const buttons = Array.from(cardRef.current.querySelectorAll('button'));
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onFinish]);
  useEffect(() => {
    const element = previousFocus.current;
    return () => element?.focus?.({ preventScroll: true });
  }, []);

  if (!rect && !missing) return null;
  const width = Math.min(340, window.innerWidth - GAP * 2);
  const clampX = value => Math.max(GAP, Math.min(value, window.innerWidth - width - GAP));
  const clampY = value => Math.max(GAP, Math.min(value, window.innerHeight - cardHeight - GAP));
  let top = clampY((window.innerHeight - cardHeight) / 2);
  let left = clampX((window.innerWidth - width) / 2);
  if (rect) {
    left = clampX(rect.left + (rect.width - width) / 2);
    if (rect.top + rect.height + GAP + cardHeight <= window.innerHeight - GAP) top = rect.top + rect.height + GAP;
    else if (rect.top - GAP - cardHeight >= GAP) top = rect.top - GAP - cardHeight;
    else {
      top = clampY(rect.top + (rect.height - cardHeight) / 2);
      left = clampX(rect.left + rect.width + GAP);
    }
  }
  const isLast = index === STEPS.length - 1;
  return <div className="momentum-tour" role="dialog" aria-modal="true" aria-labelledby="momentum-tour-title" aria-describedby="momentum-tour-body">
    {rect ? <div className="momentum-tour__spotlight" aria-hidden="true" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} /> : <div className="momentum-tour__backdrop" aria-hidden="true" />}
    <div className="momentum-tour__card" ref={cardRef} style={{ top, left, width }}>
      <span className="momentum-tour__progress">{index + 1} / {STEPS.length}</span>
      <h2 id="momentum-tour-title">{text(`tour.${copyKey}.title`)}</h2>
      <p id="momentum-tour-body">{text(`tour.${copyKey}.body`)}</p>
      <div className="momentum-tour__actions">
        <button type="button" onClick={onFinish}>{text('tour.skip')}</button>
        <div>{index > 0 && <button type="button" onClick={() => setIndex(index - 1)}>{text('tour.back')}</button>}
          <button type="button" className="momentum-tour__next" ref={nextRef} onClick={() => isLast ? onFinish() : setIndex(index + 1)}>{text(isLast ? 'tour.done' : 'tour.next')}</button>
        </div>
      </div>
    </div>
  </div>;
}
