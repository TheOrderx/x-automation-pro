// Background Service Worker
// Eklentinin arka planda çalışmasını sağlayan ana dosya

const STATS_KEY = 'xbot_stats';

chrome.runtime.onInstalled.addListener(() => {
    console.log("X-Bot Eklentisi başarıyla yüklendi.");
    chrome.storage.local.get([STATS_KEY], (res) => {
        if (!res[STATS_KEY]) {
            chrome.storage.local.set({ [STATS_KEY]: { likes: 0, rts: 0, ments: 0, follows: 0, unfollows: 0, total: 0 } });
        }
    });
});

// İstatistikleri Arka Planda Yönet
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "UPDATE_STAT") {
        chrome.storage.local.get([STATS_KEY], (res) => {
            let stats = res[STATS_KEY] || { likes: 0, rts: 0, ments: 0, follows: 0, unfollows: 0, total: 0 };
            if (stats[request.name] !== undefined) {
                stats[request.name]++;
                stats.total++;
                chrome.storage.local.set({ [STATS_KEY]: stats }, () => {
                    chrome.runtime.sendMessage({ action: "STATS_UPDATED", data: stats }).catch(() => { });
                });
            }
        });
        return false;
    }

});
