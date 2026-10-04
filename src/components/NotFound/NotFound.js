import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../PageContainer/PageContainer';
import { normalizeLocale } from '../../utils/socialMetadata';

export default function NotFound() {
  const { t } = useTranslation();
  const { lang } = useParams();
  const locale = normalizeLocale(lang);
  return (
    <PageContainer title={t('notFound.title')} description={t('notFound.description')}
      robots="noindex, follow" includeHreflang={false}>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.description')}</p>
      <p><Link to={`/${locale}/`}>{t('notFound.home')}</Link></p>
      <p><Link to={`/${locale}/articles/`}>{t('notFound.articles')}</Link></p>
    </PageContainer>
  );
}
