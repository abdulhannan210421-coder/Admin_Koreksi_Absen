/* =========================================================
   TAB 4: PENGATURAN MODE APP HP TAKLIMDA, BROADCAST & ARSIP
========================================================= */

function updateConfigUI(mode) {
    let cleanMode = (mode || 'all').toLowerCase();
    appConfigFilter = cleanMode;

    const badge = document.getElementById('badge-active-mode');
    const progressBadge = document.getElementById('progress-mode-badge');
    let labelText = cleanMode === 'all' ? 'SEMUA DATA' : `KHUSUS ${cleanMode.toUpperCase()}`;
    
    if (badge) { badge.className = `config-badge ${cleanMode}`; badge.innerText = labelText; }
    if (progressBadge) { progressBadge.className = `config-badge ${cleanMode}`; progressBadge.innerText = labelText; }

    const rAll = document.getElementById('radio-mode-all');
    const rAlpha = document.getElementById('radio-mode-alpha');
    const rIzin = document.getElementById('radio-mode-izin');
    const rSakit = document.getElementById('radio-mode-sakit');

    if (rAll) rAll.checked = (cleanMode === 'all');
    if (rAlpha) rAlpha.checked = (cleanMode === 'alpha');
    if (rIzin) rIzin.checked = (cleanMode === 'izin');
    if (rSakit) rSakit.checked = (cleanMode === 'sakit');
}

async function saveAppConfig() {
    const radios = document.getElementsByName('optFilterAbsen');
    let selectedVal = 'all';
    radios.forEach(r => { if (r.checked) selectedVal = r.value; });

    showToast("Menyimpan ke Sheet Config...");
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updateConfig', filterAbsen: selectedVal })
        });
        appConfigFilter = selectedVal;
        updateConfigUI(selectedVal);
        renderMonitoringTable();
        showToast("✅ Sheet Config Diperbarui!");
    } catch(e) { showToast("❌ Gagal menyimpan!"); }
}

function renderBroadcastCardUI(bcData) {
    let statusBadge = document.getElementById('current-bc-status-badge');
    let titleEl = document.getElementById('current-bc-disp-title');
    let msgEl = document.getElementById('current-bc-disp-msg');
    let btnToggle = document.getElementById('btn-quick-toggle-bc');

    if (!bcData || !bcData.title) return;
    let isBcActive = (bcData.active === true || String(bcData.active).toLowerCase() === 'true');
    
    if (statusBadge) {
        statusBadge.className = isBcActive ? 'status-tag status-selesai' : 'status-tag status-matikan';
        statusBadge.innerText = isBcActive ? '● AKTIF' : '○ NONAKTIF';
    }
    if (titleEl) titleEl.innerText = bcData.title;
    if (msgEl) msgEl.innerText = bcData.message;

    if (btnToggle) {
        btnToggle.innerText = isBcActive ? '🛑 Nonaktifkan' : '🟢 Aktifkan';
        btnToggle.style.background = isBcActive ? 'var(--alpha-color)' : 'var(--primary)';
    }
}

function fillFormFromCurrentBc() {
    if (!activeBroadcastData) return alert("Belum ada data pengumuman saat ini!");
    let titleEl = document.getElementById('bc-title');
    let msgEl = document.getElementById('bc-message');
    let typeEl = document.getElementById('bc-type');
    let activeEl = document.getElementById('bc-active');

    if (titleEl) titleEl.value = activeBroadcastData.title || '';
    if (msgEl) msgEl.value = activeBroadcastData.message || '';
    if (typeEl) typeEl.value = activeBroadcastData.type || 'info';
    if (activeEl) activeEl.checked = (activeBroadcastData.active === true || String(activeBroadcastData.active).toLowerCase() === 'true');

    showToast("✏️ Teks dimuat ke formulir!");
}

async function quickToggleBroadcast() {
    if (!activeBroadcastData || !activeBroadcastData.title) return alert("Belum ada data pengumuman untuk diubah!");
    let currentStatus = (activeBroadcastData.active === true || String(activeBroadcastData.active).toLowerCase() === 'true');
    let newStatus = !currentStatus;

    showToast(newStatus ? "Mengaktifkan pengumuman..." : "Menonaktifkan pengumuman...");
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateBroadcast',
                broadcast: {
                    title: activeBroadcastData.title,
                    message: activeBroadcastData.message,
                    type: activeBroadcastData.type || 'info',
                    active: newStatus
                }
            })
        });
        showToast(newStatus ? "🟢 Pengumuman Aktif!" : "🛑 Pengumuman Nonaktif!");
        loadAllRealtimeData(true);
    } catch(e) { showToast("❌ Gagal merubah status!"); }
}

async function sendBroadcastPusat() {
    let title = document.getElementById('bc-title').value.trim();
    let message = document.getElementById('bc-message').value.trim();
    let type = document.getElementById('bc-type').value;
    let active = document.getElementById('bc-active').checked;
    if (!title || !message) return alert("Judul & pesan wajib diisi!");

    showToast("Menerbitkan...");
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updateBroadcast', broadcast: { title, message, type, active } })
        });
        showToast("📢 Pengumuman diterbitkan!");
        loadAllRealtimeData(true);
    } catch(e) { showToast("❌ Gagal!"); }
}

function openGantiPekanModal() { document.getElementById('modal-ganti-pekan').style.display = 'flex'; }
function closeGantiPekanModal() { document.getElementById('modal-ganti-pekan').style.display = 'none'; }

async function executeGantiPekan() {
    let bHijri = document.getElementById('archive-bulan-hijri').value;
    let tHijri = document.getElementById('archive-tahun-hijri').value.trim();
    if (!tHijri) return alert("Tahun Hijriah wajib diisi!");

    closeGantiPekanModal();
    showToast(`Memproses arsip ${bHijri} ${tHijri}...`);
    try {
        let res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'archiveAndResetWeek', bulanHijri: bHijri, tahunHijri: tHijri })
        });
        let json = await res.json();
        if (json.status === 'success') {
            showToast("✅ Arsip & Reset Pekan Berhasil!");
            loadAllRealtimeData(false);
        } else { alert("❌ " + json.message); }
    } catch(e) { showToast("❌ Gagal terhubung server!"); }
}
