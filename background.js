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

// API Headers & Template Capture System
let apiHeaders = {};

// Twitter'ın kendi API isteklerini dinle
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        // 1. Headers Yakala
        if (details.requestHeaders) {
            apiHeaders = {}; // Reset container

            // Kritik başlıkların hepsini topla
            details.requestHeaders.forEach(h => {
                const name = h.name.toLowerCase();
                if (name === 'authorization' || name.startsWith('x-') || name === 'content-type') {
                    apiHeaders[name] = h.value;
                }
            });

            // En azından auth varsa kaydet
            if (apiHeaders['authorization'] && apiHeaders['x-csrf-token']) {
                chrome.storage.local.set({ 'xbot_api_headers': apiHeaders });
            }
        }

        // 2. URL Template Yakala (Followers)
        // URL içinde 'Followers' geçiyorsa ve 'graphql' varsa bu bizim aradığımız query'dir.
        if (details.method === 'GET' && details.url.includes('/Followers') && details.url.includes('graphql')) {
            // URL'i sakla, daha sonra cursor parametresini değiştirerek kullanacağız.
            chrome.storage.local.set({ 'xbot_api_url_followers': details.url });
            console.log("Followers API Template Captured:", details.url);
        }
    },
    { urls: ["https://twitter.com/i/api/*", "https://x.com/i/api/*"] },
    ["requestHeaders"]
);
