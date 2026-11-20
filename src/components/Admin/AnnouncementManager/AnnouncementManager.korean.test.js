import React from 'react';
import { render, screen } from '@testing-library/react';
import AnnouncementEditor from './components/AnnouncementEditor';
import AnnouncementPreview from './components/AnnouncementPreview';
import AnnouncementBarPreview from '../../Common/AnnouncementBar/AnnouncementBarPreview';

let mockActiveLanguage = 'ko-KR';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: mockActiveLanguage } })
}));

describe('announcement hardcoded locale copy', () => {
  afterEach(() => {
    mockActiveLanguage = 'ko-KR';
  });

  it('renders Korean admin editor copy while retaining Chinese and English target-language fields', () => {
    render(<AnnouncementEditor config={{ settings: { maxLength: 500 } }} onSave={jest.fn()} onPreview={jest.fn()} saving={false} />);

    expect(screen.getByRole('heading', { name: '공지 수정' })).toBeInTheDocument();
    expect(screen.getByText('공지 메시지 (중국어)')).toBeInTheDocument();
    expect(screen.getByText('🇹🇼 번체 중국어')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('중국어 공지 내용을 입력하세요...')).toBeInTheDocument();
    expect(screen.getByText('공지 메시지 (영어)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter English announcement message...')).toBeInTheDocument();
  });

  it('renders Korean preview chrome while identifying the preview content as Traditional Chinese', () => {
    render(
      <AnnouncementPreview
        config={{ announcement: { enabled: true, message_zh: '測試公告', message_en: 'Test', autoHide: true, autoHideDelay: 8000 } }}
        previewData={null}
      />
    );

    expect(screen.getByRole('heading', { name: '실시간 미리보기' })).toBeInTheDocument();
    expect(screen.getByText('번체 중국어')).toBeInTheDocument();
    expect(screen.getByText('주식 시장 심리 분석')).toBeInTheDocument();
  });

  it('keeps Traditional Chinese admin copy unchanged for zh-TW', () => {
    mockActiveLanguage = 'zh-TW';
    render(<AnnouncementEditor config={{ settings: { maxLength: 500 } }} onSave={jest.fn()} onPreview={jest.fn()} saving={false} />);

    expect(screen.getByRole('heading', { name: '編輯公告' })).toBeInTheDocument();
    expect(screen.getByText('公告訊息 (中文)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('輸入中文公告內容...')).toBeInTheDocument();
  });

  it('localizes announcement close accessibility labels in Korean and preserves the Chinese labels', () => {
    const { rerender } = render(<AnnouncementBarPreview message="공지" isVisible onClose={jest.fn()} />);
    expect(screen.getByRole('button', { name: '공지 닫기' })).toHaveAttribute('title', '공지 닫기');

    mockActiveLanguage = 'zh-TW';
    rerender(<AnnouncementBarPreview message="公告" isVisible onClose={jest.fn()} />);
    expect(screen.getByRole('button', { name: '關閉公告' })).toHaveAttribute('title', '關閉公告');
  });
});
