import React from 'react';
import { Dialog } from '../Common/Dialog/Dialog';
import { useTranslation } from 'react-i18next';

function NewsDialog({ news, open, onClose }) {
    const { t } = useTranslation();
    if (!news) return null;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            title={t('watchlist.newsDialog.title')}
            maxWidth="md"
        >
            <div className="news-dialog-content" style={{ 
                maxHeight: '80vh',
                overflowY: 'auto',
                padding: '20px'
            }}>
                <div className="news-dialog-header">
                    <h3 className="news-dialog-title">{news.title}</h3>
                    <div className="news-dialog-meta">
                        <span className="news-dialog-source">{news.source}</span>
                        <span className="news-dialog-date">
                            {formatDate(news.publishedAt)}
                        </span>
                    </div>
                </div>
                {news.imageUrl && (
                    <img 
                        src={news.imageUrl} 
                        alt={news.title}
                        style={{
                            width: '100%',
                            maxHeight: '300px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            marginBottom: '16px'
                        }}
                        loading="lazy"
                    />
                )}
                <p className="news-dialog-description">{news.description}</p>
                <a 
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-dialog-link"
                >
                    {t('watchlist.newsDialog.readFullStory')}
                </a>
            </div>
        </Dialog>
    );
}

export default NewsDialog;
