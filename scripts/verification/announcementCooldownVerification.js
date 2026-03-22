/* eslint-disable no-console */

function summarizeStats(manager, config) {
  const stats = manager.getAnnouncementStats(config);
  return {
    dismissCount: stats.dismissCount,
    isInCooldown: stats.isInCooldown,
    nextShowTime: stats.nextShowTime
      ? new Date(stats.nextShowTime).toLocaleString()
      : null
  };
}

function runAnnouncementCooldownVerification(manager, configs = []) {
  if (!manager || typeof manager.shouldShowAnnouncement !== 'function') {
    throw new Error('A valid announcementCooldownManager instance is required.');
  }

  manager.clearAllAnnouncementData();

  const results = configs.map((config) => {
    const id = manager.generateAnnouncementId(config);
    const shouldShowBeforeDismiss = manager.shouldShowAnnouncement(config);

    manager.dismissAnnouncement(config);

    return {
      id,
      message: config.message,
      shouldShowBeforeDismiss,
      statsAfterDismiss: summarizeStats(manager, config)
    };
  });

  console.table(results);
  return results;
}

module.exports = {
  runAnnouncementCooldownVerification
};
