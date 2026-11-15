import React, { useEffect, useId, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaPlus } from 'react-icons/fa';
import { Dialog } from '../Common/Dialog/Dialog';
import './AddToWatchlistDialog.css';

const getStockSymbol = (stock) => (
  stock?.symbol || stock?.stockSymbol || stock?.stockCode || ''
).toString().trim().toUpperCase();

const categoryContainsStock = (category, stockCode) => (
  (category?.stocks || []).some((stock) => getStockSymbol(stock) === stockCode)
);

export function AddToWatchlistDialog({
  open,
  categories,
  stockCode,
  stockPriceText,
  sentimentText,
  sentimentTone = 'neutral',
  saving,
  onClose,
  onSubmit
}) {
  const { t } = useTranslation();
  const radioName = useId();
  const [categoryId, setCategoryId] = useState('');
  const [createNew, setCreateNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const normalizedStockCode = String(stockCode || '').trim().toUpperCase();

  useEffect(() => {
    if (!open) return;
    const firstAvailableCategory = categories.find(
      (category) => !categoryContainsStock(category, normalizedStockCode)
    );
    setCategoryId(firstAvailableCategory?.id || '');
    setCreateNew(categories.length === 0);
    setNewCategoryName('');
  }, [open, categories, normalizedStockCode]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (saving) return;
    if (createNew && !newCategoryName.trim()) return;
    if (!createNew && !categoryId) return;

    onSubmit({
      categoryId: createNew ? null : categoryId,
      newCategoryName: createNew ? newCategoryName.trim() : null
    });
  };

  const description = createNew
    ? t('priceAnalysis.addToWatchlist.newCategoryDescription', { defaultValue: '建立分類後，這檔股票會直接加入追蹤清單。' })
    : t('priceAnalysis.addToWatchlist.description', {
      stockCode: normalizedStockCode,
      defaultValue: '將這檔股票加入追蹤清單，並選擇要放入的分類。'
    });

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      title={t('priceAnalysis.addToWatchlist.title', { defaultValue: '加入追蹤清單' })}
      description={description}
      className="add-to-watchlist-dialog"
      maxWidth="md"
    >
      <form className="add-to-watchlist-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="add-to-watchlist-dialog__stock" aria-label={t('priceAnalysis.addToWatchlist.stockContext', { defaultValue: '目前分析的股票' })}>
          <div className="add-to-watchlist-dialog__stock-identity">
            <span className="add-to-watchlist-dialog__stock-caption">
              {t('priceAnalysis.addToWatchlist.stockContext', { defaultValue: '目前分析的股票' })}
            </span>
            <span className="add-to-watchlist-dialog__stock-symbol">{normalizedStockCode || '—'}</span>
          </div>
          {(stockPriceText || sentimentText) ? (
            <div className="add-to-watchlist-dialog__stock-metrics">
              {stockPriceText ? (
                <span className="add-to-watchlist-dialog__stock-price">{stockPriceText}</span>
              ) : null}
              {sentimentText ? (
                <span className={`add-to-watchlist-dialog__sentiment add-to-watchlist-dialog__sentiment--${sentimentTone}`}>
                  {sentimentText}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {!createNew ? (
          <fieldset className="add-to-watchlist-dialog__category-section" disabled={saving}>
            <legend className="add-to-watchlist-dialog__section-heading">
              <span>{t('priceAnalysis.addToWatchlist.categoryLabel', { defaultValue: '選擇分類' })}</span>
              <span className="add-to-watchlist-dialog__category-total">
                {t('priceAnalysis.addToWatchlist.categoryTotal', {
                  count: categories.length,
                  defaultValue: '{{count}} 個分類'
                })}
              </span>
            </legend>

            {categories.length > 0 ? (
              <div className="add-to-watchlist-dialog__category-list" role="radiogroup" aria-label={t('priceAnalysis.addToWatchlist.categoryLabel', { defaultValue: '選擇分類' })}>
                {categories.map((category) => {
                  const alreadyAdded = categoryContainsStock(category, normalizedStockCode);
                  const selected = categoryId === category.id;
                  const stockCount = category.stocks?.length || 0;

                  return (
                    <label
                      key={category.id}
                      className={[
                        'add-to-watchlist-dialog__category-option',
                        selected && 'is-selected',
                        alreadyAdded && 'is-disabled'
                      ].filter(Boolean).join(' ')}
                    >
                      <input
                        className="add-to-watchlist-dialog__radio"
                        type="radio"
                        name={radioName}
                        value={category.id}
                        checked={selected}
                        autoFocus={selected}
                        onChange={() => setCategoryId(category.id)}
                        disabled={saving || alreadyAdded}
                      />
                      <span className="add-to-watchlist-dialog__radio-indicator" aria-hidden="true">
                        {selected ? <FaCheck /> : null}
                      </span>
                      <span className="add-to-watchlist-dialog__category-copy">
                        <span className="add-to-watchlist-dialog__category-name">{category.name}</span>
                      </span>
                      <span className="add-to-watchlist-dialog__category-meta">
                        <span className="add-to-watchlist-dialog__category-count">
                          {t('priceAnalysis.addToWatchlist.stockCount', {
                            count: stockCount,
                            defaultValue: '{{count}} 檔股票'
                          })}
                        </span>
                        {alreadyAdded ? (
                          <span className="add-to-watchlist-dialog__already-added">
                            {t('priceAnalysis.addToWatchlist.alreadyAdded', { defaultValue: '已加入' })}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="add-to-watchlist-dialog__empty-categories">
                {t('priceAnalysis.addToWatchlist.noCategories', { defaultValue: '目前還沒有分類，建立一個新分類即可開始追蹤。' })}
              </p>
            )}

            <button
              type="button"
              className="add-to-watchlist-dialog__create-category"
              onClick={() => setCreateNew(true)}
              disabled={saving}
            >
              <FaPlus aria-hidden="true" />
              {t('priceAnalysis.addToWatchlist.createNew', { defaultValue: '建立新分類' })}
            </button>
          </fieldset>
        ) : (
          <div className="add-to-watchlist-dialog__new-category">
            <label className="add-to-watchlist-dialog__field" htmlFor="add-to-watchlist-category-name">
              <span>{t('priceAnalysis.addToWatchlist.newCategoryLabel', { defaultValue: '新分類名稱' })}</span>
              <input
                id="add-to-watchlist-category-name"
                autoFocus
                maxLength={26}
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder={t('priceAnalysis.addToWatchlist.newCategoryPlaceholder', { defaultValue: '例如：長期投資' })}
                disabled={saving}
                aria-required="true"
                aria-describedby="add-to-watchlist-category-hint"
              />
            </label>
            <p id="add-to-watchlist-category-hint" className="add-to-watchlist-dialog__field-hint">
              {t('priceAnalysis.addToWatchlist.newCategoryHint', { defaultValue: '最多 26 個字元。建立後，股票會直接加入這個分類。' })}
            </p>
            {categories.length > 0 ? (
              <button
                type="button"
                className="add-to-watchlist-dialog__back-to-categories"
                onClick={() => setCreateNew(false)}
                disabled={saving}
              >
                {t('priceAnalysis.addToWatchlist.chooseExisting', { defaultValue: '返回選擇既有分類' })}
              </button>
            ) : null}
          </div>
        )}

        <div className="add-to-watchlist-dialog__actions">
          <button type="button" className="add-to-watchlist-dialog__cancel" onClick={onClose} disabled={saving}>
            {t('common.cancel', { defaultValue: '取消' })}
          </button>
          <button
            type="submit"
            className="add-to-watchlist-dialog__submit"
            disabled={saving || (!createNew && !categoryId) || (createNew && !newCategoryName.trim())}
          >
            {saving
              ? t('priceAnalysis.addToWatchlist.saving', { defaultValue: '加入中…' })
              : t('priceAnalysis.addToWatchlist.confirm', { defaultValue: '加入追蹤清單' })}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

AddToWatchlistDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  categories: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    stocks: PropTypes.arrayOf(PropTypes.object)
  })).isRequired,
  stockCode: PropTypes.string,
  stockPriceText: PropTypes.string,
  sentimentText: PropTypes.string,
  sentimentTone: PropTypes.string,
  saving: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export default AddToWatchlistDialog;
