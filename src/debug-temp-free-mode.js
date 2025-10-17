// 調試臨時免費模式
console.log('=== 臨時免費模式調試 ===');
console.log('REACT_APP_TEMPORARY_FREE_MODE:', process.env.REACT_APP_TEMPORARY_FREE_MODE);
console.log('typeof:', typeof process.env.REACT_APP_TEMPORARY_FREE_MODE);
console.log('=== true:', process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('所有環境變數:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));