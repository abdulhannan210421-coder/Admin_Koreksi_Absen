/* =========================================================
   CORE & GENERAL UTILITIES (Single-Flight Fetch & Memory Optimization)
========================================================= */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz1ecMJ8KBdbsNhuJCm_eYrRH2ATxZH7sn73GV-B19JoxKLNMrS8BCS8fZNnHBcqjM/exec";
const MASTER_DATA_URL = "https://script.google.com/macros/s/AKfycbzV_l5rAXgnapi2c3ZH90WOusrHgN-Ny9wjaFJ9tczCl1mkz1pURw_sZUYhEF4YY6byRg/exec";
const AUTO_SYNC_INTERVAL = 60 * 60 * 1000; // 1 Jam

let activeMenu = 'dashboard';
let rawKoreksiData = [];
let rawUserData = [];
let rawMasterSantri = []; // Diisi murni di RAM browser
let activeBroadcastData = null;
let appConfigFilter = 'all';

let isSyncing = false;
let isFetching = false;
let isFetchingMasterData = false;
let masterDataLoaded = false;
let autoSyncTimer = null;
let charts = {};

// Cache helper KHUSUS data ringan (Config, Users, Broadcast)
const LOCAL_CACHE = {
    save: (key, data) => {
        try { 
            // Jangan simpan master & rekap data ke LocalStorage (cegah kuota 5MB jebol)
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

window.extractDaerahCode = function(domRaw) {
    if (!domRaw) return 'LAIN';
    let str = String(domRaw).toUpperCase().trim();
    let match = str.match(/^[A-Z](?=[-\s0-9]|$)/) || str.match(/\b[A-Z]\b/) || str.match(/([A-Z])/);
    return match ? match[0] : 'LAIN';
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
    setupNetworkListeners();
    loadFromLocalCache();
    loadAllRealtimeData(true);
    startAutoSync();
});

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
    queue = queue.filter(q => q._rowIndex !== dataPayload._rowIndex);
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
                remaining = remaining.filter(q => q._rowIndex !== item._rowIndex);
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
        let actualRowIndex = (r._rowIndex !== undefined && r._rowIndex !== null) ? r._rowIndex : (idx + 2);
        let pendingItem = pendingQueue.find(p => p._rowIndex === actualRowIndex);

        let sVal = pendingItem ? pendingItem.tglSakit : window.getValPeka(r, ['tanggal_sakit', 'tanggalsakit', 'tgl_sakit', 'tglsakit', 'sakit']);
        let iVal = pendingItem ? pendingItem.tglIzin  : window.getValPeka(r, ['tanggal_izin', 'tanggalizin', 'tgl_izin', 'tglizin', 'izin']);
        let aVal = pendingItem ? pendingItem.tglAlpha : window.getValPeka(r, ['tanggal_alpa', 'tanggalalpa', 'tgl_alpha', 'tglalpha', 'alpha', 'alpa']);

        let totSakit = parseInt(window.getValPeka(r, ['total_sakit', 'totalsakit', 'sakit']), 10) || 0;
        let totIzin  = parseInt(window.getValPeka(r, ['total_izin', 'totalizin', 'izin']), 10) || 0;
        let totAlpha = parseInt(window.getValPeka(r, ['total_alpa', 'totalalpa', 'alpa', 'alpha']), 10) || 0;
        
        let statusK = pendingItem ? pendingItem.status : window.getValPeka(r, ['status_koreksi', 'status', 'koreksi']);
        let timestampK = window.getValPeka(r, ['timestamp', 'updated_at', 'waktu']);
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
            _source: r._source || 'koreksi'
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

    let totalEl = document.getElementById('dash-total-santri');
    if (totalEl && rawMasterSantri.length === 0) {
        totalEl.innerText = "Memuat...";
    }

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
        console.warn("Gagal load master data (404/Network Error):", e);
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
