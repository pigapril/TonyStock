import announcementCooldownManager from './announcementCooldown';

describe('announcementCooldownManager', () => {
  const baseConfig = {
    enabled: true,
    message: '系統維護通知',
    lastUpdated: '2026-03-21T10:00:00.000Z'
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-21T12:00:00.000Z'));
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  it('uses progressive cooldown windows for repeated dismissals', () => {
    expect(announcementCooldownManager.shouldShowAnnouncement(baseConfig)).toBe(true);

    announcementCooldownManager.dismissAnnouncement(baseConfig);
    let stats = announcementCooldownManager.getAnnouncementStats(baseConfig);
    expect(stats.dismissCount).toBe(1);
    expect(stats.isInCooldown).toBe(true);

    jest.advanceTimersByTime((6 * 60 * 60 * 1000) + 1);
    expect(announcementCooldownManager.shouldShowAnnouncement(baseConfig)).toBe(true);

    announcementCooldownManager.dismissAnnouncement(baseConfig);
    stats = announcementCooldownManager.getAnnouncementStats(baseConfig);
    expect(stats.dismissCount).toBe(2);

    jest.advanceTimersByTime((24 * 60 * 60 * 1000) - 1);
    expect(announcementCooldownManager.shouldShowAnnouncement(baseConfig)).toBe(false);
    jest.advanceTimersByTime(1);
    expect(announcementCooldownManager.shouldShowAnnouncement(baseConfig)).toBe(true);
  });

  it('treats an updated announcement version as a fresh item', () => {
    announcementCooldownManager.dismissAnnouncement(baseConfig);
    expect(announcementCooldownManager.shouldShowAnnouncement(baseConfig)).toBe(false);

    const updatedConfig = {
      ...baseConfig,
      lastUpdated: '2026-03-22T08:00:00.000Z'
    };

    expect(announcementCooldownManager.shouldShowAnnouncement(updatedConfig)).toBe(true);
    expect(announcementCooldownManager.getAnnouncementStats(updatedConfig)).toEqual({
      dismissCount: 0,
      lastDismissed: null,
      nextShowTime: null,
      isInCooldown: false
    });
  });

  it('fails closed when localStorage read or write throws', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(announcementCooldownManager.shouldShowAnnouncement(baseConfig)).toBe(true);
    expect(() => announcementCooldownManager.dismissAnnouncement(baseConfig)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('cleans up expired announcement entries older than thirty days', () => {
    const staleConfig = {
      ...baseConfig,
      message: '舊公告'
    };

    announcementCooldownManager.dismissAnnouncement(baseConfig);
    announcementCooldownManager.dismissAnnouncement(staleConfig);

    const staleStats = announcementCooldownManager.getAnnouncementStats(staleConfig);
    const storedData = JSON.parse(localStorage.getItem('tony_stock_announcement_cooldown'));
    storedData[staleStats.announcementId].lastDismissed = '2026-01-01T00:00:00.000Z';
    localStorage.setItem('tony_stock_announcement_cooldown', JSON.stringify(storedData));

    announcementCooldownManager.cleanupExpiredData();

    const cleanedData = JSON.parse(localStorage.getItem('tony_stock_announcement_cooldown'));
    expect(cleanedData[staleStats.announcementId]).toBeUndefined();
    expect(Object.keys(cleanedData)).toHaveLength(1);
  });
});
