import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SentimentBoard from './SentimentBoard';

const mockNavigate = jest.fn();
const mockOpenDialog = jest.fn();
const mockAuth = { user: null };
const mockDialog = { isOpen: false, type: null };
const mockGet = jest.fn();
const mockFetchEligibility = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      'freeTrial.ctaShort': '免綁卡試用 Pro',
      'sentimentBoard.delayNoticeCta': '升級 Pro 查看最新資料',
      'sentimentBoard.upsellCta': '查看方案'
    }[key] || key)
  })
}));
jest.mock('../../api/apiClient', () => ({ get: (...args) => mockGet(...args) }));
jest.mock('../../services/freeTrialService', () => ({ fetchFreeTrialEligibility: (...args) => mockFetchEligibility(...args) }));
jest.mock('../../utils/freeTrialRollout', () => ({ canSeeFreeTrial: (email) => Boolean(email) }));
jest.mock('../PageContainer/PageContainer', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>
}));
jest.mock('../Auth/useAuth', () => ({ useAuth: () => mockAuth }));
jest.mock('../Common/Dialog/useDialog', () => ({
  useDialog: () => ({ dialog: mockDialog, openDialog: mockOpenDialog })
}));

const board = {
  userPlan: 'free',
  delayed: { active: true, until: '2026-08-31' },
  composite: {
    us: { value: 52, scale: { min: 0, max: 100 }, date: '2026-10-30' },
    tw: { value: 57, scale: { min: 0, max: 100 }, date: '2026-10-30' }
  },
  divergences: [],
  groups: [],
  generatedAt: '2026-10-31T00:00:00.000Z'
};

const renderBoard = (path = '/zh-TW/sentiment-indicators') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/:lang/sentiment-indicators" element={<SentimentBoard />} /></Routes>
  </MemoryRouter>
);

describe('情緒指標總覽的試用 CTA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.user = null;
    mockDialog.isOpen = false;
    mockDialog.type = null;
    mockGet.mockResolvedValue({ data: { data: board } });
    mockFetchEligibility.mockResolvedValue({ eligible: true });
  });

  it('訪客看到試用入口，點擊後先登入', async () => {
    renderBoard();

    await screen.findAllByRole('button', { name: '免綁卡試用 Pro' });
    fireEvent.click(screen.getAllByRole('button', { name: '免綁卡試用 Pro' })[0]);

    expect(mockOpenDialog).toHaveBeenCalledWith('auth', expect.objectContaining({
      source: 'sentiment_board_trial_cta'
    }));
  });

  it('合資格登入者進入試用，不合資格者前往正確的方案頁', async () => {
    mockAuth.user = { id: 'eligible', email: 'eligible@example.com' };
    const { rerender } = renderBoard('/en/sentiment-indicators');
    await screen.findAllByRole('button', { name: '免綁卡試用 Pro' });
    const trialButton = screen.getAllByRole('button', { name: '免綁卡試用 Pro' })[0];
    fireEvent.click(trialButton);
    expect(mockNavigate).toHaveBeenCalledWith('/en/payment/free-trial');

    mockNavigate.mockClear();
    mockAuth.user = { id: 'existing', email: 'existing@example.com' };
    mockFetchEligibility.mockResolvedValueOnce({ eligible: false });
    rerender(
      <MemoryRouter initialEntries={['/en/sentiment-indicators']}>
        <Routes><Route path="/:lang/sentiment-indicators" element={<SentimentBoard />} /></Routes>
      </MemoryRouter>
    );

    const plansButton = await screen.findByRole('button', { name: '升級 Pro 查看最新資料' });
    fireEvent.click(plansButton);
    expect(mockNavigate).toHaveBeenCalledWith('/en/subscription-plans');
  });

  it('訪客登入後會依首次訂閱資格導向試用或方案頁', async () => {
    const view = renderBoard('/en/sentiment-indicators');
    await screen.findAllByRole('button', { name: '免綁卡試用 Pro' });
    fireEvent.click(screen.getAllByRole('button', { name: '免綁卡試用 Pro' })[0]);

    mockAuth.user = { id: 'new-user', email: 'new@example.com' };
    view.rerender(
      <MemoryRouter initialEntries={['/en/sentiment-indicators']}>
        <Routes><Route path="/:lang/sentiment-indicators" element={<SentimentBoard />} /></Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/en/payment/free-trial'));
  });
});
