// Twitter İçerik Scripti - GM Bot Profesyonel Özellikleri
window.XBotInjected = true;
window.TwitterBot = {
    isStopped: false,
    sessionInteractions: 0,
    initSystem() {
        console.log("%c[X-BOT PRO] SİSTEM HAZIR | Komut Bekleniyor...", "color: #3b82f6; font-size: 16px; font-weight: bold; background: #000; padding: 10px; border-radius: 8px;");
    },
    async delay(ms, settings = null) {
        if (this.isStopped) throw new Error("STOPPED");
        let finalMs = ms;
        // Spam Koruması: Rastgele Gecikme
        if (settings && settings.randomDelay) {
            const jitter = Math.floor(Math.random() * 1500); // 0-1.5 saniye arası rastgele ekleme
            finalMs += jitter;
        }
        return new Promise(resolve => setTimeout(resolve, finalMs));
    },

    isContextValid() {
        return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    },

    safeSendMessage(msg) {
        if (this.isStopped || !this.isContextValid()) return;
        try {
            chrome.runtime.sendMessage(msg, () => {
                const err = chrome.runtime.lastError;
            });
        } catch (e) { }
    },

    async safeStorageGet(keys) {
        if (!this.isContextValid()) return {};
        return new Promise(resolve => {
            try {
                chrome.storage.local.get(keys, (res) => {
                    if (chrome.runtime.lastError) resolve({});
                    else resolve(res || {});
                });
            } catch (e) { resolve({}); }
        });
    },

    async safeStorageSet(data) {
        if (!this.isContextValid()) return;
        return new Promise(resolve => {
            try {
                chrome.storage.local.set(data, () => {
                    const err = chrome.runtime.lastError;
                    resolve();
                });
            } catch (e) { resolve(); }
        });
    },

    sendDashboardLog(msg, type = 'info') {
        console.log(`[X-Bot] ${msg}`);
        this.safeSendMessage({ log: msg, logType: type });
    },

    isWhitelisted(user, whiteList) {
        if (!whiteList || whiteList.length === 0) return false;
        const links = Array.from(user.querySelectorAll('a[href^="/"]'));
        for (const link of links) {
            const path = link.getAttribute('href').replace('/', '').toLowerCase().split('?')[0];
            if (path.includes('/') || ['home', 'explore', 'notifications', 'messages', 'i', 'settings'].includes(path)) continue;
            if (whiteList.includes(path)) return true;
        }
        return false;
    },

    incStat(name) {
        this.safeSendMessage({ action: "UPDATE_STAT", name: name });
    },

    getDayName() {
        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        return days[new Date().getDay()];
    },

    async typeText(element, text, customSpeed) {
        element.focus();
        element.click();
        await this.delay(customSpeed || 200);
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        await this.delay(200);
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', text);
        const pasteEvent = new ClipboardEvent('paste', {
            clipboardData: dataTransfer,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(pasteEvent);
        if (element.innerText.trim().length < 2) {
            document.execCommand('insertText', false, text);
        }
        ['input', 'change', 'blur', 'keyup'].forEach(name => {
            element.dispatchEvent(new Event(name, { bubbles: true }));
        });
        await this.delay(300);
    },

    async simulateInteraction(el) {
        if (!el) return;
        try {
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;

            const sendEvent = (type, cls = MouseEvent) => {
                const ev = new cls(type, {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: x,
                    clientY: y,
                    buttons: 1,
                    pointerType: 'mouse'
                });
                el.dispatchEvent(ev);
            };

            // Modern web uygulamaları için PointerEvent de ekliyoruz
            sendEvent('pointerover', PointerEvent);
            sendEvent('mouseover', MouseEvent);
            sendEvent('pointerdown', PointerEvent);
            sendEvent('mousedown', MouseEvent);

            await new Promise(r => setTimeout(r, 50 + Math.random() * 50)); // İnsan gibi kısa bekleme

            sendEvent('pointerup', PointerEvent);
            sendEvent('mouseup', MouseEvent);
            sendEvent('click', MouseEvent);

            // Yedek: Doğrudan click metodu
            if (typeof el.click === 'function') {
                el.click();
            }
        } catch (e) { }
    },

    forceClick(el) {
        if (!el) return;
        this.simulateInteraction(el);
    },

    getAuthorName(tweet) {
        try {
            const userDiv = tweet.querySelector('[data-testid="User-Name"]');
            if (userDiv) {
                const text = userDiv.innerText;
                const match = text.match(/@([a-zA-Z0-9_]{1,15})/);
                if (match) return match[1];
            }
            const links = Array.from(tweet.querySelectorAll('a[href^="/"]'));
            for (const link of links) {
                const href = link.getAttribute('href').replace('/', '').split('?')[0];
                if (['home', 'explore', 'notifications', 'messages', 'search'].includes(href)) continue;
                if (!href.includes('/')) {
                    const span = link.querySelector('span');
                    if (span && span.innerText.startsWith('@')) return href;
                    if (link.innerText.includes('@')) return href;
                }
            }
        } catch (e) { }
        return "Arkadaşım";
    },

    getMyUsername() {
        const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
        if (profileLink) {
            return profileLink.getAttribute('href').replace('/', '').split('?')[0];
        }
        return null;
    },

    isReply(tweet, currentPathId) {
        try {
            if (currentPathId) {
                const links = Array.from(tweet.querySelectorAll('a[href*="/status/"]'));
                const hasOtherId = links.some(l => !l.href.includes(currentPathId));
                if (hasOtherId) return true;
                if (tweet.querySelector('div[style*="width: 2px"]')) return true;
            }
            const rawText = tweet.innerText || "";
            const indicators = ["adlı kullanıcıya yanıt olarak", "Replying to", "En réponse à", "Yanıtlanıyor"];
            if (indicators.some(ind => rawText.includes(ind))) return true;
            if (tweet.querySelector('[data-testid="replyContext"]')) return true;
            if (tweet.querySelector('div[style*="width: 2px"]')) return true;
            return false;
        } catch (e) { return false; }
    },

    getTweetAgeInHours(tweet) {
        try {
            const timeEl = tweet.querySelector('time');
            if (timeEl) {
                const datetime = timeEl.getAttribute('datetime');
                if (datetime) {
                    const tweetDate = new Date(datetime);
                    const diffMs = (new Date()) - tweetDate;
                    return diffMs / (1000 * 60 * 60);
                }
            }
        } catch (e) { }
        return 0;
    },

    isValidAge(tweet, maxAgeHours) {
        if (!maxAgeHours || maxAgeHours <= 0) return true;
        return this.getTweetAgeInHours(tweet) <= maxAgeHours;
    },

    async checkIfFollows(tweet) {
        try {
            const userLink = tweet.querySelector('[data-testid="User-Name"] a');
            if (!userLink) return false;

            // Trigger hover
            const rect = userLink.getBoundingClientRect();
            const mouseOverEvent = new MouseEvent('mouseover', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2
            });
            userLink.dispatchEvent(mouseOverEvent);

            // Wait for card
            await this.delay(1800);

            // Check for card
            const hoverCard = document.querySelector('[data-testid="hoverCard"]');
            let follows = false;

            if (hoverCard) {
                const text = hoverCard.innerText || "";
                follows = /Sizi takip ediyor|Follows you|Takip ediyor|follows/i.test(text);

                // Mouse out to close
                const mouseOutEvent = new MouseEvent('mouseout', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: 0,
                    clientY: 0
                });
                userLink.dispatchEvent(mouseOutEvent);

                // Extra click on body to ensure close
                document.body.click();
            }

            return follows;
        } catch (e) { return false; }
    },

    async scrapeFollowersCacheAction() {
        this.isStopped = false;

        // 1. Username Retry Logic
        let myUsername = this.getMyUsername();
        if (!myUsername) {
            this.sendDashboardLog("⚠️ Kullanıcı adı bekleniyor...", "warning");
            for (let i = 0; i < 5; i++) {
                await this.delay(1000);
                myUsername = this.getMyUsername();
                if (myUsername) break;
            }
        }

        if (!myUsername) {
            this.sendDashboardLog("❌ Hata: Kullanıcı adı alınamadı! Sayfayı yenileyip tekrar deneyin.", "error");
            this.safeSendMessage({ status: "finished" });
            return;
        }

        // 2. URL Check & Redirect
        const currentUrl = window.location.href.toLowerCase();
        const targetPath = `/${myUsername.toLowerCase()}/followers`;

        if (!currentUrl.includes(targetPath)) {
            this.sendDashboardLog(`🔄 Yönlendiriliyor: followers`, "info");
            await this.safeStorageSet({ pendingTask: { action: 'scrape_followers_cache_auto' } });
            window.location.href = `https://x.com/${myUsername}/followers`;
            return;
        }

        // 3. Initiate Scrape
        this.sendDashboardLog("📥 Takipçi listesi yükleniyor...", "info");

        // Wait for list to appear
        await this.delay(3000);

        // Check if any user cell exists first
        let ready = false;
        for (let i = 0; i < 10; i++) {
            if (document.querySelector('[data-testid="UserCell"]')) {
                ready = true;
                break;
            }
            this.sendDashboardLog("⏳ Liste bekleniyor...", "info");
            window.scrollBy(0, 500);
            await this.delay(1500);
        }

        if (!ready) {
            this.sendDashboardLog("⚠️ Liste boş görünüyor veya yüklenmedi.", "warning");
        }

        // Load existing cache to append new ones
        const storageData = await this.safeStorageGet(['cachedFollowers']);
        const existingFollowers = storageData.cachedFollowers || [];
        const followers = new Set(existingFollowers);

        if (existingFollowers.length > 0) {
            this.sendDashboardLog(`📂 Mevcut Önbellek Yüklendi: ${existingFollowers.length} kişi. Üzerine ekleniyor...`, "info");
        }

        let stuckCounter = 0;
        let lastReportSize = 0;
        let lastScreenSignature = "";
        let lastScrollY = window.scrollY;
        let consecutiveEmpty = 0; // Değişken tanımlandı

        // Adaptive Loop
        while (!this.isStopped) {
            const initialSize = followers.size;

            // Collect
            const cells = document.querySelectorAll('[data-testid="UserCell"]');
            cells.forEach(c => {
                const userLink = c.querySelector('a[href^="/"][role="link"]');
                if (userLink) {
                    const u = userLink.getAttribute('href').replace('/', '').toLowerCase();
                    followers.add(u);
                }
            });

            // Akış Analizi
            const newCount = followers.size - initialSize;
            const currentScrollY = window.scrollY;

            // Eğer aşağı inebildiysek (sayfa akıyorsa) sayacı sıfırla
            // Çünkü hala listenin ortasındayız demektir.
            if (currentScrollY > lastScrollY + 50) {
                consecutiveEmpty = 0; // Hareket varsa durma!
            } else {
                consecutiveEmpty++; // Hareket yoksa (dipteysek) say
            }

            lastScrollY = currentScrollY;

            // Bitiş Kontrolü (Sayfa dibinde 15 kere denememize rağmen hareket yoksa)
            if (consecutiveEmpty > 15) {
                // Son bir gayret yukarı aşağı yap
                this.sendDashboardLog("🤔 Liste sonu kontrol ediliyor...", "warning");
                window.scrollBy(0, -500);
                await this.delay(1000);
                window.scrollBy(0, 1000);
                await this.delay(1000);

                if (window.scrollY <= lastScrollY + 10) {
                    // Gerçekten bitmiş
                    this.sendDashboardLog("✅ Liste sonuna ulaşıldı.", "success");
                    break;
                }
                consecutiveEmpty = 0; // Hareket ettik, devam
            }

            // Rate Limit / Hata Kontrolü
            const errorText = document.body.innerText;
            if (errorText.includes("Bir sorun oluştu") || errorText.includes("Something went wrong") || errorText.includes("tekrar dene")) {
                const retryBtn = Array.from(document.querySelectorAll('[role="button"]')).find(b =>
                    /Yeniden dene|Try again|Retry|Yenile/i.test(b.innerText)
                );

                if (retryBtn) {
                    retryBtn.click();
                    this.sendDashboardLog("🔄 Hata butonu tıklandı, devam ediliyor...", "info");
                    await this.delay(2000);
                    continue;
                }
            }

            // İLERLEME (Scroll) - Daha küçük adımlarla (daha az dikkat çeker)
            const scrollAmount = window.innerHeight * 0.6;
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' });

            // HIZ AYARI: TAM DENGELİ (Sweet Spot)
            // Hem hızlı ilerler hem limitten kaçınır
            const baseDelay = newCount > 0 ? 1000 : 350; // Yeni veri varsa 1sn, yoksa 0.35sn (Hızlı)
            const randomJitter = Math.floor(Math.random() * 100);

            await this.delay(baseDelay + randomJitter);
        }

        const data = Array.from(followers);
        await this.safeStorageSet({ cachedFollowers: data, cachedFollowersTime: Date.now() });
        this.sendDashboardLog(`✅ Önbellek Tamamlandı: ${data.length} kişi.`, "success");
        this.safeSendMessage({ action: "CACHE_UPDATED", count: data.length });
        this.safeSendMessage({ status: "finished" });
    },

    // --- API MODU (Ultra Hızlı) ---
    async fetchFollowersAPI(username, cursor = null, collected = new Set()) {
        const headersData = await this.safeStorageGet(['xbot_api_headers']);
        const headers = headersData.xbot_api_headers;

        if (!headers || !headers.authorization) {
            this.sendDashboardLog("⚠️ API Başlıkları bulunamadı. Lütfen önce sayfayı yenileyip manuel olarak Followers sekmesine bir kez tıklayın.", "error");
            // Fallback to Scroll
            return this.scrapeFollowersCacheAction();
        }

        const data = await this.safeStorageGet(['xbot_api_url_followers']);
        let url = data.xbot_api_url_followers;

        if (!url) {
            this.sendDashboardLog("⚠️ API Linki eksik. Lütfen sayfayı yenileyip Takipçiler sekmesini açın.", "error");
            // Fallback (API yoksa eskiye dön)
            return this.scrapeFollowersCacheAction();
        }

        this.sendDashboardLog(`🚀 API Modu Başlatılıyor... (Mevcut: ${collected.size})`, "info");

        // Cursor Handling
        if (cursor) {
            // URL içindeki variables parametresini parse et
            try {
                const urlObj = new URL(url);
                const params = new URLSearchParams(urlObj.search);
                const variables = JSON.parse(params.get('variables'));
                variables.cursor = cursor;
                params.set('variables', JSON.stringify(variables));
                url = `${urlObj.origin}${urlObj.pathname}?${params.toString()}`;
            } catch (e) { console.error("URL Parse Error", e); }
        }

        try {
            const res = await fetch(url, {
                headers: headers // Tüm başlıkları olduğu gibi kullan
            });

            if (!res.ok) {
                if (res.status === 429) {
                    this.sendDashboardLog(`⚠️ API Limiti Dolu (429). 5 dakika dinleniyor (Mevcut: ${collected.size})...`, "warning");
                    await this.delay(300000); // 5 dakika bekle
                    return this.fetchFollowersAPI(username, cursor, collected); // Retry with SAME cursor and SAME lists
                }
                if (res.status === 404) {
                    console.error("X-Bot 404 Error URL:", url);
                    await this.safeStorageSet({ xbot_api_url_followers: null }); // URL'i sil
                    throw new Error("Link (404). Lütfen sayfayı yenileyip Takipçiler sekmesine tekrar tıklayarak 'Kalibrasyon' yapın.");
                }
                throw new Error("HTTP " + res.status);
            }

            const json = await res.json();
            const instructions = json?.data?.user?.result?.timeline?.timeline?.instructions || [];
            let newCursor = null;

            // Extract Users
            const entries = instructions.find(i => i.type === 'TimelineAddEntries')?.entries || [];
            entries.forEach(entry => {
                if (entry.content?.itemContent?.user_results?.result?.legacy?.screen_name) {
                    collected.add(entry.content.itemContent.user_results.result.legacy.screen_name.toLowerCase());
                } else if (entry.content?.cursorType === 'Bottom' || entry.entryId.includes('cursor-bottom')) {
                    newCursor = entry.content.value;
                }
            });

            this.sendDashboardLog(`⚡ API: ${collected.size} kişi toplandı...`, "info");

            if (newCursor && newCursor !== cursor) {
                await this.delay(500 + Math.random() * 500); // Güvenlik için kısa bekleme
                return this.fetchFollowersAPI(username, newCursor, collected);
            } else {
                // FINISH
                const finalData = Array.from(collected);
                await this.safeStorageSet({ cachedFollowers: finalData, cachedFollowersTime: Date.now() });
                this.sendDashboardLog(`✅ API Çekimi Bitti: ${finalData.length} takipçi kaydedildi.`, "success");
                this.safeSendMessage({ action: "CACHE_UPDATED", count: finalData.length });
                this.safeSendMessage({ status: "finished" });
            }

        } catch (e) {
            this.sendDashboardLog(`❌ API Hatası: ${e.message}`, "error");
            this.safeSendMessage({ status: "finished" });
        }
    },

    // --- YENİ BAŞTAN TASARLANAN TOPLU DÖNGÜ SİSTEMİ ---

    // --- TOPLU MENT BEĞENME DÖNGÜSÜ ---

    async recursiveExplore(totalTweets, mPerT, type, settings) {
        this.sendDashboardLog(`🚀 Toplu döngü başlatıldı: ${totalTweets} tweet, ${mPerT} ment/tweet.`, "info");
        // Eğer zaten bir tweet'in içindeysek etkileşimi başlat
        if (window.location.href.includes('/status/')) {
            return this.interact(mPerT, type, true, true, settings);
        }

        // Mevcut durumu yükle veya yeni oluştur
        const res = await this.safeStorageGet(['xbot_bulk_state']);
        let state = res.xbot_bulk_state || {
            totalTweets: totalTweets,
            processedCount: 0,
            processedIds: [],
            type: type,
            mPerT: mPerT,
            settings: settings
        };

        // Etkileşim geçmişini yükle
        const storageData = await this.safeStorageGet(['interactedUsers']);
        const interactedUsers = storageData.interactedUsers || [];

        // Eğer hedef tamamlandıysa
        if (state.processedCount >= state.totalTweets) {
            this.sendDashboardLog(`✅ Toplam ${state.processedCount} tweet işlendi, döngü tamamlandı.`, "success");
            chrome.storage.local.remove(['xbot_bulk_state', 'pendingTask']);
            this.safeSendMessage({ status: "finished" });
            return;
        }

        this.sendDashboardLog(`🔁 [${state.processedCount + 1}/${state.totalTweets}] Yeni tweet aranıyor...`, "info");

        try {
            const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
            let targetTweet = null;
            let tId = null;

            this.sendDashboardLog(`🧐 Akış taranıyor (${tweets.length} tweet)...`, "info");

            for (const tweet of tweets) {
                // Sponsorlu içeriği atla
                const isPromoted = tweet.innerText.includes("Sponsorlu") ||
                    tweet.innerText.includes("Promoted") ||
                    tweet.innerText.includes("Ad") ||
                    tweet.querySelector('svg [path*="M19.49 2.3"]'); // Sponsorlu ikon tespiti (yedek)
                if (isPromoted) continue;

                const link = tweet.querySelector('a[href*="/status/"]');
                if (!link) continue;

                // Sadece sayısal ID'yi çek
                const match = link.href.match(/\/status\/(\d+)/);
                const id = match ? match[1] : null;

                if (!id || state.processedIds.includes(id)) continue;

                // Hedef bulundu, idle sayacını sıfırla
                state.exploreIdle = 0;

                // Yaş filtresi
                if (state.settings.maxTweetAge > 0 && !this.isValidAge(tweet, state.settings.maxTweetAge)) {
                    state.processedIds.push(id);
                    continue;
                }

                // Sahip/Kullanıcı kontrolü (Beğenilenleri Atla ve Kara Liste)
                const author = this.getAuthorName(tweet);
                if ((state.settings.blacklistUsers && state.settings.blacklistUsers.includes(author.toLowerCase())) ||
                    (state.settings.skipLikedUsers && interactedUsers.includes(author.toLowerCase()))) {
                    console.log(`[X-Bot] @${author} atlanıyor (Kara Liste veya Geçmiş Etkileşim).`);
                    state.processedIds.push(id);
                    continue;
                }

                targetTweet = tweet;
                tId = id;
                break;
            }

            if (targetTweet) {
                this.sendDashboardLog(`📍 Hedef: ${tId} açılıyor...`, "info");

                // Navigasyon öncesi ID'yi kaydet
                state.processedIds.push(tId);
                await this.safeStorageSet({
                    xbot_bulk_state: state,
                    pendingTask: { action: 'bulk_interact_step' }
                });

                targetTweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.delay(1000);

                const link = targetTweet.querySelector('a[href*="/status/"]');
                if (link) {
                    this.simulateInteraction(link);
                    await this.delay(3000);

                    // SPA Navigasyon Kontrolü: Eğer URL değiştiyse interaksiyona başla
                    if (window.location.href.includes(tId)) {
                        this.sendDashboardLog(`✅ Tweet sayfası (SPA) açıldı: ${tId}`, "info");
                        // 2 saniye tam yükleme bekle
                        await this.delay(2000);
                        return this.interact(state.mPerT, state.type, true, true, state.settings);
                    } else {
                        // SPA başarısızsa zorla yenile (init devralacak)
                        this.sendDashboardLog("🚀 Sayfa yüklenemedi, URL zorlanıyor...", "warning");
                        window.location.href = `https://x.com/i/status/${tId}`;
                    }
                }
            } else {
                state.exploreIdle = (state.exploreIdle || 0) + 1;
                const maxRetries = state.settings.maxScrollRetries || 5;
                this.sendDashboardLog(`🔍 Yeni tweet aranıyor... (${state.exploreIdle}/${maxRetries})`, "info");

                if (state.exploreIdle >= maxRetries) {
                    state.exploreIdle = 0;
                    await this.safeStorageSet({ xbot_bulk_state: state });
                    this.sendDashboardLog("🔄 Yeni içerik bulunamadı, akış yenileniyor...", "warning");
                    window.location.reload();
                    return;
                }

                window.scrollBy({ top: 800, behavior: 'smooth' });
                await this.delay(3000);

                // state güncellendi, kaydet
                await this.safeStorageSet({ xbot_bulk_state: state });

                if (this.isStopped) return;

                const isAtBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 600;
                if (isAtBottom) {
                    this.sendDashboardLog("🔄 Sayfa sonuna gelindi, akış yenileniyor...", "warning");
                    window.location.reload();
                } else {
                    return this.recursiveExplore(totalTweets, mPerT, type, settings);
                }
            }
        } catch (e) {
            if (e.message !== "STOPPED") console.error("Explore Error:", e);
        }
    },

    async interact(count, type, skipFirst = false, autoBack = false, settings = {}) {
        let processed = 0;
        let idleCycles = 0;
        const currentUrl = window.location.href;
        const currentPathId = currentUrl.split('/status/')[1]?.split(/[?#]/)[0];

        this.sendDashboardLog(`⚡ Yanıtlar inceleniyor (Hedef: ${count})...`, "info");

        // Başlangıç beklemesi ve hafif kaydırma (Tweet'in yüklenmesi için)
        await this.delay(3000);
        window.scrollBy(0, 300);

        // Etkileşim geçmişini yükle
        const storageData = await this.safeStorageGet(['interactedUsers']);
        let interactedUsers = storageData.interactedUsers || [];

        try {
            while (processed < count && idleCycles < 3 && !this.isStopped) {
                let foundInThisScroll = false;

                // Modalları kapat
                document.querySelectorAll('[data-testid="app-bar-close"], [aria-label*="Kapat"], [aria-label*="Close"], [data-testid="sheetDialog"] [role="button"]').forEach(b => b.click());

                // "Daha fazla göster" / "Gizli yanıtları aç" butonlarını bul ve tıkla
                const openers = Array.from(document.querySelectorAll('[role="button"]')).filter(b => {
                    const txt = b.innerText || "";
                    return /Daha fazla göster|Show more|Show probable spam|Olası spam|Yanıtları göster|Show|Show replies/i.test(txt) && b.offsetParent !== null;
                });
                for (const opener of openers) {
                    this.simulateInteraction(opener);
                    await this.delay(1000);
                }

                // Ana içerik alanını belirle
                const main = document.querySelector('main[role="main"]') || document.body;
                let discoverY = 999999;

                // Keşfet Bölümü Sınırı (Sadece gerçek başlık olabilecek elementlerde ara)
                const discoverElement = Array.from(main.querySelectorAll('h2, [role="heading"]')).find(el => {
                    const txt = el.innerText || "";
                    return txt.length > 5 && txt.length < 60 &&
                        /Daha fazlasını keşfet|Discover more|İlgili diğer tweetler|More tweets|Suggested for you/i.test(txt);
                });

                if (discoverElement && discoverElement.offsetParent !== null) {
                    discoverY = discoverElement.getBoundingClientRect().top + window.scrollY;
                    console.log("[X-Bot] Keşfet sınırı tespit edildi y:", discoverY);
                }

                const tweets = Array.from(main.querySelectorAll('article[data-testid="tweet"]'));
                if (tweets.length === 0) console.log("[X-Bot] Henüz tweet (article) bulunamadı.");

                for (const tweet of tweets) {
                    if (processed >= count || this.isStopped) break;

                    const tweetPos = tweet.getBoundingClientRect();
                    const tweetAbsoluteTop = tweetPos.top + window.scrollY;

                    if (tweetAbsoluteTop >= discoverY - 50) {
                        this.sendDashboardLog("🛑 Keşfet (Önerilenler) kısmına gelindi.", "warning");
                        processed = count;
                        break;
                    }

                    // ID kontrolü ile ana tweeti atla
                    const tLinks = Array.from(tweet.querySelectorAll('a[href*="/status/"]'));
                    let tId = null;
                    for (const l of tLinks) {
                        const m = l.href.match(/\/status\/(\d+)/);
                        if (m) { tId = m[1]; break; }
                    }

                    const isMainTweet = currentPathId && tId === currentPathId;
                    if (skipFirst && isMainTweet) {
                        console.log("[X-Bot] Ana tweet (sahip) işleniyor ID:", tId);
                    }

                    // Reklam atla
                    const isAd = tweet.innerText.includes("Sponsorlu") ||
                        tweet.innerText.includes("Promoted") ||
                        tweet.innerText.includes("Ad") ||
                        tweet.querySelector('div[data-testid="placementTracking"]');
                    if (isAd) continue;

                    // Kelime filtresi kontrolü (Target Whitelist)
                    if (settings.whitelistKeywords && settings.whitelistKeywords.length > 0) {
                        const tweetText = (tweet.innerText || "").toLowerCase();
                        const hasWhitelist = settings.whitelistKeywords.some(word => tweetText.includes(word));
                        if (!hasWhitelist) {
                            console.log(`[X-Bot] Hedef kelime bulunamadı, atlanıyor.`);
                            continue;
                        } else {
                            console.log(`[X-Bot] Hedef kelime EŞLEŞTİ! İşleme devam ediliyor.`);
                        }
                    }

                    // Kelime filtresi kontrolü (Blacklist)
                    if (settings.keywordFilterEnabled && settings.blacklistKeywords?.length > 0) {
                        const tweetText = (tweet.innerText || "").toLowerCase();
                        const foundKeyword = settings.blacklistKeywords.find(word => tweetText.includes(word.toLowerCase()));
                        if (foundKeyword) {
                            console.log(`[X-Bot] Kara liste kelime tespit edildi ("${foundKeyword}"), atlanıyor.`);
                            continue;
                        }
                    }

                    const author = this.getAuthorName(tweet);

                    // Etkileşim geçmişi kontrolü (Beğenilenleri Atla modu)
                    // Etkileşim geçmişi ve Kara Liste kontrolü
                    if ((settings.blacklistUsers && settings.blacklistUsers.includes(author.toLowerCase())) ||
                        (settings.skipLikedUsers && interactedUsers.includes(author.toLowerCase()))) {
                        console.log(`[X-Bot] @${author} atlanıyor (Kara Liste veya Geçmiş Etkileşim).`);
                        continue;
                    }

                    // Bizi Takip Edenleri Atla (Yeni Özellik - Önbellek + Hover Fallback)
                    if (settings.cycleSkipFollowers) {
                        let doesFollow = false;

                        // Önce Cache'e bak
                        const cacheRes = await this.safeStorageGet(['cachedFollowers']);
                        if (cacheRes.cachedFollowers && cacheRes.cachedFollowers.includes(author.toLowerCase())) {
                            doesFollow = true;
                            console.log(`[X-Bot] @${author} ÖNBELLEKTE bulundu (Takip Ediyor).`);
                        } else {
                            // Cache'de yoksa veya cache boşsa, yine de hover ile kontrol edelim mi? 
                            // Kullanıcı sadece hızlı mod seçtiyse belki hover istemiyordur ama 
                            // garantici olmak adına hover kontrolü yapılabilir.
                            // Ancak "Hızlı Mod" mantığına aykırı olmaması için sadece cache varsa cache kullanıp geçebiliriz.
                            // İsteğe bağlı olarak hover fallback açılabilir. Şimdilik sadece Cache+Hover Hibrit.

                            // Eğer cache hiç yoksa hover yapalım:
                            if (!cacheRes.cachedFollowers) {
                                doesFollow = await this.checkIfFollows(tweet);
                                if (doesFollow) await this.delay(500); // UI reset
                            }
                        }

                        if (doesFollow) {
                            this.sendDashboardLog(`⏩ @${author} bizi takip ediyor, atlandı.`, "info");
                            continue;
                        }
                    }

                    // Beğeni/RT Butonu tespiti
                    let btn = tweet.querySelector(`[data-testid="${type}"]`);
                    if (!btn) {
                        const label = type === 'like' ? 'Beğen' : 'Retweet';
                        const labelEn = type === 'like' ? 'Like' : 'Retweet';
                        btn = tweet.querySelector(`div[aria-label*="${label}"][role="button"]`) ||
                            tweet.querySelector(`div[aria-label*="${labelEn}"][role="button"]`) ||
                            tweet.querySelector(`[data-testid$="${type}"]`); // data-testid="123-like" gibi durumlar
                    }

                    // Engel/Kısıtlama Kontrolü (Buton pasifse)
                    if (btn && (btn.disabled || btn.getAttribute('aria-disabled') === 'true')) {
                        this.sendDashboardLog(`⛔ @${author} engel/kısıtlama nedeniyle atlandı.`, "warning");
                        continue;
                    }

                    // Zaten yapılmış mı kontrolü
                    const isDone = !!(
                        tweet.querySelector(`[data-testid="un${type}"]`) ||
                        tweet.querySelector(`div[aria-label*="Beğenildi"]`) ||
                        tweet.querySelector(`div[aria-label*="Liked"]`) ||
                        tweet.querySelector(`div[aria-label*="Geri al"]`) ||
                        tweet.querySelector(`div[aria-label*="Undo"]`)
                    );

                    if (btn && !isDone) {
                        // Anti-Shadowban Kontrolü
                        if (settings.antiShadowbanEnabled && this.sessionInteractions >= settings.actionsBeforeBreak) {
                            this.sendDashboardLog(`🛡️ Anti-Shadowban: ${settings.actionsBeforeBreak} işlem tamamlandı. ${settings.breakDuration} dakika dinlenme başlatıldı...`, "warning");
                            this.sessionInteractions = 0; // Sayacı sıfırla

                            // Dakika bazlı bekleme (Her dakika log basar)
                            for (let m = settings.breakDuration; m > 0; m--) {
                                if (this.isStopped) break;
                                this.sendDashboardLog(`⏳ Dinlenme modunda: Kalan ${m} dk...`, "info");
                                await new Promise(r => setTimeout(r, 60000));
                            }
                            this.sendDashboardLog("✅ Dinlenme tamamlandı, işlemlere devam ediliyor.", "success");
                        }

                        tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await this.delay(1200 + Math.random() * 500); // Kaydırma sonrası daha güvenli bekleme

                        try {
                            await this.simulateInteraction(btn);

                            // Beğeni kontrolü için bekle
                            await this.delay(1000);

                            const checkDone = () => !!(
                                tweet.querySelector(`[data-testid="un${type}"]`) ||
                                tweet.querySelector(`div[aria-label*="Beğenildi"]`) ||
                                tweet.querySelector(`div[aria-label*="Liked"]`) ||
                                tweet.querySelector(`div[aria-label*="Geri al"]`) ||
                                tweet.querySelector(`div[aria-label*="Undo"]`)
                            );

                            if (!checkDone()) {
                                // Başarısız olduysa kalbin içindeki SVG'ye doğrudan tıkla
                                const heartSvg = btn.querySelector('svg');
                                if (heartSvg) {
                                    console.log(`[X-Bot] Tıklama başarısız (Kalp dolmadı), SVG katmanına deneniyor...`);
                                    await this.simulateInteraction(heartSvg);
                                    await this.delay(500);
                                }
                            }

                            if (type === 'retweet') {
                                await this.delay(800);
                                const confirmRT = document.querySelector('[data-testid="retweetConfirm"]');
                                if (confirmRT) await this.simulateInteraction(confirmRT);
                            }

                            if (checkDone()) {
                                foundInThisScroll = true;
                                idleCycles = 0;
                                const author = this.getAuthorName(tweet);
                                this.incStat(type === 'like' ? 'likes' : 'rts');
                                this.sessionInteractions++; // Anti-shadowban sayacını artır

                                if (isMainTweet && skipFirst) {
                                    this.sendDashboardLog(`✅ Tweet sahibi beğenildi: @${author}`, "success");
                                } else {
                                    processed++;
                                    this.sendDashboardLog(`✅ @${author} (${processed}/${count})`, "success");

                                    // Etkileşim geçmişine ekle (Sadece mentlerdeki kişiler)
                                    // Etkileşim geçmişine ekle (Sadece 'Beğenilenleri Atla' açıksa ve henüz işlem yapılmadıysa)
                                    if (settings.skipLikedUsers && !interactedUsers.includes(author.toLowerCase())) {
                                        interactedUsers.push(author.toLowerCase());
                                        // Maksimum 500 kayıt tut (bellek şişmemesi için)
                                        if (interactedUsers.length > 500) interactedUsers.shift();
                                        await this.safeStorageSet({ interactedUsers });
                                        this.sendDashboardLog(`💾 @${author} geçmişe kaydedildi.`, "info");
                                    }
                                }
                            } else {
                                console.log("[X-Bot] Etkileşim tespiti hala olumsuz, bir sonraki denemeye geçiliyor.");
                            }

                            const actionDelay = (type === 'like' ? (settings.speedLike || 2) : (settings.speedRT || 3));
                            await this.delay(actionDelay * 1000);
                        } catch (e) {
                            if (e.message !== "STOPPED") console.error("Interaction Error:", e);
                        }
                    } else if (btn && isDone) {
                        // Zaten yapılmışsa bilgi ver
                        // const author = this.getAuthorName(tweet);
                        // console.log(`[X-Bot] @${author} zaten ${type === 'like' ? 'beğenilmiş' : 'RT yapılmış'}, atlanıyor.`);
                    }
                }

                if (!foundInThisScroll) {
                    idleCycles++;
                    this.sendDashboardLog(`🔍 Yanıtlar yükleniyor... (${idleCycles}/3)`, "info");
                    window.scrollBy({ top: 700, behavior: 'smooth' });
                    await this.delay(3000);
                }
            }
        } catch (e) {
            if (e.message !== "STOPPED") console.error("Interact Loop Error:", e);
        }

        // Geri Dön
        if (autoBack && !this.isStopped) {
            this.sendDashboardLog("⬅️ İşlem tamam, akışa dönülüyor...", "info");

            const resArr = await this.safeStorageGet(['xbot_bulk_state']);
            if (resArr.xbot_bulk_state) {
                resArr.xbot_bulk_state.processedCount++;
                await this.safeStorageSet({
                    xbot_bulk_state: resArr.xbot_bulk_state,
                    pendingTask: { action: 'bulk_return_and_continue' }
                });
            }

            // Geri gitme hamlesi
            window.history.back();

            // Akışa dönüş bekleme
            for (let i = 0; i < 15; i++) {
                await this.delay(1000);
                // Artık sadece /status/ içermemesi akışa döndüğümüzü (Home, Profile, Explore vb.) kanıtlar
                const isBackInFeed = !window.location.href.includes('/status/');

                if (isBackInFeed) {
                    this.sendDashboardLog("🚀 Akışa dönüldü, döngü devam ediyor...", "info");
                    const stateRes = await this.safeStorageGet(['xbot_bulk_state']);
                    if (stateRes.xbot_bulk_state && !this.isStopped) {
                        await this.delay(2500); // Akışın yüklenmesi için bekle
                        return this.recursiveExplore(stateRes.xbot_bulk_state.totalTweets, stateRes.xbot_bulk_state.mPerT, stateRes.xbot_bulk_state.type, stateRes.xbot_bulk_state.settings);
                    }
                    return;
                }

                if (i === 5) {
                    const uiBack = document.querySelector('[data-testid="app-bar-back"]');
                    if (uiBack) uiBack.click();
                }

                if (i === 12) {
                    this.sendDashboardLog("⚠️ Navigasyon gecikti, ana sayfaya zorlanıyor...", "warning");
                    window.location.href = "https://x.com/home";
                    return;
                }
            }
        } else {
            this.safeSendMessage({ status: "finished" });
        }
    },

    async followListLoop(count, actionType, settings) {
        let processed = 0;
        let attempts = 0;
        try {
            while (processed < count && attempts < 50 && !this.isStopped) {
                const users = Array.from(document.querySelectorAll('[data-testid="UserCell"]'));
                if (users.length === 0) {
                    window.scrollBy(0, 800);
                    await this.delay(3000, settings);
                    attempts++;
                    continue;
                }
                for (const user of users) {
                    if (this.isStopped || processed >= count) break;
                    const followBtn = user.querySelector('[data-testid$="-follow"]');
                    const unfollowBtn = user.querySelector('[data-testid$="-unfollow"]');

                    if (actionType === 'follow' && followBtn) {
                        followBtn.click();
                        processed++;
                        this.incStat('follows');
                        await this.delay((settings.speedFollow || 3) * 1000, settings);
                    } else if (actionType === 'unfollow' && unfollowBtn) {
                        if (this.isWhitelisted(user, settings.whiteList)) continue;
                        unfollowBtn.click();
                        await this.delay(1000, settings);
                        const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
                        if (confirm) confirm.click();
                        processed++;
                        this.incStat('unfollows');
                        await this.delay((settings.speedUnfollow || 2) * 1000, settings);
                    }
                }
                window.scrollBy(0, 1000);
                await this.delay((settings.speedScroll || 4) * 1000, settings);
            }
        } catch (e) { }
        this.safeSendMessage({ status: "finished" });
    },

    async targetFollowAction(username, listType, count, settings) {
        this.isStopped = false;
        const targetUrl = `https://x.com/${username}/${listType}`;
        if (!window.location.href.toLowerCase().includes(targetUrl.toLowerCase())) {
            chrome.storage.local.set({ pendingTask: { action: 'follow_list', count, settings } });
            window.location.href = targetUrl;
            return;
        }
        await this.delay(3000, settings);
        this.followListLoop(count, 'follow', settings);
    },

    async massUnfollowAction(count, settings) {
        this.isStopped = false;
        const myUsername = this.getMyUsername();
        if (!myUsername) return;
        const targetUrl = `/${myUsername}/following`.toLowerCase();
        if (!window.location.pathname.toLowerCase().includes(targetUrl)) {
            chrome.storage.local.set({ pendingTask: { action: 'unfollow_list', count, settings } });
            window.location.href = `https://x.com/${myUsername}/following`;
            return;
        }
        await this.delay(3000, settings);
        this.followListLoop(count, 'unfollow', settings);
    },

    async massUnfollowNonFollowersAction(count, settings) {
        this.isStopped = false;
        const myUsername = this.getMyUsername();
        if (!myUsername) return;
        if (!window.location.pathname.toLowerCase().includes('/following')) {
            chrome.storage.local.set({ pendingTask: { action: 'unfollow_nonfollowers', count, settings } });
            window.location.href = `https://x.com/${myUsername}/following`;
            return;
        }
        await this.delay(3000, settings);
        this.unfollowNonFollowersLoop(count, settings);
    },

    async massUnfollowUnverifiedAction(count, settings) {
        this.isStopped = false;
        const myUsername = this.getMyUsername();
        if (!myUsername) return;
        if (!window.location.pathname.toLowerCase().includes('/following')) {
            chrome.storage.local.set({ pendingTask: { action: 'unfollow_unverified', count, settings } });
            window.location.href = `https://x.com/${myUsername}/following`;
            return;
        }
        await this.delay(3000, settings);
        this.unfollowUnverifiedLoop(count, settings);
    },

    async unfollowNonFollowersLoop(count, settings) {
        let processed = 0;
        try {
            while (processed < count && !this.isStopped) {
                const users = Array.from(document.querySelectorAll('[data-testid="UserCell"]'));
                if (users.length === 0) break;
                for (const user of users) {
                    if (this.isStopped || processed >= count) break;
                    const rawText = user.innerText || "";
                    const followsMe = rawText.match(/Sizi takip ediyor|Follows you|Takip ediyor|follows/i);
                    const unfollowBtn = user.querySelector('[data-testid$="-unfollow"]');
                    if (!followsMe && unfollowBtn) {
                        if (this.isWhitelisted(user, settings.whiteList)) continue;
                        unfollowBtn.click();
                        await this.delay(1000, settings);
                        const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
                        if (confirm) confirm.click();
                        processed++;
                        this.incStat('unfollows');
                        await this.delay((settings.speedUnfollow || 2) * 1000, settings);
                    }
                }
                window.scrollBy(0, 1000);
                await this.delay((settings.speedScroll || 4) * 1000, settings);
            }
        } catch (e) { }
        this.safeSendMessage({ status: "finished" });
    },

    async unfollowUnverifiedLoop(count, settings) {
        let processed = 0;
        try {
            while (processed < count && !this.isStopped) {
                const users = Array.from(document.querySelectorAll('[data-testid="UserCell"]'));
                for (const user of users) {
                    if (this.isStopped || processed >= count) break;
                    const isVerified = user.querySelector('[data-testid="icon-verified"]');
                    const unfollowBtn = user.querySelector('[data-testid$="-unfollow"]');
                    if (!isVerified && unfollowBtn) {
                        if (this.isWhitelisted(user, settings.whiteList)) continue;
                        unfollowBtn.click();
                        await this.delay(1000, settings);
                        const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
                        if (confirm) confirm.click();
                        processed++;
                        this.incStat('unfollows');
                        await this.delay((settings.speedUnfollow || 2) * 1000, settings);
                    }
                }
                window.scrollBy(0, 1000);
                await this.delay((settings.speedScroll || 4) * 1000, settings);
            }
        } catch (e) { }
        this.safeSendMessage({ status: "finished" });
    },

    async massCleanupLikesAction(count, settings) {
        const myUsername = this.getMyUsername();
        if (!myUsername) return;
        if (!window.location.href.includes('/likes')) {
            chrome.storage.local.set({ pendingTask: { action: 'cleanup_likes_auto', count, settings } });
            window.location.href = `https://x.com/${myUsername}/likes`;
            return;
        }
        await this.delay(3000, settings);
        this.cleanupLikesLoop(count, settings);
    },

    async massCleanupTweetsAction(count, settings) {
        const myUsername = this.getMyUsername();
        if (!myUsername) return;
        if (window.location.pathname !== `/${myUsername}`) {
            chrome.storage.local.set({ pendingTask: { action: 'cleanup_tweets_auto', count, settings } });
            window.location.href = `https://x.com/${myUsername}`;
            return;
        }
        await this.delay(3000, settings);
        this.cleanupTweetsLoop(count, 'tweets', settings);
    },

    async massCleanupRepliesAction(count, settings) {
        const myUsername = this.getMyUsername();
        if (!myUsername) return;
        if (!window.location.href.includes('/with_replies')) {
            chrome.storage.local.set({ pendingTask: { action: 'cleanup_replies_auto', count, settings } });
            window.location.href = `https://x.com/${myUsername}/with_replies`;
            return;
        }
        await this.delay(3000, settings);
        this.cleanupTweetsLoop(count, 'replies', settings);
    },

    async massCleanupRetweetsAction(count, settings) {
        const myUsername = this.getMyUsername();
        if (!myUsername) return;
        if (window.location.pathname !== `/${myUsername}`) {
            chrome.storage.local.set({ pendingTask: { action: 'cleanup_retweets_auto', count, settings } });
            window.location.href = `https://x.com/${myUsername}`;
            return;
        }
        await this.delay(3000, settings);
        this.cleanupRetweetsLoop(count, settings);
    },

    async cleanupRetweetsLoop(count, settings) {
        this.sendDashboardLog("🔄 RT temizliği başlatılıyor...", "info");
        let processed = 0;
        try {
            while (processed < count && !this.isStopped) {
                const btns = Array.from(document.querySelectorAll('[data-testid="unretweet"]'));
                if (btns.length === 0) {
                    this.sendDashboardLog("🔍 RT aranıyor... (Scroll)", "info");
                    window.scrollBy(0, 800);
                    await this.delay(3000, settings);
                    if (!document.querySelector('[data-testid="unretweet"]')) break;
                    continue;
                }
                for (const btn of btns) {
                    if (this.isStopped || processed >= count) break;
                    btn.click();
                    await this.delay(1000, settings);
                    const confirm = document.querySelector('[data-testid="unretweetConfirm"]');
                    if (confirm) confirm.click();
                    processed++;
                    this.sendDashboardLog(`🗑️ RT Silindi (${processed}/${count})`, "success");
                    await this.delay((settings.speedCleanup || 2) * 1000, settings);
                }
            }
        } catch (e) { }
        this.safeSendMessage({ status: "finished" });
    },

    async cleanupLikesLoop(count, settings) {
        this.sendDashboardLog("💔 Beğeni temizliği başlatılıyor...", "info");
        let processed = 0;
        try {
            while (processed < count && !this.isStopped) {
                const btns = Array.from(document.querySelectorAll('[data-testid="unlike"]'));
                if (btns.length === 0) {
                    this.sendDashboardLog("🔍 Beğeni aranıyor... (Scroll)", "info");
                    window.scrollBy(0, 800);
                    await this.delay(3000, settings);
                    if (!document.querySelector('[data-testid="unlike"]')) break;
                    continue;
                }
                for (const btn of btns) {
                    if (this.isStopped || processed >= count) break;
                    btn.click();
                    processed++;
                    this.incStat('likes');
                    this.sendDashboardLog(`💔 Beğeni Geri Çekildi (${processed}/${count})`, "success");
                    await this.delay((settings.speedCleanup || 2) * 1000, settings);
                }
            }
        } catch (e) { }
        this.safeSendMessage({ status: "finished" });
    },

    async cleanupTweetsLoop(count, type, settings) {
        this.sendDashboardLog(`${type === 'replies' ? '💬 Yanıt' : '🗑️ Tweet'} temizliği başlatılıyor...`, "info");
        let processed = 0;
        try {
            while (processed < count && !this.isStopped) {
                const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
                if (tweets.length === 0) {
                    this.sendDashboardLog("🔍 İçerik aranıyor... (Scroll)", "info");
                    window.scrollBy(0, 800);
                    await this.delay(3000, settings);
                    continue;
                }
                for (const tweet of tweets) {
                    if (this.isStopped || processed >= count) break;
                    const author = this.getAuthorName(tweet);
                    if (author.toLowerCase() !== this.getMyUsername()?.toLowerCase()) continue;

                    const caret = tweet.querySelector('[data-testid="caret"]');
                    if (caret) {
                        caret.click();
                        await this.delay(1000, settings);
                        const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
                        const del = items.find(el => el.innerText.includes("Sil") || el.innerText.includes("Delete"));
                        if (del) {
                            del.click();
                            await this.delay(1000, settings);
                            const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
                            if (confirm) confirm.click();
                            processed++;
                            this.sendDashboardLog(`🗑️ Tweet/Yanıt Silindi (${processed}/${count})`, "success");
                            await this.delay((settings.speedCleanup || 2) * 1000, settings);
                        } else {
                            document.body.click();
                        }
                    }
                }
            }
        } catch (e) { }
        this.safeSendMessage({ status: "finished" });
    },

    async scrapeAndExportCSV(username, listType, count) {
        this.isStopped = false;
        const handles = new Set();
        try {
            while (handles.size < count && !this.isStopped) {
                const cells = document.querySelectorAll('[data-testid="UserCell"]');
                cells.forEach(c => {
                    const m = c.innerText.match(/@([a-zA-Z0-9_]{1,15})/);
                    if (m) handles.add(m[1]);
                });
                if (handles.size >= count) break;
                window.scrollBy(0, 1000);
                await this.delay(2000);
            }
            const csv = Array.from(handles).join("\n");
            const blob = new Blob([csv], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `list_${username}.csv`;
            a.click();
        } catch (e) { }
        this.safeSendMessage({ status: "finished" });
    },

    async followUsernameList(usernames, settings) {
        this.isStopped = false;
        if (!usernames.length) return this.safeSendMessage({ status: "finished" });
        const user = usernames[0].replace('@', '');
        if (!window.location.pathname.includes(user)) {
            chrome.storage.local.set({ pendingBatch: { usernames, settings, target: user } });
            window.location.href = `https://x.com/${user}`;
            return;
        }
        await this.delay(3000, settings);
        const btn = document.querySelector('[data-testid$="-follow"]');
        if (btn) {
            btn.click();
            this.incStat('follows');
        }
        await this.delay((settings.delay || 3) * 1000, settings);
        this.followUsernameList(usernames.slice(1), settings);
    },

    async directAction(type, target, settings, text = "") {
        this.isStopped = false;
        if (target.startsWith('http') && !window.location.href.includes(target.split('?')[0])) {
            chrome.storage.local.set({ pendingAction: { action: 'direct_' + type, target, settings, text, timestamp: Date.now() } });
            window.location.href = target;
            return;
        }
        await this.delay(4000, settings);
        try {
            if (type === 'follow') {
                const btn = document.querySelector('[data-testid$="-follow"]');
                if (btn) { btn.click(); this.incStat('follows'); }
            } else if (type === 'reply') {
                const btn = document.querySelector('[data-testid="reply"]');
                if (btn) {
                    btn.click();
                    await this.delay(2000, settings);
                    const input = document.querySelector('div[role="textbox"]');
                    if (input) {
                        await this.typeText(input, text);
                        document.querySelector('[data-testid="tweetButton"]')?.click();
                        this.incStat('ments');
                    }
                }
            } else {
                const btn = document.querySelector(`[data-testid="${type}"]`);
                if (btn) {
                    btn.click();
                    if (type === 'retweet') {
                        await this.delay(1000, settings);
                        document.querySelector('[data-testid="retweetConfirm"]')?.click();
                        this.incStat('rts');
                    } else {
                        this.incStat('likes');
                    }
                }
            }
        } catch (e) { }
        this.safeSendMessage({ status: "finished" });
    },
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const bot = window.TwitterBot;

    if (request.action === "stop_all") {
        bot.isStopped = true;
        chrome.storage.local.remove(['pendingTask', 'xbot_bulk_state', 'pendingBatch', 'pendingAction']);
        bot.sendDashboardLog("🛑 Tüm işlemler durduruldu.", "error");
        sendResponse({ status: "finished" });
        return;
    }

    // Yeni bir komut geldiğinde isStopped bayrağını sıfırla
    bot.isStopped = false;

    const handle = (promise) => promise?.catch(e => { if (e.message !== "STOPPED") console.error("Process Error:", e); });

    console.log("[X-Bot] Mesaj alındı:", request.action);
    if (request.action === "explore_like") handle(bot.interact(request.count, 'like', request.settings));
    else if (request.action === "explore_like_replies") handle(bot.interact(request.count, 'like', { ...request.settings, onlyReplies: true }));
    else if (request.action === "explore_retweet") handle(bot.interact(request.count, 'retweet', request.settings));
    else if (request.action === "recursive_reply") {
        bot.safeStorageSet({ xbot_bulk_state: null, pendingTask: null }).then(() => {
            handle(bot.recursiveExplore(request.totalTweets, request.mentsPerTweet, request.type, request.settings));
        });
    }
    else if (request.action === "follow_list") handle(bot.followListLoop(request.count, 'follow', request.settings));
    else if (request.action === "unfollow_list") handle(bot.massUnfollowAction(request.count, request.settings));
    else if (request.action === "unfollow_nonfollowers") handle(bot.massUnfollowNonFollowersAction(request.count, request.settings));
    else if (request.action === "unfollow_unverified") handle(bot.massUnfollowUnverifiedAction(request.count, request.settings));
    else if (request.action === "target_follow") handle(bot.targetFollowAction(request.username, request.type, request.count, request.settings));
    else if (request.action === "scrape_csv") handle(bot.scrapeAndExportCSV(request.username, request.listType, request.count));
    else if (request.action === "follow_username_list") handle(bot.followUsernameList(request.usernames, request.settings));
    else if (request.action === "direct_like") handle(bot.directAction('like', request.target, request.settings));
    else if (request.action === "direct_retweet") handle(bot.directAction('retweet', request.target, request.settings));
    else if (request.action === "direct_follow") handle(bot.directAction('follow', request.target, request.settings));
    else if (request.action === "direct_reply") handle(bot.directAction('reply', request.target, request.settings, request.text));
    else if (request.action === "cleanup_likes") handle(bot.massCleanupLikesAction(request.count, request.settings));
    else if (request.action === "cleanup_tweets") handle(bot.massCleanupTweetsAction(request.count, request.settings));
    else if (request.action === "cleanup_replies") handle(bot.massCleanupRepliesAction(request.count, request.settings));
    else if (request.action === "cleanup_retweets") handle(bot.massCleanupRetweetsAction(request.count, request.settings));
    else if (request.action === "scrape_followers_cache") handle(bot.scrapeFollowersCacheAction());
    else if (request.action === "scrape_followers_api") handle(bot.fetchFollowersAPI()); // API Mode Listener
    sendResponse({ status: "received" });
});
window.TwitterBot.init = async function () {
    this.initSystem();

    // --- Toplu Döngü Resumer ---
    const res = await this.safeStorageGet(['xbot_bulk_state', 'pendingTask']);
    const state = res.xbot_bulk_state;
    const task = res.pendingTask;

    if (state && task) {
        if (task.action === 'bulk_interact_step') {
            let isStatus = false;
            for (let i = 0; i < 3; i++) {
                if (window.location.href.includes('/status/')) { isStatus = true; break; }
                await this.delay(1000);
            }
            if (isStatus) await this.interact(state.mPerT, state.type, true, true, state.settings);
            else this.recursiveExplore(state.totalTweets, state.mPerT, state.type, state.settings);
            return;
        }
        if (task.action === 'bulk_return_and_continue') {
            let isFeed = false;
            for (let i = 0; i < 3; i++) {
                if (!window.location.href.includes('/status/')) { isFeed = true; break; }
                await this.delay(1000);
            }
            if (isFeed) this.recursiveExplore(state.totalTweets, state.mPerT, state.type, state.settings);
            else {
                window.history.back();
            }
            return;
        }
    }

    // --- Diğer Tekil Görevler ---
    if (task) {
        chrome.storage.local.remove(['pendingTask']);
        if (task.action === "follow_list") this.followListLoop(task.count, 'follow', task.settings);
        else if (task.action === "unfollow_list") this.followListLoop(task.count, 'unfollow', task.settings);
        else if (task.action === "unfollow_nonfollowers") this.unfollowNonFollowersLoop(task.count, task.settings);
        else if (task.action === "unfollow_unverified") this.unfollowUnverifiedLoop(task.count, task.settings);
        else if (task.action === "cleanup_tweets_auto") this.cleanupTweetsLoop(task.count, 'tweets', task.settings);
        else if (task.action === "cleanup_replies_auto") this.cleanupTweetsLoop(task.count, 'replies', task.settings);
        else if (task.action === "cleanup_retweets_auto") this.cleanupRetweetsLoop(task.count, task.settings);
        else if (task.action === "cleanup_likes_auto") this.cleanupLikesLoop(task.count, task.settings);
        else if (task.action === "scrape_followers_cache_auto") this.scrapeFollowersCacheAction();
    }

    const batchData = await chrome.storage.local.get(['pendingBatch']);
    if (batchData.pendingBatch) {
        const b = batchData.pendingBatch;
        if (window.location.href.includes(b.target)) {
            chrome.storage.local.remove(['pendingBatch']);
            this.followUsernameList([b.target, ...b.usernames], b.settings);
        }
    }

    const actionData = await chrome.storage.local.get(['pendingAction']);
    if (actionData.pendingAction) {
        const pa = actionData.pendingAction;
        if (pa.target && window.location.href.includes(pa.target.split('?')[0])) {
            chrome.storage.local.remove(['pendingAction']);
            await this.delay(6000);
            if (pa.action === 'direct_like') this.directAction('like', pa.target, pa.settings);
            else if (pa.action === 'direct_retweet') this.directAction('retweet', pa.target, pa.settings);
            else if (pa.action === 'direct_follow') this.directAction('follow', pa.target, pa.settings);
            else if (pa.action === 'direct_reply') this.directAction('reply', pa.target, pa.settings, pa.text);
        }
    }
};

window.TwitterBot.init().catch(e => {
    if (e.message !== "STOPPED") console.error("[X-Bot] Init Error:", e);
});
