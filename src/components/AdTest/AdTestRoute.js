import React from 'react';
import { AdTest } from './AdTest';

/**
 * AdTest 路由組件 - 用於測試廣告阻擋功能
 */
export const AdTestRoute = () => {
  return (
    <div style={{ padding: '20px', minHeight: '100vh' }}>
      <AdTest />
    </div>
  );
};

export default AdTestRoute;