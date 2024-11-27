import React, { useEffect, useRef } from 'react';

export function PriceGauge({ currentPrice, minPrice, maxPrice }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // 清空畫布
        ctx.clearRect(0, 0, width, height);

        // 計算價格在區間中的位置 (0-1)
        const priceRange = maxPrice - minPrice;
        const normalizedPrice = (currentPrice - minPrice) / priceRange;
        
        // 設定半圓的參數
        const centerX = width / 2;
        const centerY = height - 2;
        const radius = Math.min(width / 2, height) - 10;
        const startAngle = Math.PI;
        const endAngle = 0;

        // 繪製外圈陰影
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 2, startAngle, endAngle);
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 8;
        ctx.stroke();

        // 繪製背景圓弧
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = '#e5e7eb';  // Tailwind gray-200
        ctx.lineWidth = 6;
        ctx.stroke();

        // 計算指針角度
        const angle = startAngle + (endAngle - startAngle) * normalizedPrice;

        // 繪製指針左側進度（根據價格位置決定顏色）
        let progressColor;
        if (normalizedPrice <= 0.33) {
            progressColor = 'rgba(52, 211, 153, 0.7)';  // Tailwind green-400
        } else if (normalizedPrice <= 0.66) {
            progressColor = 'rgba(96, 165, 250, 0.7)';  // Tailwind blue-400
        } else {
            progressColor = 'rgba(248, 113, 113, 0.7)'; // Tailwind red-400
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, angle);
        ctx.strokeStyle = progressColor;
        ctx.lineWidth = 6;
        ctx.stroke();

        // 繪製指針右側（淺灰色）
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, angle, endAngle);
        ctx.strokeStyle = '#f3f4f6';  // Tailwind gray-100
        ctx.lineWidth = 6;
        ctx.stroke();

        // 繪製指針陰影
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle + 0.02) * (radius - 2),
                  centerY - Math.sin(angle + 0.02) * (radius - 2));
        ctx.lineTo(centerX, centerY);
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 繪製指針
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * (radius - 2),
                  centerY - Math.sin(angle) * (radius - 2));
        ctx.lineTo(centerX, centerY);
        ctx.strokeStyle = '#374151';  // Tailwind gray-700
        ctx.lineWidth = 2;
        ctx.stroke();

        // 繪製中心圓點
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#374151';    // Tailwind gray-700
        ctx.fill();

        // 繪製中心圓點外圈
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

    }, [currentPrice, minPrice, maxPrice]);

    return (
        <canvas 
            ref={canvasRef} 
            width="100" 
            height="50" 
            className="price-gauge"
        />
    );
} 