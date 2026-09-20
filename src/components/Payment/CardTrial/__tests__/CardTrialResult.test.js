import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import CardTrialResult from '../CardTrialResult';
import { fetchCardTrialResult } from '../../../../services/cardTrialService';

let mockQuery;
jest.mock('react-router-dom', () => ({
    useParams: () => ({ lang: 'zh-TW' }),
    useNavigate: () => jest.fn(),
    useSearchParams: () => [new URLSearchParams(mockQuery)]
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'zh-TW' } }) }));
jest.mock('../../../../services/cardTrialService', () => ({ fetchCardTrialResult: jest.fn() }));

beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = 'status=success&merchantTradeNo=BC1';
});

it('網址宣稱成功但後端拒絕時顯示失敗，查詢完成前不顯示成功', async () => {
    fetchCardTrialResult.mockResolvedValue({ status: 'failed', failureReason: 'issuer_declined' });
    render(<CardTrialResult />);
    expect(screen.queryByText('cardTrial.result.successTitle')).not.toBeInTheDocument();
    expect(await screen.findByText('cardTrial.result.failedTitle')).toBeInTheDocument();
    expect(screen.getByText('cardTrial.result.failureReasons.issuer_declined')).toBeInTheDocument();
    expect(fetchCardTrialResult).toHaveBeenCalledWith('BC1');
});

it('只有後端確認 succeeded 才顯示成功，即使 query 是 failed', async () => {
    mockQuery = 'status=failed&merchantTradeNo=BC1';
    fetchCardTrialResult.mockResolvedValue({ status: 'succeeded' });
    render(<CardTrialResult />);
    expect(await screen.findByText('cardTrial.result.successTitle')).toBeInTheDocument();
});

it('缺少交易編號的舊 success 連結保留待確認，不猜測最近一筆交易', () => {
    mockQuery = 'status=success';
    render(<CardTrialResult />);
    expect(screen.getByText('cardTrial.result.pendingTitle')).toBeInTheDocument();
    expect(fetchCardTrialResult).not.toHaveBeenCalled();
});

it('查詢失敗保持待確認，不回退到 success query', async () => {
    fetchCardTrialResult.mockRejectedValue(new Error('unavailable'));
    render(<CardTrialResult />);
    await act(async () => {});
    expect(screen.getByText('cardTrial.result.pendingTitle')).toBeInTheDocument();
});

it('pending 會再查詢直到後端結案', async () => {
    jest.useFakeTimers();
    try {
        fetchCardTrialResult.mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce({ status: 'failed' });
        render(<CardTrialResult />);
        await act(async () => {});
        await act(async () => { jest.advanceTimersByTime(2000); });
        expect(screen.getByText('cardTrial.result.failedTitle')).toBeInTheDocument();
        expect(fetchCardTrialResult).toHaveBeenCalledTimes(2);
    } finally { jest.useRealTimers(); }
});

it('pending 最多查五次，離開頁面後停止查詢', async () => {
    jest.useFakeTimers();
    try {
        fetchCardTrialResult.mockResolvedValue({ status: 'pending' });
        const { unmount } = render(<CardTrialResult />);
        await act(async () => {});
        for (let i = 0; i < 6; i += 1) {
            await act(async () => { jest.advanceTimersByTime(2000); });
        }
        expect(fetchCardTrialResult).toHaveBeenCalledTimes(5);
        expect(screen.getByText('cardTrial.result.pendingTitle')).toBeInTheDocument();
        unmount();
        await act(async () => { jest.advanceTimersByTime(2000); });
        expect(fetchCardTrialResult).toHaveBeenCalledTimes(5);
    } finally { jest.useRealTimers(); }
});

it('切換交易編號時不顯示上一筆成功，也忽略上一筆的遲到回應', async () => {
    let finishOld;
    fetchCardTrialResult.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
    const { rerender } = render(<CardTrialResult />);
    mockQuery = 'status=success&merchantTradeNo=BC2';
    fetchCardTrialResult.mockResolvedValue({ status: 'failed' });
    rerender(<CardTrialResult />);
    await screen.findByText('cardTrial.result.failedTitle');
    await act(async () => { finishOld({ status: 'succeeded' }); });
    await waitFor(() => expect(screen.getByText('cardTrial.result.failedTitle')).toBeInTheDocument());
});
