import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoNotificationsOutline } from 'react-icons/io5';
import { Dialog } from '../Common/Dialog/Dialog';
import watchlistService from './services/watchlistService';
import './priceSentimentNotificationSettings.css';

const options = ['extremeFear', 'fear', 'neutral', 'greed', 'extremeGreed'];
const defaults = ['extremeFear', 'extremeGreed'];

export function PriceSentimentNotificationSettings() {
    const { t, i18n } = useTranslation();
    const tRef = useRef(t);
    tRef.current = t;

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState(null);
    const [draft, setDraft] = useState({ enabled: false, selectedSentiments: defaults });
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        if (!open) return undefined;
        let active = true;
        setLoading(true);
        setError('');
        setSaved(false);
        setSettings(null);
        watchlistService.getPriceSentimentNotificationSettings()
            .then(data => {
                if (!active) return;
                setSettings(data || {});
                setDraft({
                    enabled: Boolean(data?.enabled),
                    selectedSentiments: options.filter(key =>
                        Array.isArray(data?.selectedSentiments)
                            ? data.selectedSentiments.includes(key)
                            : defaults.includes(key))
                });
            })
            .catch(() => {
                if (active) setError(tRef.current('watchlist.priceSentimentNotifications.loadError'));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [open, retry]);

    const canUseFeature = Boolean(settings?.canUseFeature);
    const dirty = settings && (
        draft.enabled !== Boolean(settings.enabled)
        || options.filter(key => draft.selectedSentiments.includes(key)).join(',')
            !== options.filter(key => settings.selectedSentiments?.includes(key)).join(',')
    );
    const upgradePath = `/${String(i18n.language || 'zh-TW').startsWith('zh') ? 'zh-TW' : 'en'}/subscription-plans`;

    const toggle = key => {
        setSaved(false);
        setDraft(current => ({
            ...current,
            selectedSentiments: current.selectedSentiments.includes(key)
                ? current.selectedSentiments.filter(item => item !== key)
                : options.filter(item => item === key || current.selectedSentiments.includes(item))
        }));
    };

    const save = async () => {
        if (draft.enabled && !draft.selectedSentiments.length) return;
        setSaving(true);
        setError('');
        setSaved(false);
        try {
            const result = await watchlistService.updatePriceSentimentNotificationSettings(draft);
            setSettings(current => ({ ...current, ...result }));
            setDraft({
                enabled: Boolean(result?.enabled ?? draft.enabled),
                selectedSentiments: options.filter(key =>
                    (result?.selectedSentiments ?? draft.selectedSentiments).includes(key))
            });
            setSaved(true);
        } catch (err) {
            setError(err?.message || tRef.current('watchlist.priceSentimentNotifications.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const triggerLabel = t('watchlist.priceSentimentNotifications.triggerButton');

    return (
        <>
            <button
                type="button"
                className="watchlist-price-alert-trigger"
                onClick={() => { setLoading(true); setOpen(true); }}
                aria-label={triggerLabel}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <IoNotificationsOutline aria-hidden="true" />
                <span>{triggerLabel}</span>
                <span className="watchlist-price-alert-trigger__badge">{t('watchlist.priceSentimentNotifications.proBadge')}</span>
            </button>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                title={<span className="price-sentiment-alert-dialog__title-content">
                    {t('watchlist.priceSentimentNotifications.title')}
                    <span className="price-sentiment-alert-dialog__plan">{t('watchlist.priceSentimentNotifications.proBadge')}</span>
                </span>}
                description={t('watchlist.priceSentimentNotifications.description')}
                className="price-sentiment-alert-dialog"
                titleClassName="price-sentiment-alert-dialog__title"
                contentClassName="price-sentiment-alert-dialog__content"
                overlayClassName="price-sentiment-alert-dialog__overlay"
                maxWidth="lg"
            >
                {loading ? (
                    <div className="price-sentiment-alert-dialog__state" role="status">
                        <span className="price-sentiment-alert-dialog__spinner" />
                        {t('watchlist.priceSentimentNotifications.loading')}
                    </div>
                ) : error && !settings ? (
                    <div className="price-sentiment-alert-dialog__state">
                        <p role="alert">{error}</p>
                        <button
                            type="button"
                            className="price-sentiment-alert-dialog__secondary"
                            onClick={() => setRetry(value => value + 1)}
                        >
                            {t('common.retry')}
                        </button>
                    </div>
                ) : !canUseFeature ? (
                    <div className="price-sentiment-alert-dialog__upgrade">
                        <div className="price-sentiment-alert-dialog__upgrade-icon">
                            <IoNotificationsOutline aria-hidden="true" />
                        </div>
                        <p>{t('watchlist.priceSentimentNotifications.proRequired')}</p>
                        <Link to={upgradePath} onClick={() => setOpen(false)} className="price-sentiment-alert-dialog__save">
                            {t('watchlist.priceSentimentNotifications.upgrade')}
                        </Link>
                    </div>
                ) : (
                    <div className="price-sentiment-alert-dialog__settings">
                        <label htmlFor="price-sentiment-master-toggle" className="price-sentiment-alert-dialog__master">
                            <span className="price-sentiment-alert-dialog__master-copy">
                                <strong>{t('watchlist.priceSentimentNotifications.enableTitle')}</strong>
                                <small>{t('watchlist.priceSentimentNotifications.enableDescription')}</small>
                            </span>
                            <span className="price-sentiment-alert-dialog__switch">
                                <input
                                    id="price-sentiment-master-toggle"
                                    type="checkbox"
                                    checked={draft.enabled}
                                    aria-label={t('watchlist.priceSentimentNotifications.enableTitle')}
                                    onChange={event => {
                                        setSaved(false);
                                        setDraft(current => ({ ...current, enabled: event.target.checked }));
                                    }}
                                />
                                <span />
                            </span>
                        </label>
                        <section className="price-sentiment-alert-dialog__section">
                            <div className="price-sentiment-alert-dialog__section-heading">
                                <strong>{t('watchlist.priceSentimentNotifications.conditionsTitle')}</strong>
                                <span>{t('watchlist.priceSentimentNotifications.conditionsHint')}</span>
                            </div>
                            <div className="price-sentiment-alert-dialog__sentiments">
                                {options.map(key => (
                                    <label
                                        key={key}
                                        htmlFor={`price-sentiment-option-${key}`}
                                        className="price-sentiment-alert-dialog__sentiment"
                                    >
                                        <input
                                            id={`price-sentiment-option-${key}`}
                                            type="checkbox"
                                            checked={draft.selectedSentiments.includes(key)}
                                            onChange={() => toggle(key)}
                                        />
                                        <span className="price-sentiment-alert-dialog__sentiment-check" />
                                        <span>{t(`watchlist.priceSentimentNotifications.sentiments.${key}`)}</span>
                                    </label>
                                ))}
                            </div>
                            {draft.enabled && !draft.selectedSentiments.length && (
                                <p className="price-sentiment-alert-dialog__error">{t('watchlist.priceSentimentNotifications.selectAtLeastOne')}</p>
                            )}
                        </section>
                        <div className="price-sentiment-alert-dialog__details">
                            <div className="price-sentiment-alert-dialog__detail">
                                <span>{t('watchlist.priceSentimentNotifications.schedule')}</span>
                                <strong>{t('watchlist.priceSentimentNotifications.scheduleValue')}</strong>
                            </div>
                            <div className="price-sentiment-alert-dialog__detail">
                                <span>{t('watchlist.priceSentimentNotifications.period')}</span>
                                <strong>{t('watchlist.priceSentimentNotifications.periodValue')}</strong>
                            </div>
                            {settings.registeredEmail && (
                                <div className="price-sentiment-alert-dialog__detail price-sentiment-alert-dialog__detail--full">
                                    <span>{t('watchlist.priceSentimentNotifications.recipient')}</span>
                                    <strong>{settings.registeredEmail}</strong>
                                </div>
                            )}
                        </div>
                        <p className="price-sentiment-alert-dialog__note">{t('watchlist.priceSentimentNotifications.triggerNote')}</p>
                        <div className="price-sentiment-alert-dialog__footer">
                            <div className="price-sentiment-alert-dialog__feedback" aria-live="polite">
                                {saved && <span className="price-sentiment-alert-dialog__success">{t('watchlist.priceSentimentNotifications.saved')}</span>}
                                {error && <span className="price-sentiment-alert-dialog__error">{error}</span>}
                            </div>
                            <button
                                type="button"
                                className="price-sentiment-alert-dialog__save"
                                onClick={save}
                                disabled={saving || !dirty || (draft.enabled && !draft.selectedSentiments.length)}
                            >
                                {saving ? t('watchlist.priceSentimentNotifications.saving') : t('watchlist.priceSentimentNotifications.save')}
                            </button>
                        </div>
                    </div>
                )}
            </Dialog>
        </>
    );
}

export default PriceSentimentNotificationSettings;
