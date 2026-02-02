// Load Stats
chrome.storage.local.get(['xbot_stats', 'cachedFollowers'], (res) => {
    if (res.xbot_stats) {
        document.getElementById('totalLikes').innerText = res.xbot_stats.likes || 0;
        document.getElementById('totalFollows').innerText = res.xbot_stats.follows || 0;
    }

    // Connection Status (Simulated based on storage presence)
    document.getElementById('connStatus').innerText = "● Sistem Aktif";
    document.getElementById('connStatus').style.color = "var(--success)";
});

// Navigation Helpers
const openDashboard = (params = '') => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html' + params) });
};

document.getElementById('openDash').addEventListener('click', () => openDashboard());

document.getElementById('cmdLoop').addEventListener('click', () => {
    // Open Dashboard and maybe trigger loop? For now just open.
    // Future: We could use URL params to auto-open specific tab
    openDashboard('#automation');
});

document.getElementById('cmdCache').addEventListener('click', () => {
    openDashboard('#home'); // Cache card is on home
});
