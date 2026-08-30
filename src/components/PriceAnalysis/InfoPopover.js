import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * 欄位旁的問號說明。
 *
 * 說明放在提問的位置，而不是頁面最下方——使用者看到「市場情緒」或「樂活通道」
 * 想知道那是什麼的當下，答案就在旁邊，不必捲到頁尾也不必記得說明在哪。
 */
function InfoPopover({ label, title, points }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const panelRef = useRef(null);

  // 面板以觸發點為中心展開，靠近螢幕邊緣時會超出去（手機特別明顯），
  // 開啟後量一次再把它推回可視範圍內。
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) {
      return;
    }

    panel.style.transform = 'translateX(-50%)';
    const rect = panel.getBoundingClientRect();
    const margin = 8;
    let shift = 0;
    if (rect.right > window.innerWidth - margin) {
      shift = window.innerWidth - margin - rect.right;
    } else if (rect.left < margin) {
      shift = margin - rect.left;
    }
    if (shift) {
      panel.style.transform = `translateX(calc(-50% + ${Math.round(shift)}px))`;
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span className="info-popover" ref={wrapperRef}>
      <button
        type="button"
        className={`info-popover__trigger ${open ? 'is-open' : ''}`}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>

      {open ? (
        <span className="info-popover__panel" ref={panelRef} role="dialog" aria-label={label}>
          <span className="info-popover__title">{title}</span>
          <ul className="info-popover__list">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </span>
      ) : null}
    </span>
  );
}

export default React.memo(InfoPopover);
