/* =========================================================
   TAB 2: EDIT DATA ADMIN (Fix Bentrok RowIndex & Source)
========================================================= */
let editorSource = 'koreksi';
let editorStatusFilter = 'belum';
let selectedDaerah = null;
let selectedKamar = null;
let activeEditRowIndex = null;
let tempSakit = [], tempIzin = [], tempAlpha = [];

function switchEditorSource(src) {
    editorSource = src;
    selectedDaerah = null;
    selectedKamar = null;
    document.getElementById('btn-src-koreksi').className = src === 'koreksi' ? 'tab-btn active' : 'tab-btn';
    document.getElementById('btn-src-database').className = src === 'database' ? 'tab-btn active' : 'tab-btn';
    renderEditorView();
}

function setEditorStatusFilter(st) {
    editorStatusFilter = st;
    document.querySelectorAll('.filter-tabs .tab-btn').forEach(btn => btn.className = 'tab-btn');
    let btn = document.getElementById(`tab-status-${st}`);
    if (btn) {
        if (st === 'alpha') btn.className = 'tab-btn active-alpha';
        else if (st === 'izin') btn.className = 'tab-btn active-izin';
        else if (st === 'sakit') btn.className = 'tab-btn active-sakit';
        else btn.className = 'tab-btn active';
    }
    renderEditorView();
}

function selectDaerahLevel(daerahCode) {
    selectedDaerah = daerahCode;
    selectedKamar = null;
    renderEditorView();
}

function selectKamarLevel(kamarName) {
    selectedKamar = kamarName;
    renderEditorView();
}

function navLevelBack() {
    if (selectedKamar !== null) {
        selectedKamar = null;
    } else if (selectedDaerah !== null) {
        selectedDaerah = null;
    }
    renderEditorView();
}

function renderEditorView() {
    let container = document.getElementById('editor-content-container');
    let breadcrumb = document.getElementById('editor-breadcrumb');
    let breadcrumbText = document.getElementById('breadcrumb-text');
    let searchVal = document.getElementById('search-koreksi')?.value.toUpperCase().trim() || '';
    if (!container) return;
    container.innerHTML = "";

    let sourceDataset = rawKoreksiData.filter(x => x._source === editorSource);

    document.getElementById('count-belum').innerText = sourceDataset.filter(x => !x._isDone).length;
    document.getElementById('count-sudah').innerText = sourceDataset.filter(x => x._isDone).length;
    document.getElementById('count-alpha-filter').innerText = sourceDataset.filter(x => x._tglAlphaArr && x._tglAlphaArr.length > 0).length;
    document.getElementById('count-izin-filter').innerText = sourceDataset.filter(x => x._tglIzinArr && x._tglIzinArr.length > 0).length;
    document.getElementById('count-sakit-filter').innerText = sourceDataset.filter(x => x._tglSakitArr && x._tglSakitArr.length > 0).length;

    let filteredList = sourceDataset.filter(item => {
        let matchStatus = true;
        if (editorStatusFilter === 'belum') matchStatus = !item._isDone;
        else if (editorStatusFilter === 'sudah') matchStatus = item._isDone;
        else if (editorStatusFilter === 'alpha') matchStatus = item._tglAlphaArr && item._tglAlphaArr.length > 0;
        else if (editorStatusFilter === 'izin') matchStatus = item._tglIzinArr && item._tglIzinArr.length > 0;
        else if (editorStatusFilter === 'sakit') matchStatus = item._tglSakitArr && item._tglSakitArr.length > 0;

        let matchSearch = true;
        if (searchVal) {
            let haystack = `${item._daerah} ${item.domisili} ${item.namasantri} ${item.idpps}`.toUpperCase();
            matchSearch = haystack.includes(searchVal);
        }

        return matchStatus && matchSearch;
    });

    if (selectedDaerah !== null && selectedKamar !== null) {
        breadcrumb.style.display = 'flex';
        breadcrumbText.innerHTML = `📍 Daerah <b>${selectedDaerah}</b> ➔ 🚪 Kamar <b>${selectedKamar}</b>`;

        let santriInKamar = filteredList.filter(x => x._daerah === selectedDaerah && x.domisili === selectedKamar);

        if (santriInKamar.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); background:white; border-radius:18px;">Tidak ada santri pada kamar ini yang sesuai filter.</div>`;
            return;
        }

        let listDiv = document.createElement('div');
        listDiv.className = 'santri-list fade-in';

        santriInKamar.forEach(item => {
            let badgeHtml = item._isDone ? `<span class="config-badge all">✔ Sesuai</span>` : `<span class="config-badge alpha">Belum</span>`;
            let card = document.createElement('div');
            card.className = 'santri-card';
            card.innerHTML = `
                <div class="card-top">
                    <div>
                        <div class="santri-nama">${item.namasantri}</div>
                        <div class="santri-meta">ID: <b>${item.idpps}</b> • Kamar: <b>${item.domisili}</b></div>
                    </div>
                    <div>${badgeHtml}</div>
                </div>
                <div class="pills-group">
                    <span class="pill-tag pill-sakit">Sakit: ${item._tglSakitArr.length}</span>
                    <span class="pill-tag pill-izin">Izin: ${item._tglIzinArr.length}</span>
                    <span class="pill-tag pill-alpha">Alpha: ${item._tglAlphaArr.length}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-act btn-verify" onclick="markAsSesuaiByRowIndex(${item._rowIndex})">✔ Verify Sesuai</button>
                    <button class="btn-act btn-edit-card" onclick="bukaModalKoreksiByRowIndex(${item._rowIndex})">✏ Edit Tanggal</button>
                </div>
            `;
            listDiv.appendChild(card);
        });

        container.appendChild(listDiv);
        return;
    }

    if (selectedDaerah !== null) {
        breadcrumb.style.display = 'flex';
        breadcrumbText.innerHTML = `📍 Daerah <b>${selectedDaerah}</b> (Pilih Kamar)`;

        let santriInDaerah = filteredList.filter(x => x._daerah === selectedDaerah);
        let groupedKamar = {};

        santriInDaerah.forEach(item => {
            let kName = item.domisili || 'LAIN-LAIN';
            if (!groupedKamar[kName]) groupedKamar[kName] = [];
            groupedKamar[kName].push(item);
        });

        let sortedKamars = Object.keys(groupedKamar).sort((a,b)=>a.localeCompare(b, undefined, {numeric: true}));

        if (sortedKamars.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); background:white; border-radius:18px;">Tidak ada kamar di Daerah ${selectedDaerah} yang sesuai filter.</div>`;
            return;
        }

        let gridDiv = document.createElement('div');
        gridDiv.className = 'grid-cards fade-in';

        sortedKamars.forEach(kName => {
            let count = groupedKamar[kName].length;
            let card = document.createElement('div');
            card.className = 'item-card';
            card.onclick = () => selectKamarLevel(kName);
            card.innerHTML = `
                <div class="item-card-header">
                    <div class="item-card-title">
                        <span>🚪</span>
                        <span>Kamar ${kName}</span>
                    </div>
                    <span class="item-card-badge">${count} Santri</span>
                </div>
                <div class="item-card-footer">
                    <span>Buka Santri</span>
                    <span style="color:var(--primary); font-weight:800;">Lihat ➔</span>
                </div>
            `;
            gridDiv.appendChild(card);
        });

        container.appendChild(gridDiv);
        return;
    }

    breadcrumb.style.display = 'none';

    let groupedDaerah = {};
    filteredList.forEach(item => {
        let dCode = item._daerah || 'LAIN';
        if (!groupedDaerah[dCode]) groupedDaerah[dCode] = [];
        groupedDaerah[dCode].push(item);
    });

    let sortedDaerahs = Object.keys(groupedDaerah).sort();

    if (sortedDaerahs.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px 15px; color:var(--text-muted); font-size:12px; background:white; border-radius:18px; border:1px solid var(--border);">Tidak ada data daerah yang sesuai filter.</div>`;
        return;
    }

    let gridDiv = document.createElement('div');
    gridDiv.className = 'grid-cards fade-in';

    sortedDaerahs.forEach(dCode => {
        let count = groupedDaerah[dCode].length;
        let card = document.createElement('div');
        card.className = 'item-card';
        card.onclick = () => selectDaerahLevel(dCode);
        card.innerHTML = `
            <div class="item-card-header">
                <div class="item-card-title">
                    <span>📍</span>
                    <span>Daerah ${dCode}</span>
                </div>
                <span class="item-card-badge">${count} Santri</span>
            </div>
            <div class="item-card-footer">
                <span>${editorStatusFilter === 'belum' ? 'Perlu Koreksi' : 'Filtered'}</span>
                <span style="color:var(--primary); font-weight:800;">Buka Daerah ➔</span>
            </div>
        `;
        gridDiv.appendChild(card);
    });

    container.appendChild(gridDiv);
}

// PENCARIAN PRESISI MENGGUNAKAN ROWINDEX + SOURCE
function markAsSesuaiByRowIndex(rowIndex) {
    const item = rawKoreksiData.find(x => x._rowIndex === rowIndex && x._source === editorSource);
    if (!item) return;

    item._statusKoreksi = 'Sesuai (Benar)';
    item._isDone = true;
    renderEditorView();

    sendOrQueueData({
        _rowIndex: item._rowIndex,
        _idPps: item.idpps,
        _source: item._source,
        tglSakit: item._tglSakitArr.join(', '),
        tglIzin: item._tglIzinArr.join(', '),
        tglAlpha: item._tglAlphaArr.join(', '),
        keterangan: item._keterangan !== '-' ? item._keterangan : '',
        status: 'Sesuai (Benar)'
    });
}

async function sendOrQueueData(dataPayload) {
    if (!navigator.onLine) {
        queueForSync(dataPayload);
        showToast("💾 Tersimpan Offline.");
        return;
    }

    showToast("Mengirim data...");
    try {
        let res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updateKoreksi', data: dataPayload })
        });
        let jsonRes = await res.json();
        if (res.ok && jsonRes.status === 'success') {
            showToast("✔ Data berhasil diperbarui!");
        } else { queueForSync(dataPayload); }
    } catch(err) { queueForSync(dataPayload); }
}

// PENCARIAN PRESISI MENGGUNAKAN ROWINDEX + SOURCE
function bukaModalKoreksiByRowIndex(rowIndex) {
    activeEditRowIndex = rowIndex;
    const item = rawKoreksiData.find(x => x._rowIndex === rowIndex && x._source === editorSource);
    if (!item) return;

    tempSakit = [...(item._tglSakitArr || [])];
    tempIzin = [...(item._tglIzinArr || [])];
    tempAlpha = [...(item._tglAlphaArr || [])];

    document.getElementById('edit-nama').innerText = item.namasantri || '-';
    document.getElementById('edit-pps').innerText = item.idpps || '-';
    document.getElementById('edit-domisili').innerText = item.domisili || '-';
    document.getElementById('edit-ket').value = item._keterangan !== '-' ? item._keterangan : '';

    let fotoImg = document.getElementById('edit-foto');
    let fotoPlaceholder = document.getElementById('edit-foto-placeholder');
    if (item._foto && item._foto.trim() !== '') {
        fotoImg.src = item._foto;
        fotoImg.style.display = 'block';
        fotoPlaceholder.style.display = 'none';
    } else {
        fotoImg.style.display = 'none';
        fotoPlaceholder.style.display = 'flex';
    }

    renderChips();
    document.getElementById('modal-edit-koreksi').style.display = 'flex';
}

function renderChips() {
    const setChips = (containerId, arr, type, chipClass) => {
        let el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = arr.length === 0 ? `<span style="font-size:10px; color:var(--text-muted);">Tidak ada</span>` :
            arr.map(tgl => `
                <span class="chip ${chipClass}">
                    Tgl ${tgl}
                    <span class="chip-del" onclick="hapusTanggal('${type}', ${tgl})">✕</span>
                </span>
            `).join('');
    };

    setChips('chips-alpha', tempAlpha, 'alpha', 'chip-alpha');
    setChips('chips-izin', tempIzin, 'izin', 'chip-izin');
    setChips('chips-sakit', tempSakit, 'sakit', 'chip-sakit');

    let reqBadge = document.getElementById('ket-required-badge');
    if (reqBadge) reqBadge.style.display = tempAlpha.length > 0 ? 'inline' : 'none';
}

function hapusTanggal(type, tgl) {
    if (type === 'alpha') tempAlpha = tempAlpha.filter(x => x !== tgl);
    if (type === 'izin') tempIzin = tempIzin.filter(x => x !== tgl);
    if (type === 'sakit') tempSakit = tempSakit.filter(x => x !== tgl);
    renderChips();
}

function tambahTanggal(type) {
    const inputId = type === 'alpha' ? 'input-add-alpha' : (type === 'izin' ? 'input-add-izin' : 'input-add-sakit');
    const el = document.getElementById(inputId);
    if (!el) return;
    const parsedDates = parseDates(el.value.trim());
    if (parsedDates.length === 0) return;

    parsedDates.forEach(val => {
        tempAlpha = tempAlpha.filter(x => x !== val);
        tempIzin = tempIzin.filter(x => x !== val);
        tempSakit = tempSakit.filter(x => x !== val);

        if (type === 'alpha') tempAlpha.push(val);
        if (type === 'izin') tempIzin.push(val);
        if (type === 'sakit') tempSakit.push(val);
    });

    el.value = '';
    renderChips();
}

function addTodayDate(type) {
    let today = new Date().getDate();
    tempAlpha = tempAlpha.filter(x => x !== today);
    tempIzin = tempIzin.filter(x => x !== today);
    tempSakit = tempSakit.filter(x => x !== today);

    if (type === 'alpha') tempAlpha.push(today);
    if (type === 'izin') tempIzin.push(today);
    if (type === 'sakit') tempSakit.push(today);
    renderChips();
}

function closeEditModal() { document.getElementById('modal-edit-koreksi').style.display = 'none'; }

// SIMPAN HASIL EDIT DENGAN PENCARIAN PRESISI
function saveEditModal() {
    if (activeEditRowIndex === null) return;
    const item = rawKoreksiData.find(x => x._rowIndex === activeEditRowIndex && x._source === editorSource);
    if (!item) return;

    let ketVal = document.getElementById('edit-ket').value.trim();
    if (tempAlpha.length > 0 && (!ketVal || ketVal === '-')) {
        showToast("⚠️ Wajib isi Keterangan jika ada Alpha!");
        return;
    }

    item._tglSakitArr = tempSakit.sort((a,b)=>a-b);
    item._tglIzinArr = tempIzin.sort((a,b)=>a-b);
    item._tglAlphaArr = tempAlpha.sort((a,b)=>a-b);
    item._keterangan = ketVal || '-';
    item._statusKoreksi = 'Sudah Dikoreksi';
    item._isDone = true;

    closeEditModal();
    renderEditorView();

    sendOrQueueData({
        _rowIndex: item._rowIndex,
        _idPps: item.idpps,
        _source: item._source,
        tglSakit: item._tglSakitArr.join(', '),
        tglIzin: item._tglIzinArr.join(', '),
        tglAlpha: item._tglAlphaArr.join(', '),
        keterangan: item._keterangan,
        status: 'Sudah Dikoreksi'
    });
}
