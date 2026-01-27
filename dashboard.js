// X-Bot Pro v3.0 - Chrome Extension Logic
let stats = { likes: 0, rts: 0, follows: 0, unfollows: 0, total: 0 };
let isBotRunning = false;
const SETTINGS_KEY = 'xbot_pro_settings';
const STATS_KEY = 'xbot_stats';

// --- UI Helpers ---
function updateStatsUI() {
    const ids = {
        'statLikes': stats.likes,
        'statRTs': stats.rts,
        'statFollows': stats.follows,
        'statUnfollows': stats.unfollows
    };
    for (const [id, val] of Object.entries(ids)) {
        const el = document.getElementById(id);
        if (el) el.innerText = val || 0;
    }

    // Total calculation if needed
    // chrome.storage.local.set({ 'xbot_stats': stats });
}

let lastLog = "";
let lastLogTime = 0;

function addLog(msg, type) {
    const now = new Date();
    // 500ms içinde aynı mesajı tekrar yazma (mükerrer engelleme)
    if (msg === lastLog && (now - lastLogTime) < 500) return;
    lastLog = msg;
    lastLogTime = now;

    const container = document.getElementById('logContainer');
    if (!container) return;
    const timeStr = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}]`;
    const div = document.createElement('div');
    div.className = 'log-line';
    let typeClass = 'log-msg';
    if (type === 'success') typeClass += ' log-success';
    if (type === 'error') typeClass += ' log-error';
    if (type === 'info') typeClass += ' log-info';
    div.innerHTML = `<span class="log-time">${timeStr}</span> <span class="${typeClass}">${msg}</span>`;
    container.prepend(div);
}

function updateStatus(isRunning, taskName) {
    isBotRunning = isRunning;
    const stopBtn = document.getElementById('globalStop');
    const activeTaskText = document.getElementById('activeTask');
    if (isRunning) {
        if (stopBtn) stopBtn.style.display = 'flex';
        if (activeTaskText) {
            activeTaskText.innerHTML = `<span style="color:#3b82f6; font-weight:700;">AKTİF:</span> ${taskName || 'İşlem Sürüyor'}`;
        }
    } else {
        if (stopBtn) stopBtn.style.display = 'none';
        if (activeTaskText) {
            activeTaskText.innerText = "Hazır, komut bekleniyor...";
            activeTaskText.style.color = '#94a3b8';
        }
    }
}

// --- Communication with Content Script ---
async function sendToTwitter(action, extra = {}) {
    // 1. Find Active Twitter Tab
    const tabs = await new Promise(r => chrome.tabs.query({ url: ["https://twitter.com/*", "https://x.com/*"] }, r));
    const activeTab = tabs.find(t => t.active) || tabs[0];

    if (!activeTab) {
        addLog("Hata: Açık bir Twitter (X) sekmesi bulunamadı!", "error");
        return;
    }

    // 2. Gather Settings
    const speedProfile = document.getElementById('botSpeedProfile')?.value || 'normal';
    const multiplier = getSpeedMultiplier(speedProfile);

    const settings = {
        profile: speedProfile,
        multiplier: multiplier,
        skipChance: parseInt(document.getElementById('skipChance')?.value || 0),
        cycleSkipFollowers: document.getElementById('cycleSkipFollowers')?.checked,
        skipLikedUsers: document.getElementById('skipLikedUsers')?.value === "true",
        maxTweetAge: parseInt(document.getElementById('maxTweetAge')?.value || 24),
        maxScrollRetries: parseInt(document.getElementById('maxScrollRetries')?.value || 5),
        verifiedOnly: document.getElementById('verifiedOnly')?.value === "true",
        mouseSim: document.getElementById('mouseSim')?.value === "true",
        randomDelay: document.getElementById('randomDelay')?.value === "true",
        whiteList: (document.getElementById('whiteList')?.value || "").toLowerCase().split(/[,\n]/).map(h => h.trim().replace('@', '')).filter(h => h !== ""),
        blacklistUsers: (document.getElementById('blacklistUsers')?.value || "").toLowerCase().split(/[,\n]/).map(h => h.trim().replace('@', '')).filter(h => h !== ""),

        // Detailed Speeds (Adjusted by multiplier)
        speedFollow: parseFloat(document.getElementById('speedFollow')?.value || 3) * multiplier,
        speedUnfollow: parseFloat(document.getElementById('speedUnfollow')?.value || 2) * multiplier,
        speedLike: parseFloat(document.getElementById('speedLike')?.value || 2) * multiplier,
        speedRT: parseFloat(document.getElementById('speedRT')?.value || 3) * multiplier,
        speedScroll: parseFloat(document.getElementById('speedScroll')?.value || 4) * multiplier,
        speedPageLoad: parseFloat(document.getElementById('speedPageLoad')?.value || 5) * multiplier,
        speedTyping: parseFloat(document.getElementById('speedTyping')?.value || 100) / multiplier, // Typing is faster with higher multiplier
        speedCleanup: parseFloat(document.getElementById('speedCleanup')?.value || 2) * multiplier,

        // Keyword Filter
        keywordFilterEnabled: document.getElementById('keywordFilterEnabled')?.value === "true",
        blacklistKeywords: (document.getElementById('blacklistKeywords')?.value || "").toLowerCase().split('\n').map(k => k.trim()).filter(k => k !== ""),
        whitelistKeywords: (document.getElementById('whitelistKeywords')?.value || "").toLowerCase().split('\n').map(k => k.trim()).filter(k => k !== ""),

        // Anti-Shadowban
        antiShadowbanEnabled: document.getElementById('antiShadowbanEnabled')?.value === "true",
        actionsBeforeBreak: parseInt(document.getElementById('actionsBeforeBreak')?.value || 20),
        breakDuration: parseInt(document.getElementById('breakDuration')?.value || 5)
    };

    updateStatus(true, action.split('_').join(' ').toUpperCase());
    addLog(`Komut Gönderildi: ${action}`, 'info');

    const message = { action, settings, ...extra };

    // 3. Send Message
    try {
        chrome.tabs.sendMessage(activeTab.id, message);
        // Not: Response beklemek Twitter'ın SPA yapısında (sayfa geçişlerinde) "port closed" hatasına neden olabiliyor.
        // Bu yüzden "ateşle ve unut" (fire and forget) yöntemini kullanıyoruz.
    } catch (e) {
        console.error("Message send failed:", e);
    }
}

// --- Listen to Content Script Messages ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.log) addLog(request.log, request.logType);

    if (request.action === "STATS_UPDATED") {
        stats = request.data;
        updateStatsUI();
    }

    if (request.status === 'finished') {
        addLog("İşlem tamamlandı/durdu.", "info");
        updateStatus(false);
    }

    if (request.action === "CACHE_UPDATED") {
        addLog(`Önbellek güncellendi: ${request.count} kişi.`, "success");
        updateCacheStatusUI(request.count, Date.now());
    }
});

function updateCacheStatusUI(count, timestamp) {
    const el = document.getElementById('followerCacheStatus');
    if (el) {
        const date = new Date(timestamp).toLocaleDateString();
        el.innerText = `Durum: ${count} kişi (${date})`;
        el.style.color = 'var(--success)';
        el.style.fontWeight = 'bold';
    }

    // İşlem bittiğinde butonu eski haline getir
    const btn = document.getElementById('updateFollowerCache');
    if (btn) {
        btn.disabled = false;
        btn.innerText = "🔄 Listeyi Şimdi Güncelle";
    }
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Stats Load
    chrome.storage.local.get(['xbot_stats', SETTINGS_KEY], (res) => {
        if (res.xbot_stats) {
            stats = res.xbot_stats;
            updateStatsUI();
        }
        if (res[SETTINGS_KEY]) loadSettings(res[SETTINGS_KEY]);
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const pageId = item.getAttribute('data-page');
            document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
            document.getElementById('page-' + pageId)?.classList.add('active');
        });
    });

    // Keyword Filter UI Toggle
    const keywordToggle = document.getElementById('keywordFilterEnabled');
    const keywordSection = document.getElementById('keywordFilterSection');
    if (keywordToggle && keywordSection) {
        const updateKeywordUI = () => {
            keywordSection.style.display = keywordToggle.value === 'true' ? 'block' : 'none';
        };
        keywordToggle.addEventListener('change', updateKeywordUI);
        setTimeout(updateKeywordUI, 200); // Wait for loadSettings
    }

    // Anti-Shadowban UI Toggle
    const asToggle = document.getElementById('antiShadowbanEnabled');
    const asSection = document.getElementById('antiShadowbanSection');
    if (asToggle && asSection) {
        const updateAsUI = () => {
            asSection.style.display = asToggle.value === 'true' ? 'flex' : 'none';
        };
        asToggle.addEventListener('change', updateAsUI);
        setTimeout(updateAsUI, 200);
    }

    // Settings Auto-Save
    document.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('change', saveSettings);
    });

    // --- Button Bindings ---
    const bind = (id, cb) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', cb);
    };

    // Global
    bind('globalStop', () => sendToTwitter('stop_all'));
    // bind('refreshStats', () => { }); // Removed
    bind('resetStats', () => {
        // Reset in storage
        chrome.storage.local.set({ [STATS_KEY]: { likes: 0, rts: 0, follows: 0, unfollows: 0, total: 0 } }, () => {
            // Reset in memory
            stats = { likes: 0, rts: 0, follows: 0, unfollows: 0, total: 0 };
            // Update UI
            updateStatsUI();
            addLog("İstatistikler başarıyla sıfırlandı.", "success");
        });
    });

    bind('clearInteracted', () => {
        if (confirm("Etkileşim geçmişini temizlemek istediğinize emin misiniz?")) {
            chrome.storage.local.set({ interactedUsers: [] }, () => {
                const listEl = document.getElementById('interactedList');
                if (listEl) listEl.innerHTML = "Henüz kayıt yok.";
                addLog("Etkileşim geçmişi temizlendi.", "success");
            });
        }
    });

    bind('viewInteracted', () => {
        const listEl = document.getElementById('interactedList');
        if (!listEl) return;

        const isHidden = listEl.style.display === 'none';
        listEl.style.display = isHidden ? 'block' : 'none';

        if (isHidden) {
            chrome.storage.local.get(['interactedUsers'], (res) => {
                const users = res.interactedUsers || [];
                if (users.length === 0) {
                    listEl.innerHTML = "Henüz kayıt yok.";
                } else {
                    listEl.innerHTML = users.map(u => `<div style="padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">@${u}</div>`).join('');
                }
            });
        }
    });

    // Automation
    bind('feedLike', () => sendToTwitter('explore_like', { count: parseInt(document.querySelector('#feedCount').value), overrideDelay: parseInt(document.querySelector('#feedDelay').value) }));
    bind('feedRT', () => sendToTwitter('explore_retweet', { count: parseInt(document.querySelector('#feedCount').value), overrideDelay: parseInt(document.querySelector('#feedDelay').value) }));

    // Manual Tools
    const getVal = (id) => document.getElementById(id).value;
    bind('manualLike', () => sendToTwitter('direct_like', { target: getVal('manualTarget') }));
    bind('manualRT', () => sendToTwitter('direct_retweet', { target: getVal('manualTarget') }));
    bind('manualFollow', () => sendToTwitter('direct_follow', { target: getVal('manualTarget') }));

    bind('manualReplyToggle', () => {
        const el = document.getElementById('replyInputManual');
        const btn = document.getElementById('manualReplyStart');
        const isShow = el.style.display === 'block';
        el.style.display = isShow ? 'none' : 'block';
        btn.style.display = isShow ? 'none' : 'block';
    });
    bind('manualReplyStart', () => sendToTwitter('direct_reply', { target: getVal('manualTarget'), text: getVal('manualReplyText') }));
    // Bulk Cycle (Recursive)
    bind('cycleLike', () => sendToTwitter('recursive_reply', {
        totalTweets: parseInt(document.getElementById('cycleCount').value),
        mentsPerTweet: parseInt(document.getElementById('cycleMentPerTweet').value),
        type: 'like',
        overrideDelay: parseInt(document.getElementById('cycleDelay').value)
    }));
    bind('cycleRT', () => sendToTwitter('recursive_reply', {
        totalTweets: parseInt(document.getElementById('cycleCount').value),
        mentsPerTweet: parseInt(document.getElementById('cycleMentPerTweet').value),
        type: 'retweet',
        overrideDelay: parseInt(document.getElementById('cycleDelay').value)
    }));

    bind('updateFollowerCache', () => {
        if (confirm("Takipçi listeniz taranıp kaydedilecek. Bu işlem takipçi sayınıza göre (9k+) biraz zaman alabilir. Sayfayı kapatmayın. Başlatılsın mı?")) {
            const btn = document.getElementById('updateFollowerCache');
            if (btn) { btn.disabled = true; btn.innerText = "⏳ İşleniyor... (Lütfen bekleyin)"; }

            const status = document.getElementById('followerCacheStatus');
            if (status) status.innerText = "Durum: Güncelleniyor...";

            sendToTwitter('scrape_followers_cache');
        }
    });

    // View List Modal Logic
    bind('viewFollowerCache', () => {
        chrome.storage.local.get(['cachedFollowers'], (res) => {
            const list = res.cachedFollowers || [];
            if (list.length === 0) {
                alert("Henüz kayıtlı takipçi listeniz yok. Lütfen önce listeyi güncelleyin.");
                return;
            }
            const modal = document.getElementById('uListModal');
            const textArea = document.getElementById('uListText');
            if (modal && textArea) {
                textArea.value = list.join('\n');
                modal.style.display = 'flex';
            }
        });
    });

    bind('clearFollowerCache', () => {
        if (confirm("Takipçi önbelleğini (cachedFollowers) silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
            chrome.storage.local.remove(['cachedFollowers', 'cachedFollowersTime'], () => {
                const status = document.getElementById('followerCacheStatus');
                if (status) {
                    status.innerText = "Durum: Yok";
                    status.style.color = "var(--text-muted)";
                }
                addLog("Önbellek başarıyla temizlendi.", "success");
            });
        }
    });

    bind('closeUListModal', () => {
        document.getElementById('uListModal').style.display = 'none';
    });

    bind('copyUList', () => {
        const txt = document.getElementById('uListText');
        txt.select();
        document.execCommand('copy');
        const btn = document.getElementById('copyUList');
        const oldText = btn.innerText;
        btn.innerText = "Kopyalandı! ✅";
        setTimeout(() => btn.innerText = oldText, 2000);
    });

    // Close modal on outside click
    window.onclick = function (event) {
        const modal = document.getElementById('uListModal');
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Initial Cache Check
    chrome.storage.local.get(['cachedFollowers', 'cachedFollowersTime'], (res) => {
        if (res.cachedFollowers) {
            updateCacheStatusUI(res.cachedFollowers.length, res.cachedFollowersTime || Date.now());
        }
    });



    // Follow & Unfollow
    bind('startTargetFollow', () => {
        let username = getVal('targetUsername').trim();
        // Eğer URL girildiyse kullanıcı adını ayıkla
        if (username.includes('x.com/') || username.includes('twitter.com/')) {
            username = username.split('/').pop().split('?')[0];
        } else {
            username = username.replace('@', '');
        }

        const type = getVal('targetListType');
        const count = parseInt(getVal('targetFollowCount'));
        if (!username) { addLog("Hata: Hedef kullanıcı adı girin!", "error"); return; }
        sendToTwitter('target_follow', { username, type, count });
    });

    bind('downloadCSV', () => {
        let username = getVal('targetUsername').trim();
        if (username.includes('x.com/') || username.includes('twitter.com/')) {
            username = username.split('/').pop().split('?')[0];
        } else {
            username = username.replace('@', '');
        }
        const type = getVal('targetListType');
        const count = parseInt(getVal('targetFollowCount'));
        if (!username) { addLog("Hata: Hedef kullanıcı adı girin!", "error"); return; }
        sendToTwitter('scrape_csv', { username, listType: type, count });
    });

    bind('startListFollow', () => {
        const text = document.getElementById('userListInput').value;
        const usernames = text.split(/[\n,]/).map(u => u.trim()).filter(u => u !== "" && u !== "@");
        if (usernames.length === 0) { addLog("Hata: Kullanıcı adı listesi boş!", "error"); return; }

        const count = parseInt(getVal('followCount')); // Toplu ayarlardaki hızı vs kullanabiliriz
        const speed = parseFloat(getVal('followSpeed'));
        const delay = parseInt(getVal('followDelay'));

        sendToTwitter('follow_username_list', { usernames, settings: { speed, delay } });
    });

    bind('startFollow', () => sendToTwitter('follow_list', { count: parseInt(getVal('followCount')), settings: { speed: parseFloat(getVal('followSpeed')), delay: parseInt(getVal('followDelay')) } }));
    bind('startUnfollow', () => sendToTwitter('unfollow_list', { count: parseInt(getVal('followCount')), settings: { speed: parseFloat(getVal('followSpeed')), delay: parseInt(getVal('followDelay')) } }));
    bind('startUnfollowNonFollowersMain', () => sendToTwitter('unfollow_nonfollowers', { count: parseInt(getVal('followCount')), settings: { speed: parseFloat(getVal('followSpeed')), delay: parseInt(getVal('followDelay')) } }));
    bind('startUnfollowUnverifiedMain', () => sendToTwitter('unfollow_unverified', { count: parseInt(getVal('followCount')), settings: { speed: parseFloat(getVal('followSpeed')), delay: parseInt(getVal('followDelay')) } }));

    // CLEANUP BUTTONS
    bind('startUnlike', () => sendToTwitter('cleanup_likes', { count: parseInt(getVal('contentCleanupCount')), settings: { speed: 1 } }));
    bind('startDeleteTweets', () => sendToTwitter('cleanup_tweets', { count: parseInt(getVal('contentCleanupCount')), settings: { speed: 1 } }));
    bind('startDeleteReplies', () => sendToTwitter('cleanup_replies', { count: parseInt(getVal('contentCleanupCount')), settings: { speed: 1 } }));
    bind('startDeleteRetweets', () => sendToTwitter('cleanup_retweets', { count: parseInt(getVal('contentCleanupCount')), settings: { speed: 1 } }));

    // Data Management
    bind('saveBlacklist', () => {
        saveSettings();
        addLog("Kara liste başarıyla kaydedildi.", "success");
    });


    // Veri senkronizasyonu için storage dinleyici
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.xbot_stats) {
            stats = changes.xbot_stats.newValue;
            updateStatsUI();
        }
    });

});


// --- Settings Logic ---
function saveSettings() {
    const getValue = (id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        if (el.type === 'checkbox') return el.checked;
        if (el.value === "true") return true;
        if (el.value === "false") return false;
        return el.value;
    };

    const s = {
        botSpeedProfile: getValue('botSpeedProfile'),
        speedFollow: getValue('speedFollow'),
        speedUnfollow: getValue('speedUnfollow'),
        speedLike: getValue('speedLike'),
        speedRT: getValue('speedRT'),
        speedScroll: getValue('speedScroll'),
        speedPageLoad: getValue('speedPageLoad'),
        speedTyping: getValue('speedTyping'),
        speedCleanup: getValue('speedCleanup'),
        randomDelay: getValue('randomDelay'),
        mouseSim: getValue('mouseSim'),
        verifiedOnly: getValue('verifiedOnly'),
        skipLikedUsers: getValue('skipLikedUsers'),
        blacklistUsers: getValue('blacklistUsers'),
        whiteList: getValue('whiteList'),
        maxTweetAge: getValue('maxTweetAge'),
        maxScrollRetries: getValue('maxScrollRetries'),
        skipChance: getValue('skipChance'),
        cycleSkipFollowers: getValue('cycleSkipFollowers'),
        keywordFilterEnabled: getValue('keywordFilterEnabled'),
        blacklistKeywords: getValue('blacklistKeywords'),
        whitelistKeywords: getValue('whitelistKeywords'),
        antiShadowbanEnabled: getValue('antiShadowbanEnabled'),
        actionsBeforeBreak: getValue('actionsBeforeBreak'),
        breakDuration: getValue('breakDuration')
    };
    chrome.storage.local.set({ [SETTINGS_KEY]: s });
}

function loadSettings(s) {
    if (!s) return;
    const ids = [
        'botSpeedProfile', 'speedFollow', 'speedUnfollow', 'speedLike', 'speedRT',
        'speedScroll', 'speedPageLoad', 'speedTyping', 'speedCleanup',
        'randomDelay', 'mouseSim', 'verifiedOnly', 'skipLikedUsers',
        'whiteList', 'blacklistUsers', 'maxTweetAge', 'skipChance', 'maxScrollRetries',
        'feedCount', 'feedDelay', 'targetUsername', 'targetListType', 'targetFollowCount',
        'cycleSkipFollowers',
        'keywordFilterEnabled', 'blacklistKeywords', 'whitelistKeywords',
        'keywordFilterEnabled', 'blacklistKeywords', 'whitelistKeywords',
        'antiShadowbanEnabled', 'actionsBeforeBreak', 'breakDuration'
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && s[id] !== undefined && s[id] !== null) {
            if (el.type === 'checkbox') {
                el.checked = s[id];
            } else {
                el.value = s[id].toString();
            }
        }
    });
}

function getSpeedMultiplier(profile) {
    switch (profile) {
        case 'turbo': return 0.5; // Half delays (Faster)
        case 'safe': return 1.35; // 35% more delay (Slower)
        case 'slow': return 2.5; // 2.5x delay (Very Slow)
        default: return 1.0; // Normal
    }
}


