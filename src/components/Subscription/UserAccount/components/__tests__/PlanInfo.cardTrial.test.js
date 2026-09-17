/**
 * 帳戶頁上綁卡試用的扣款提醒。
 *
 * 紅線是「既有定期定額訂戶看到的帳戶頁完全不變」。證明方式是把帶新欄位與不帶新欄位的
 * 定期定額 plan 各 render 一次，直接比 HTML。
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../../i18n';
import { PlanInfo } from '../PlanInfo';

const fs = require('fs');
const path = require('path');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => () => {},
    useParams: () => ({ lang: 'zh-TW' })
}));

jest.mock('../../../SubscriptionContext', () => ({
    useSubscription: () => ({ refreshUserPlan: () => {}, refreshSubscriptionHistory: () => {} })
}));

jest.mock('../../../../Auth/useAuth', () => ({
    useAuth: () => ({ checkAuthStatus: () => {} })
}));

jest.mock('../../../../../services/subscriptionService', () => ({
    __esModule: true,
    default: { cancelSubscription: () => Promise.resolve({ success: true }) }
}));

jest.mock('../../../../../utils/analytics', () => ({
    Analytics: { track: () => {}, error: () => {} }
}));

const NOW = Date.parse('2026-09-13T04:00:00Z');
// 台北是 10/14 00:00，UTC 還停在 10/13。
const TRIAL_END = new Date('2026-10-13T16:00:00.000Z');

const RECURRING_PLAN = {
    type: 'pro',
    status: 'active',
    startDate: new Date('2026-09-13T04:00:00Z'),
    endDate: TRIAL_END,
    autoRenew: true,
    cancelAtPeriodEnd: false,
    isActive: true,
    isExpired: false
};

const boundCardTrial = (overrides = {}) => ({
    ...RECURRING_PLAN,
    billingRail: 'bound_card',
    billingPeriod: 'monthly',
    trialEnd: TRIAL_END,
    renewalAmount: 199,
    ...overrides
});

const renderPlanInfo = (plan) => render(
    <I18nextProvider i18n={i18n}>
        <PlanInfo plan={plan} loading={false} />
    </I18nextProvider>
);

const renewalLine = () => screen.queryByText(/^試用期滿若未取消/);

describe('PlanInfo 的綁卡試用扣款提醒', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('zh-TW');
    });

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(NOW);
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it.each([['monthly'], [null]])('綁卡試用中、billingPeriod 是 %s 時顯示月繳句', (billingPeriod) => {
        renderPlanInfo(boundCardTrial({ billingPeriod }));

        expect(renewalLine()).toHaveTextContent(/^試用期滿若未取消，將於 2026年10月14日 自動扣款 199 元，之後每月自動續費$/);
    });

    it('綁卡試用中、年繳時顯示年繳句', () => {
        renderPlanInfo(boundCardTrial({ billingPeriod: 'yearly', renewalAmount: 1990 }));

        expect(renewalLine()).toHaveTextContent(/^試用期滿若未取消，將於 2026年10月14日 自動扣款 1990 元，之後每年自動續費$/);
    });

    it('已取消時不顯示', () => {
        renderPlanInfo(boundCardTrial({ cancelAtPeriodEnd: true }));

        expect(renewalLine()).toBeNull();
    });

    it('試用已結束時不顯示', () => {
        Date.now.mockReturnValue(TRIAL_END.getTime() + 60 * 1000);
        renderPlanInfo(boundCardTrial());

        expect(renewalLine()).toBeNull();
    });

    it('定期定額訂戶完全不顯示，畫面與沒有新欄位時一模一樣', () => {
        const { container, unmount } = renderPlanInfo(RECURRING_PLAN);
        const before = container.innerHTML;
        unmount();

        const { container: withFields } = renderPlanInfo({
            ...RECURRING_PLAN,
            billingRail: 'ecpay_period',
            billingPeriod: 'monthly',
            trialEnd: TRIAL_END,
            renewalAmount: null
        });

        expect(renewalLine()).toBeNull();
        expect(withFields.innerHTML).toBe(before);
    });
});

// 這台機器的 jsdom 是台北時區，漏掉 timeZone 時畫面上的日期照樣正確，只有 production 的
// 使用者會差一天。行為測試抓不到，所以直接看原始碼。
describe('台北扣款日的格式化一定指定 timeZone', () => {
    const TAIPEI = "timeZone: 'Asia/Taipei'";
    const read = (relative) => fs.readFileSync(path.resolve(__dirname, relative), 'utf8');
    const formatterOptions = (source) => source
        .split('new Intl.DateTimeFormat(')
        .slice(1)
        .map((rest) => rest.slice(0, rest.indexOf(').format(')));

    it('CardTrialFlow 每一個日期格式化都帶台北時區', () => {
        const formatters = formatterOptions(read('../../../../Payment/CardTrial/CardTrialFlow.js'));

        expect(formatters.length).toBeGreaterThan(0);
        formatters.forEach((options) => expect(options).toContain(TAIPEI));
    });

    // PlanInfo 既有的 formatDate 沒帶時區，改它會動到定期定額訂戶的畫面，所以只鎖試用那一行用的格式化。
    it('PlanInfo 試用扣款日的格式化帶台北時區', () => {
        const source = read('../PlanInfo.js');
        const definition = source.slice(source.indexOf('const trialRenewalDateText ='));

        expect(source).toContain('trialRenewalDateText(trialEnd, lang)');
        expect(formatterOptions(definition)[0]).toContain(TAIPEI);
    });
});
