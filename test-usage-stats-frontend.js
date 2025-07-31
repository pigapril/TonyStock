// 測試前端用量統計 API 調用
const fetch = require('node-fetch');

async function testUsageStatsAPI() {
  try {
    console.log('🧪 Testing frontend usage stats API call...');
    
    // 使用從日誌中獲取的 access token
    const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlMjJlYmE2Ny1iZWY5LTQzZmEtOGEzMi01YmUzMjBkOTc1ZDUiLCJlbWFpbCI6Imh1YW5ncGlnMTJAZ21haWwuY29tIiwiaWF0IjoxNzUzOTQ0MzQ5LCJleHAiOjE3NTQ1NDkxNDl9.f4YoAV2o3JtT2_YrS-lLv9PqBi42Kj1l0Rds8cVgIJA';
    
    const response = await fetch('http://localhost:3001/api/auth/usage-stats', {
      method: 'GET',
      headers: {
        'Cookie': `accessToken=${accessToken}`,
        'Origin': 'http://localhost:3000',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
      }
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📊 Response data:', JSON.stringify(data, null, 2));
    
    if (data.status === 'success') {
      console.log('✅ API call successful');
      console.log('📊 Usage stats structure:', {
        hasDaily: !!data.data.daily,
        hasMonthly: !!data.data.monthly,
        dailyKeys: data.data.daily ? Object.keys(data.data.daily) : [],
        monthlyKeys: data.data.monthly ? Object.keys(data.data.monthly) : []
      });
    } else {
      console.log('❌ API call failed:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUsageStatsAPI();