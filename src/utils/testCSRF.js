// 測試 CSRF token 狀態的工具
import csrfClient from './csrfClient';

export const testCSRFStatus = () => {
  console.log('=== CSRF Token Status ===');
  console.log('Is initialized:', csrfClient.isTokenInitialized());
  console.log('Token:', csrfClient.getCSRFToken());
  console.log('Headers:', csrfClient.getHeaders());
  console.log('========================');
};

export const initializeCSRFForTesting = async () => {
  try {
    console.log('Attempting to initialize CSRF token...');
    await csrfClient.initializeCSRFToken();
    console.log('CSRF token initialized successfully');
    testCSRFStatus();
  } catch (error) {
    console.error('Failed to initialize CSRF token:', error);
  }
};

// 在瀏覽器控制台中可以使用的全域函數
if (typeof window !== 'undefined') {
  window.testCSRF = testCSRFStatus;
  window.initCSRF = initializeCSRFForTesting;
}