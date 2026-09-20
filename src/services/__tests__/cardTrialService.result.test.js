import apiClient from '../../api/apiClient';
import { fetchCardTrialResult } from '../cardTrialService';

jest.mock('../../api/apiClient', () => ({ get: jest.fn() }));

it('從受驗證的交易查詢端點解出 binding 狀態，不拿外層 success 當綁卡成功', async () => {
    apiClient.get.mockResolvedValue({ data: { status: 'success', data: { status: 'failed' } } });
    await expect(fetchCardTrialResult('BC1')).resolves.toEqual({ status: 'failed' });
    expect(apiClient.get).toHaveBeenCalledWith('/api/payment/card-trial/status/BC1');
});

it('交易編號必須編碼，API 錯誤不可當成結果', async () => {
    apiClient.get.mockResolvedValue({ data: { status: 'error', message: 'unavailable' } });
    await expect(fetchCardTrialResult('BC/1?x=1')).rejects.toThrow('unavailable');
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/payment/card-trial/status/BC%2F1%3Fx%3D1');
});
