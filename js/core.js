/* =========================================================
   CORE & GENERAL UTILITIES (Strict Daerah Match, Dark Mode)
========================================================= */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz1ecMJ8KBdbsNhuJCm_eYrRH2ATxZH7sn73GV-B19JoxKLNMrS8BCS8fZNnHBcqjM/exec";
const MASTER_DATA_URL = "https://script.google.com/macros/s/AKfycbzV_l5rAXgnapi2c3ZH90WOusrHgN-Ny9wjaFJ9tczCl1mkz1pURw_sZUYhEF4YY6byRg/exec";
const AUTO_SYNC_INTERVAL = 60 * 60 * 1000;

let activeMenu = 'dashboard';
let rawKoreksiData = [];
let rawUserData = [];
let rawMasterSantri = [];
let activeBroadcastData = null;
let appConfigFilter = 'all';

let isSyncing = false;
let isFetching = false;
let isFetchingMasterData = false;
let masterDataLoaded = false;
let autoSyncTimer = null;
let charts = {};

function triggerHaptic(ms = 18) {
    if (navigator.vibrate) {
        try { navigator.vibrate(ms); } catch(e){}
    }
}

function initTheme() {
    let savedTheme = localStorage.getItem('taklimda_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleDarkMode() {
    triggerHaptic(20);
    let currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    let newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('taklimda_theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(newTheme === 'dark' ? '🌙 Modus Gelap Aktif' : '☀️ Modus Terang Aktif');
}

function updateThemeIcon(theme) {
    let iconEl = document.getElementById('theme-toggle-icon');
    if (iconEl) iconEl.innerText = theme === 'dark' ? '☀️' : '🌙';
}

function updateCircularGauge(percent) {
    let fillEl = document.getElementById('gauge-fill');
    if (!fillEl) return;
    let cleanPct = Math.max(0, Math.min(100, percent));
    fillEl.setAttribute('stroke-dasharray', `${cleanPct}, 100`);
}

function highlightTextHTML(text, query) {
    if (!query) return text;
    let re = new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
    return String(text).replace(re, '<mark class="highlight-text">$1</mark>');
}

const LOCAL_CACHE = {
    save: (key, data) => {
        try { 
            if (key === 'taklimda_cache_master' || key === 'taklimda_cache_rekap') return; 
            localStorage.setItem(key, JSON.stringify(data)); 
        } catch(e) { console.warn("Cache Warning:", e); }
    },
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch(e) { return null; }
    }
};

/* STRICT DAERAH CODE EXTRACTION LOGIC */
window.extractDaerahCode = function(domRaw) {
    if (!domRaw) return 'LAIN';
    let str = String(domRaw).toUpperCase().trim();

    if (str.includes('RUMAH') || str.includes('ORTU') || str.includes('LAIN') || str.includes('LUAR')) {
        return 'LAIN';
    }

    let match = str.match(/^(?:KAMAR|DAERAH)?\s*([A-Z])(?=[-\s\.\d]|$)/);
    if (match && match[1]) {
        return match[1];
    }

    if (str.length === 1 && /[A-Z]/.test(str)) {
        return str;
    }

    return 'LAIN';
};

window.getValPeka = function(obj, targetKeys) {
    if (!obj || typeof obj !== 'object') return '';
    for (let target of targetKeys) {
        if (obj[target] !== undefined && obj[target] !== null && String(obj[target]).trim() !== '') {
            return String(obj[target]).trim();
        }
    }
    const normalizedMap = {};
    for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            let cleanKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
            normalizedMap[cleanKey] = obj[key];
        }
    }
    for (let target of targetKeys) {
        let cleanTarget = String(target).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedMap[cleanTarget] !== undefined && normalizedMap[cleanTarget] !== null) {
            return String(normalizedMap[cleanTarget]).trim();
        }
    }
    return '';
};

function parseDates(val) {
    if (!val && val !== 0) return [];
    let str = Array.isArray(val) ? val.join(',') : String(val);
    let parts = str.split(/[\s,;/\\-]+/).filter(Boolean);
    let result = [];

    parts.forEach(part => {
        let digits = String(part).replace(/\D/g, '');
        if (!digits) return;

        if (digits.length > 2) {
            for (let i = 0; i < digits.length; i += 2) {
                let chunk = parseInt(digits.substring(i, i + 2), 10);
                if (chunk >= 1 && chunk <= 31) result.push(chunk);
            }
        } else {
            let num = parseInt(digits, 10);
            if (num >= 1 && num <= 31) result.push(num);
        }
    });

    return Array.from(new Set(result));
}

document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    setupNetworkListeners();
    setupRippleEffect();
    setupPullToRefresh();
    setupTouchDragAndDrop();
    loadFromLocalCache();
    loadAllRealtimeData(true);
    startAutoSync();
});

function setupRippleEffect() {
    document.addEventListener('click', (e) => {
        let target = e.target.closest('.ripple-target, .btn-act, .item-card, .tab-btn');
        if (!target) return;
        
        triggerHaptic(12);

        let rect = target.getBoundingClientRect();
        let ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        let size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        
        target.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    });
}

function setupPullToRefresh() {
    let startY = 0;
    let holdTimer = null;
    let timerCountdown = null;
    let isHoldComplete = false;
    
    const holdTimeNeeded = 3.0; // Durasi wajib tahan diubah menjadi 3 detik
    const threshold = 200;       // Jarak tarik minimal (200px)
    let currentCount = holdTimeNeeded;

    const indicator = document.getElementById('pull-refresh-indicator');
    const pullText = document.getElementById('pull-text');

    if (!indicator) return;

    window.addEventListener('touchstart', (e) => {
        if (window.scrollY <= 0) {
            startY = e.touches[0].clientY;
            resetHoldState();
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (window.scrollY > 0) {
            cancelPull();
            return;
        }

        let currentY = e.touches[0].clientY;
        let distance = currentY - startY;

        if (distance >= threshold) {
            indicator.classList.add('visible');

            if (!holdTimer && !isHoldComplete) {
                currentCount = holdTimeNeeded;
                if (pullText) pullText.innerText = `Tahan ${currentCount.toFixed(1)}s...`;
                
                triggerHaptic(15);

                timerCountdown = setInterval(() => {
                    currentCount -= 0.1;
                    if (currentCount <= 0) {
                        currentCount = 0;
                        clearInterval(timerCountdown);
                    }
                    if (pullText && !isHoldComplete) {
                        pullText.innerText = currentCount > 0 
                            ? `Tahan ${currentCount.toFixed(1)}s...` 
                            : "✅ Lepaskan untuk Refresh";
                    }
                }, 100);

                holdTimer = setTimeout(() => {
                    isHoldComplete = true;
                    triggerHaptic(35);
                    if (pullText) pullText.innerText = "✅ Lepaskan untuk Refresh";
                }, holdTimeNeeded * 1000);
            }
        } else {
            cancelPull();
        }
    }, { passive: true });

    window.addEventListener('touchend', async () => {
        if (isHoldComplete) {
            triggerHaptic(20);
            if (pullText) pullText.innerText = "🔄 Mengambil Data...";
            await manualSync();
            
            setTimeout(() => {
                cancelPull();
            }, 500);
        } else {
            cancelPull();
        }
    });

    window.addEventListener('touchcancel', () => {
        cancelPull();
    });

    function resetHoldState() {
        if (holdTimer) clearTimeout(holdTimer);
        if (timerCountdown) clearInterval(timerCountdown);
        holdTimer = null;
        timerCountdown = null;
        isHoldComplete = false;
    }

    function cancelPull() {
        resetHoldState();
        if (indicator) indicator.classList.remove('visible');
        if (pullText) pullText.innerText = "Tarik & Tahan";
    }
}

function copyWaRekapFormat() {
    triggerHaptic(20);
    let totalPekanIni = rawKoreksiData.filter(x => x._source === 'koreksi').length;
    let selesaiPekanIni = rawKoreksiData.filter(x => x._source === 'koreksi' && x._isDone).length;
    let pct = totalPekanIni > 0 ? Math.round((selesaiPekanIni / totalPekanIni) * 100) : 0;

    let totalSakit = rawKoreksiData.filter(x => x._source === 'koreksi' && x._tglSakitArr.length > 0).length;
    let totalIzin = rawKoreksiData.filter(x => x._source === 'koreksi' && x._tglIzinArr.length > 0).length;
    let totalAlpha = rawKoreksiData.filter(x => x._source === 'koreksi' && x._tglAlphaArr.length > 0).length;

    let text = `📋 *REKAP PROGRESS TAKLIMDA PUSAT*
📅 *Pekan Absensi Berjalan*

👥 *Total Santri Dikoreksi:* ${selesaiPekanIni} / ${totalPekanIni} (${pct}%)
🔵 Sakit: ${totalSakit} | 🟠 Izin: ${totalIzin} | 🔴 Alpha: ${totalAlpha}

⚡ _Dikirim via App Dashboard Admin TTQ Pusat_`;

    navigator.clipboard.writeText(text).then(() => {
        showToast("💬 Format Rekap WA Berhasil Disalin!");
    }).catch(() => {
        showToast("Gagal menyalin format!");
    });
}

function setupNetworkListeners() {
    window.addEventListener('online', () => { updateNetworkBadge(true); processPendingQueue(); });
    window.addEventListener('offline', () => { updateNetworkBadge(false); });
    updateNetworkBadge(navigator.onLine);
}

function updateNetworkBadge(isOnline) {
    const badge = document.getElementById('net-status-badge');
    if (!badge) return;
    badge.className = isOnline ? "sync-badge online" : "sync-badge offline";
    badge.innerHTML = isOnline ? `<div class="live-dot"></div> Online` : `● Offline`;
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

function switchNav(menu) {
    triggerHaptic(15);
    activeMenu = menu;
    document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    document.getElementById(`view-${menu}`).classList.add('active');
    document.getElementById(`nav-btn-${menu}`).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (menu === 'editor') {
        renderEditorView();
    } else if (menu === 'progress') {
        renderMonitoringTable();
    } else if (menu === 'dashboard') {
        if (!masterDataLoaded && !isFetchingMasterData) {
            fetchMasterSantriData();
        }
        setTimeout(() => {
            Object.keys(charts).forEach(key => { if(charts[key]) charts[key].resize(); });
        }, 150);
    }
}

function getPendingQueue() {
    try { return JSON.parse(localStorage.getItem('taklimda_pending_queue') || '[]'); } catch(e) { return []; }
}

function savePendingQueue(queue) {
    localStorage.setItem('taklimda_pending_queue', JSON.stringify(queue));
    updatePendingUI();
}

function queueForSync(dataPayload) {
    let queue = getPendingQueue();
    queue = queue.filter(q => !(q._rowIndex === dataPayload._rowIndex && q._source === dataPayload._source));
    queue.push(dataPayload);
    savePendingQueue(queue);
}

function updatePendingUI() {
    let queue = getPendingQueue();
    let bar = document.getElementById('pending-info-bar');
    let num = document.getElementById('pending-count-num');
    if (bar && num) {
        num.innerText = queue.length;
        bar.style.display = queue.length > 0 ? 'block' : 'none';
    }
}

async function processPendingQueue() {
    if (isSyncing || !navigator.onLine) return;
    let queue = getPendingQueue();
    if (queue.length === 0) return;

    isSyncing = true;
    let remaining = [...queue];

    for (let item of queue) {
        try {
            let res = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'updateKoreksi', data: item })
            });
            let jsonRes = await res.json();
            if (res.ok && jsonRes.status === 'success') {
                remaining = remaining.filter(q => !(q._rowIndex === item._rowIndex && q._source === item._source));
            }
        } catch(e) { break; }
    }

    savePendingQueue(remaining);
    isSyncing = false;
    if (remaining.length < queue.length) renderEditorView();
}

function startAutoSync() {
    if (autoSyncTimer) clearInterval(autoSyncTimer);
    autoSyncTimer = setInterval(async () => {
        const toggle = document.getElementById('toggle-autosync');
        if (toggle && toggle.checked && navigator.onLine && !isFetching) {
            await loadAllRealtimeData(true);
        }
    }, AUTO_SYNC_INTERVAL);
}

function toggleAutoSync(enabled) {
    showToast(enabled ? "Auto-Refresh Aktif (Setiap 1 Jam)" : "Auto-Refresh Nonaktif");
}

async function manualSync() {
    showToast("Memulai sinkronisasi...");
    await processPendingQueue();
    await loadAllRealtimeData(false);
}

function transformRekapList(listRekap) {
    let pendingQueue = getPendingQueue();

    return listRekap.map((r, idx) => {
        let sourceTag = r._source || 'koreksi';
        let actualRowIndex = (r._rowIndex !== undefined && r._rowIndex !== null) ? r._rowIndex : (idx + 2);
        let pendingItem = pendingQueue.find(p => p._rowIndex === actualRowIndex && p._source === sourceTag);

        let sVal = pendingItem ? pendingItem.tglSakit : window.getValPeka(r, ['tanggal_sakit', 'tanggalsakit', 'tgl_sakit', 'tglsakit', 'sakit']);
        let iVal = pendingItem ? pendingItem.tglIzin  : window.getValPeka(r, ['tanggal_izin', 'tanggalizin', 'tgl_izin', 'tglizin', 'izin']);
        let aVal = pendingItem ? pendingItem.tglAlpha : window.getValPeka(r, ['tanggal_alpa', 'tanggalalpa', 'tgl_alpha', 'tglalpha', 'alpha', 'alpa']);

        let totSakit = parseInt(window.getValPeka(r, ['total_sakit', 'totalsakit', 'sakit']), 10) || 0;
        let totIzin  = parseInt(window.getValPeka(r, ['total_izin', 'totalizin', 'izin']), 10) || 0;
        let totAlpha = parseInt(window.getValPeka(r, ['total_alpa', 'totalalpa', 'alpa', 'alpha']), 10) || 0;
        
        let statusK = pendingItem ? pendingItem.status : window.getValPeka(r, ['status_koreksi', 'status', 'koreksi']);
        let timestampK = pendingItem ? pendingItem.timestamp : window.getValPeka(r, ['timestamp', 'updated_at', 'waktu', 'tanggal', 'waktuedit']);
        let ket = pendingItem ? pendingItem.keterangan : (window.getValPeka(r, ['keterangan_taklimda', 'keterangan', 'ket']) || '-');

        let statusClean = statusK ? String(statusK).trim() : '';
        let timestampClean = timestampK ? String(timestampK).trim() : '';

        let isDone = false;
        if (pendingItem) {
            isDone = true;
        } else if (timestampClean !== '') {
            isDone = true;
        } else if (statusClean !== '' && !statusClean.toLowerCase().includes('belum')) {
            isDone = true;
        }

        let domRaw = String(window.getValPeka(r, ['domisili', 'daerah', 'kamar', 'wilayah'])).toUpperCase().trim();
        let extractedDaerah = window.extractDaerahCode(domRaw);

        return {
            ...r,
            _rowIndex: actualRowIndex,
            idpps: window.getValPeka(r, ['id_pps', 'idpps', 'id', 'nis']),
            namasantri: window.getValPeka(r, ['nama_santri', 'nama', 'namasantri']) || '-',
            domisili: domRaw,
            _daerah: extractedDaerah,
            marhalah: window.getValPeka(r, ['marhalah/jilid', 'marhalah', 'jilid']) || '',
            tingkat: window.getValPeka(r, ['tingkat', 'tingkatpendidikan']) || 'Lainnya',
            kelas: window.getValPeka(r, ['kelas']) || 'Lainnya',
            kategori: window.getValPeka(r, ['kategori', 'kategoribaru', 'program']) || '',
            majliskitab: window.getValPeka(r, ['majliskitab', 'jalsah']) || '',
            bulanhijriah: window.getValPeka(r, ['bulanhijriah', 'bulan']),
            tahunhijriah: window.getValPeka(r, ['tahunhijriah', 'tahun']),
            _foto: window.getValPeka(r, ['foto', 'fotourl']),
            _tglSakitArr: parseDates(sVal),
            _tglIzinArr: parseDates(iVal),
            _tglAlphaArr: parseDates(aVal),
            _totSakitNum: totSakit,
            _totIzinNum: totIzin,
            _totAlphaNum: totAlpha,
            _keterangan: ket,
            _statusKoreksi: statusClean || 'Belum Dikoreksi',
            _timestamp: timestampClean,
            _isDone: isDone,
            _unsynced: !!pendingItem,
            _source: sourceTag
        };
    });
}

function loadFromLocalCache() {
    let cachedRekap = LOCAL_CACHE.get('taklimda_cache_rekap');
    let cachedUsers = LOCAL_CACHE.get('taklimda_cache_users');
    let cachedConfig = LOCAL_CACHE.get('taklimda_cache_config');
    let cachedBc = LOCAL_CACHE.get('taklimda_cache_broadcast');

    if (cachedConfig) {
        appConfigFilter = String(cachedConfig).toLowerCase();
        updateConfigUI(appConfigFilter);
    }
    if (cachedUsers) rawUserData = cachedUsers;
    if (cachedBc) {
        activeBroadcastData = cachedBc;
        renderBroadcastCardUI(activeBroadcastData);
    }

    if (cachedRekap && Array.isArray(cachedRekap) && cachedRekap.length > 0) {
        rawKoreksiData = transformRekapList(cachedRekap);
        renderAllViewsUI();
    }
}

function renderAllViewsUI() {
    populateGlobalDaerahDropdown();
    populateGlobalBulanDropdown();
    populateGlobalTahunDropdown();
    processAndRenderStats();
    renderUsersTable();
    if (activeMenu === 'editor') renderEditorView();
    if (activeMenu === 'progress') renderMonitoringTable();
}

async function fetchMasterSantriData() {
    if (isFetchingMasterData || masterDataLoaded) return;
    isFetchingMasterData = true;

    try {
        let res = await fetch(MASTER_DATA_URL);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        let json = await res.json();
        
        if (json && json.dataUtama && Array.isArray(json.dataUtama)) {
            let headers = (json.headersUtama || []).map(h => String(h).toUpperCase().trim());
            
            let idxIdPps = headers.indexOf("ID PPS");
            if (idxIdPps === -1) idxIdPps = 0;
            let idxNama = headers.indexOf("NAMA");
            if (idxNama === -1) idxNama = 1;
            let idxDomisili = headers.indexOf("DOMISILI");
            if (idxDomisili === -1) idxDomisili = 6;
            let idxKelas = headers.indexOf("KELAS");
            let idxTingkat = headers.indexOf("TINGKAT");

            let mutaalimMap = json.mutaallimMap || {};
            let len = json.dataUtama.length;
            let parsedMaster = new Array(len);

            for (let i = 0; i < len; i++) {
                let row = json.dataUtama[i];
                let idPps = String(row[idxIdPps] || '').trim();
                let mutDetail = mutaalimMap[idPps] || null;

                parsedMaster[i] = {
                    idpps: idPps,
                    namasantri: String(row[idxNama] || '').trim(),
                    domisili: String(row[idxDomisili] || '').trim(),
                    kelas: idxKelas !== -1 ? String(row[idxKelas] || '').trim() : '',
                    tingkat: idxTingkat !== -1 ? String(row[idxTingkat] || '').trim() : '',
                    kategori: mutDetail ? (mutDetail["KATEGORI BARU"] || mutDetail["KATEGORI"] || mutDetail["KATAGORI BARU"] || mutDetail["KATAGORI"] || '') : '',
                    marhalah: mutDetail ? (mutDetail["JILID/MARHALAH BARU"] || mutDetail["JILID/MARHALAH"] || mutDetail["MARHALAH"] || mutDetail["JILID"] || 'Lainnya') : 'Lainnya',
                    majliskitab: mutDetail ? (mutDetail["JALSAH BARU"] || mutDetail["JALSAH"] || 'Lainnya') : 'Lainnya'
                };
            }

            rawMasterSantri = parsedMaster;
            masterDataLoaded = true;
        }
    } catch(e) {
        console.warn("Gagal load master data:", e);
    } finally {
        isFetchingMasterData = false;
        if (activeMenu === 'dashboard') {
            processAndRenderStats();
        }
    }
}

async function loadAllRealtimeData(isSilent = false) {
    if (isFetching) return;
    isFetching = true;
    if (!isSilent) showToast("Memuat Data Realtime...");

    try {
        let res = await fetch(APPS_SCRIPT_URL + "?action=getAllInitData");
        let initRes = await res.json();

        if (initRes && initRes.status === 'success') {
            if (initRes.config && initRes.config.filterAbsen) {
                appConfigFilter = String(initRes.config.filterAbsen).toLowerCase();
                LOCAL_CACHE.save('taklimda_cache_config', appConfigFilter);
                updateConfigUI(appConfigFilter);
            }
            rawUserData = initRes.users || [];
            LOCAL_CACHE.save('taklimda_cache_users', rawUserData);

            activeBroadcastData = initRes.broadcast || null;
            LOCAL_CACHE.save('taklimda_cache_broadcast', activeBroadcastData);
            renderBroadcastCardUI(activeBroadcastData);

            let rawRekap = Array.isArray(initRes.rekap) ? initRes.rekap : [];
            LOCAL_CACHE.save('taklimda_cache_rekap', rawRekap);
            rawKoreksiData = transformRekapList(rawRekap);

            renderAllViewsUI();
        }
        if (!isSilent) showToast("Data Terkini Siap!");

        if (activeMenu === 'dashboard' && !masterDataLoaded) {
            fetchMasterSantriData();
        }

    } catch(e) {
        console.error(e);
        if (!isSilent) showToast("Gagal terhubung server! Menampilkan cache.");
    } finally {
        isFetching = false;
    }
}
