import React, { useState, useRef, useEffect } from 'react';
import './InfoTool.css';

const InfoTool = ({ 
    content, 
    position = 'top', 
    icon = 'ⓘ',
    width = 'auto'
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [adjustedPosition, setAdjustedPosition] = useState(position);
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

    // 調整提示框位置
    useEffect(() => {
        if (isVisible && tooltipRef.current && triggerRef.current) {
            const tooltip = tooltipRef.current;
            const trigger = triggerRef.current;
            const triggerRect = trigger.getBoundingClientRect();
            const windowWidth = window.innerWidth;

            // 根據觸發點位置決定展開方向
            const shouldAlignLeft = triggerRect.left > (windowWidth / 2);
            
            // 添加對應的對齊類別
            tooltip.classList.remove('left-aligned', 'right-aligned');
            tooltip.classList.add(shouldAlignLeft ? 'left-aligned' : 'right-aligned');
        }
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
                aria-label="更多資訊"
            >
                {icon}
            </span>
            {isVisible && (
                <div 
                    ref={tooltipRef}
                    className={`info-tooltip ${adjustedPosition}`}
                    style={{ width }}
                    role="tooltip"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {content}
                </div>
            )}
        </div>
    );
};

export { InfoTool }; 