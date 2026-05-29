import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from './Dialog';
import { Analytics } from '../../../utils/analytics';
import { getFreeStockList } from '../../../utils/freeStockListUtils';

// 主要導出的組件，支援直接 props 模式
export function FeatureUpgradeDialog({ 
    isOpen, 
    type, 
    context = {}, 
    onClose, 
    onUpgrade 
}) {
    const { t } = useTranslation();
    
    // 直接 props 模式
    const dialogData = {
        type: type || 'featureUpgrade',
        isOpen: isOpen || false,
        props: context
    };
    
    const closeHandler = () => {
        Analytics.ui.dialog.close({ type: dialogData.type });
        onClose?.();
    };
    
    const upgradeHandler = () => {
        const upgradeUrl = context?.upgradeUrl || '/subscription-plans';
        Analytics.ui.dialog.action({ 
            type: dialogData.type, 
            action: 'upgrade_clicked',
            feature: context?.feature,
            upgradeUrl 
        });
        onUpgrade?.();
    };

    const handleLater = () => {
        Analytics.ui.dialog.action({ 
            type: dialogData.type, 
            action: 'maybe_later_clicked',
            feature: dialogData.props?.feature
        });
        closeHandler();
    };

    if (!dialogData.isOpen) return null;

    const feature = dialogData.props?.feature || 'stockAccess';
    const stockCode = dialogData.props?.stockCode;
    const allowedStocks = dialogData.props?.allowedStocks || getFreeStockList();
    const onBrowseFreeStocks = dialogData.props?.onBrowseFreeStocks;
    const onPickFreeStock = dialogData.props?.onPickFreeStock;

    // stockAccess 情境：挑出新用戶最容易認得的代表性免費標的做為可點 chips
    const isStockAccess = feature === 'stockAccess';
    const preferredFreeTickers = ['SPY', 'QQQ', 'VT', 'VOO', '^GSPC', '0050', '^TWII', '^N225'];
    const allowedSet = new Set((allowedStocks || []).map((s) => String(s).toUpperCase()));
    const freeChips = (() => {
        if (!isStockAccess) return [];
        const picked = preferredFreeTickers.filter((tk) => allowedSet.has(tk.toUpperCase()));
        if (picked.length >= 4) return picked.slice(0, 8);
        // 代表清單命中不足時，補上 allowedStocks 前幾檔
        const extra = (allowedStocks || []).filter((tk) => !picked.includes(tk));
        return [...picked, ...extra].slice(0, 8);
    })();

    const handleChipClick = (ticker) => {
        Analytics.ui.dialog.action({
            type: dialogData.type,
            action: 'free_stock_chip_clicked',
            feature,
            ticker
        });
        onPickFreeStock?.(ticker);
        closeHandler();
    };

    const handleBrowseFree = () => {
        Analytics.ui.dialog.action({
            type: dialogData.type,
            action: 'browse_free_clicked',
            feature
        });
        onBrowseFreeStocks?.();
        closeHandler();
    };

    const showBrowseFree = isStockAccess && typeof onBrowseFreeStocks === 'function';

    // 根據功能類型決定內容
    const getContent = () => {
        switch (feature) {
            case 'stockAccess':
                return {
                    title: t('featureUpgrade.stockAccess.title', '解鎖全部股票查詢'),
                    subtitle: t('featureUpgrade.stockAccess.subtitle', '升級至 Pro 方案，查詢任何股票'),
                    description: stockCode 
                        ? t('featureUpgrade.stockAccess.descriptionWithStock', { stockCode })
                        : t('featureUpgrade.stockAccess.description'),
                    icon: '📈',
                    features: [
                        { icon: '🚀', text: t('featureUpgrade.features.unlimitedStocks', '無限制股票查詢') },
                        { icon: '📊', text: t('featureUpgrade.features.realTimeData', '即時市場數據') },
                        { icon: '📋', text: t('featureUpgrade.features.watchlist', '個人追蹤清單') }
                    ]
                };
            case 'currentData':
                return {
                    title: t('featureUpgrade.currentData.title', '解鎖即時數據'),
                    subtitle: t('featureUpgrade.currentData.subtitle', '獲取最新的市場情緒數據'),
                    description: t('featureUpgrade.currentData.description', '免費用戶僅能查看歷史數據，升級後可獲得即時市場洞察。'),
                    icon: '⚡',
                    features: [
                        { icon: '📊', text: t('featureUpgrade.features.realTimeData', '即時市場數據') },
                        { icon: '🎯', text: t('featureUpgrade.features.currentSentiment', '當前市場情緒') },
                        { icon: '📈', text: t('featureUpgrade.features.liveCharts', '即時圖表更新') },
                        { icon: '🔔', text: t('featureUpgrade.features.alerts', '市場警報通知') }
                    ]
                };
            case 'marketSentimentAccess':
                return {
                    title: t('featureUpgrade.marketSentimentAccess.title', '解鎖完整市場情緒數據'),
                    subtitle: t('featureUpgrade.marketSentimentAccess.subtitle', '升級至 Pro 方案，獲得即時市場情緒分析'),
                    description: t('featureUpgrade.marketSentimentAccess.description', '免費用戶僅能查看部分功能，升級後可獲得完整的市場情緒指標。'),
                    icon: '📊',
                    features: [
                        { icon: '📈', text: t('featureUpgrade.features.realTimeData', '即時市場數據') },
                        { icon: '🎯', text: t('featureUpgrade.features.currentSentiment', '當前市場情緒') },
                        { icon: '📋', text: t('featureUpgrade.features.watchlist', '個人追蹤清單') }
                    ]
                };
            default:
                return {
                    title: t('featureUpgrade.default.title', '升級至 Pro'),
                    subtitle: t('featureUpgrade.default.subtitle', '解鎖完整功能'),
                    description: t('featureUpgrade.default.description', '升級至 Pro 方案，享受完整的投資分析體驗。'),
                    icon: '✨',
                    features: [
                        { icon: '🚀', text: t('featureUpgrade.features.unlimitedAccess', '無限制存取') },
                        { icon: '📊', text: t('featureUpgrade.features.advancedTools', '進階工具') },
                        { icon: '🎯', text: t('featureUpgrade.features.premiumSupport', '優先支援') }
                    ]
                };
        }
    };

    const content = getContent();

    return (
        <Dialog
            open={dialogData.isOpen}
            onClose={closeHandler}
            className="feature-upgrade-dialog"
        >
            <div className="feature-upgrade-content">
                {/* 頂部圖標區域 */}
                <div className="upgrade-header">
                    <div className="upgrade-icon">
                        <span className="main-icon">{content.icon}</span>
                        <div className="icon-glow"></div>
                    </div>
                    <h2 className="upgrade-title">{content.title}</h2>
                </div>

                {/* 描述區域 */}
                <div className="upgrade-description">
                    <p>{content.description}</p>
                </div>

                {/* 免費標的快捷區 (僅 stockAccess) */}
                {isStockAccess && freeChips.length > 0 && (
                    <div className="upgrade-free-stocks">
                        <p className="upgrade-free-stocks-hint">
                            {t('featureUpgrade.stockAccess.freeListHint', '免費方案可立即查詢這些主要指數與 ETF：')}
                        </p>
                        <div className="upgrade-free-chips">
                            {freeChips.map((ticker) => (
                                <button
                                    key={ticker}
                                    type="button"
                                    className="upgrade-free-chip"
                                    onClick={() => handleChipClick(ticker)}
                                >
                                    {ticker}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 功能列表 */}
                <div className="upgrade-features">
                    {content.features.map((feature, index) => (
                        <div key={index} className="feature-item">
                            <span className="feature-icon">{feature.icon}</span>
                            <span className="feature-text">{feature.text}</span>
                        </div>
                    ))}
                </div>

                {/* 按鈕區域 */}
                <div className="upgrade-actions">
                    <button 
                        className="upgrade-primary-btn" 
                        onClick={upgradeHandler}
                        aria-label={t('featureUpgrade.upgradeAriaLabel', '升級至 Pro 方案')}
                    >
                        <span className="btn-text">{t('featureUpgrade.upgradeButton', '升級至 Pro')}</span>
                        <span className="btn-icon">→</span>
                    </button>
                    
                    {showBrowseFree ? (
                        <button
                            className="upgrade-secondary-btn"
                            onClick={handleBrowseFree}
                            aria-label={t('featureUpgrade.browseFreeAriaLabel', '瀏覽免費可查的指數與 ETF')}
                        >
                            {t('featureUpgrade.browseFreeButton', '查詢其他免費標的')}
                        </button>
                    ) : (
                        <button
                            className="upgrade-secondary-btn"
                            onClick={handleLater}
                            aria-label={t('featureUpgrade.laterAriaLabel', '稍後再說')}
                        >
                            {t('featureUpgrade.laterButton', '稍後再說')}
                        </button>
                    )}
                </div>

                {/* 信任指標 */}
                <div className="upgrade-trust">
                    <div className="trust-item">
                        <span className="trust-icon">🔒</span>
                        <span className="trust-text">{t('featureUpgrade.trust.secure', '安全付款')}</span>
                    </div>
                    <div className="trust-item">
                        <span className="trust-icon">⚡</span>
                        <span className="trust-text">{t('featureUpgrade.trust.instant', '即時啟用')}</span>
                    </div>
                    <div className="trust-item">
                        <span className="trust-icon">↩️</span>
                        <span className="trust-text">{t('featureUpgrade.trust.cancel', '隨時取消')}</span>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}