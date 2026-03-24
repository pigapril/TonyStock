import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './InfoTool.css';

const InfoTool = ({ 
    content, 
    position = 'top', 
    icon = 'ⓘ',
    width = 'auto'
}) => {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState(null);
    const tooltipRef = useRef(null);
    const triggerRef = useRef(null);
    const timeoutRef = useRef(null);
    const isMobileRef = useRef(false);

    // 檢測是否為移動設備
    useEffect(() => {
        isMobileRef.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }, []);

    // 處理滑鼠進入
    const handleMouseEnter = () => {
        if (isMobileRef.current) return; // 在移動設備上忽略 hover
        
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(true);
    };

    // 處理滑鼠離開
    const handleMouseLeave = () => {
        if (isMobileRef.current) return; // 在移動設備上忽略 hover
        
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, 200);
    };

    // 修改點擊事件處理
    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsVisible(prev => !prev);
    };

    // 修改外部點擊處理
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tooltipRef.current && 
                !tooltipRef.current.contains(event.target) &&
                !triggerRef.current.contains(event.target)) {
                setIsVisible(false);
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isVisible]);

    const updateTooltipPosition = () => {
        if (!tooltipRef.current || !triggerRef.current) {
            return;
        }

        const tooltip = tooltipRef.current;
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const spacing = 12;

        let top = triggerRect.bottom + spacing;
        let left = triggerRect.right - tooltipRect.width;

        if (position.startsWith('top')) {
            top = triggerRect.top - tooltipRect.height - spacing;
        } else if (position.startsWith('left')) {
            top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
            left = triggerRect.left - tooltipRect.width - spacing;
        } else if (position.startsWith('right')) {
            top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
            left = triggerRect.right + spacing;
        } else if (position.endsWith('left')) {
            left = triggerRect.left;
        }

        const maxLeft = Math.max(spacing, viewportWidth - tooltipRect.width - spacing);
        const maxTop = Math.max(spacing, viewportHeight - tooltipRect.height - spacing);

        setTooltipStyle({
            top: Math.min(Math.max(spacing, top), maxTop),
            left: Math.min(Math.max(spacing, left), maxLeft),
            width
        });
    };

    useLayoutEffect(() => {
        if (!isVisible) {
            return undefined;
        }

        updateTooltipPosition();

        const handleViewportChange = () => {
            updateTooltipPosition();
        };

        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);

        return () => {
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };
    }, [isVisible]);

    return (
        <div className="info-tool-container">
            <span 
                ref={triggerRef}
                className="info-icon"
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                role="button"
                tabIndex={0}
                aria-label={t('infoTool.moreInfoAriaLabel')}
            >
                {icon}
            </span>
            {isVisible && typeof document !== 'undefined' && createPortal(
                <div
                    ref={tooltipRef}
                    className={`info-tooltip info-tooltip--portal ${position}`}
                    style={tooltipStyle ?? { width }}
                    role="tooltip"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {content}
                </div>,
                document.body
            )}
        </div>
    );
};

export { InfoTool }; 
