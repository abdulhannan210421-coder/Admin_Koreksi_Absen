/* =========================================================
   TAB 2: EDIT DATA ADMIN (DRAG & DROP TOUCH INTEGRATED)
========================================================= */
let editorSource = 'koreksi';
let editorStatusFilter = 'belum';
let selectedDaerah = null;
let selectedKamar = null;
let activeEditRowIndex = null;
let tempSakit = [], tempIzin = [], tempAlpha = [];
let historyStack = [];

function switchEditorSource(src) {
    editorSource = src;
    selectedDaerah = null;
    selectedKamar = null;
    document.getElementById('btn-src-koreksi').className = src === 'koreksi' ? 'tab-btn active ripple-target' : 'tab-btn ripple-target';
    document.getElementById('btn-src-database').className = src === 'database' ? 'tab-btn active ripple-target' : 'tab-btn ripple-target';
    renderEditorView();
}

function setEditorStatusFilter(st) {
    editorStatusFilter = st;
    document.querySelectorAll('.filter-tabs .tab-btn').forEach(btn => btn.className = 'tab-btn ripple-target');
    let btn = document.getElementById(`tab-status-${st}`);
    if (btn) {
        if (st === 'alpha') btn.className = 'tab-btn active-alpha ripple-target';
        else if (st === 'izin') btn.className = 'tab-btn active-izin ripple-target';
        else if (st === 'sakit') btn.className = 'tab-btn active-sakit ripple-target';
        else btn.className = 'tab-btn active ripple-target';
    }
    renderEditorView();
}

function selectDaerahLevel(daerahCode) {
    triggerHaptic(15);
    selectedDaerah = daerahCode;
    selectedKamar = null;
    renderEditorView();
}

function selectKamarLevel(kamarName) {
    triggerHaptic(15);
    selectedKamar = kamarName;
    renderEditorView();
}

function navLevelBack() {
    triggerHaptic(15);
    if (selectedKamar !== null) {
        selectedKamar = null;
    } else if (selectedDaerah !== null) {
        selectedDaerah = null;
    }
    renderEditorView();
}

function attachSwipeToCard(wrapperEl, cardEl, rowIndex) {
    let startX = 0, currentX = 0, isSwiping = false;

    cardEl.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isSwiping = true;
    }, { passive: true });

    cardEl.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        currentX = e.touches[0].clientX;
        let diffX = currentX - startX;
        if (Math.abs(diffX) < 100) {
            cardEl.style.transform = `translateX(${diffX}px)`;
        }
    }, { passive: true });

    cardEl.addEventListener('touchend', () => {
        if (!isSwiping) return;
        let diffX = currentX - startX;
        cardEl.style.transform = `translateX(0px)`;
        
        if (diffX > 75) {
            markAsSesuaiByRowIndex(rowIndex);
        } else if (diffX < -75) {
            bukaModalKoreksiByRowIndex(rowIndex);
        }
        isSwiping = false;
        startX = 0; currentX = 0;
    });
}

function renderEditorView() {
    let container = document.getElementById('editor-content-container');
    let breadcrumb = document.getElementById('editor-breadcrumb');
    let breadcrumbText = document.getElementById('breadcrumb-text');
    let rawSearch = document.getElementById('search-koreksi')?.value || '';
    let searchVal = rawSearch.toUpperCase().trim();
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
        let labelDaerah = selectedDaerah === 'LAIN' ? 'LAINNYA / RUMAH ORANG TUA' : `Daerah ${selectedDaerah}`;
        breadcrumbText.innerHTML = `📍 <b>${labelDaerah}</b> ➔ 🚪 Kamar <b>${selectedKamar}</b>`;

        let santriInKamar = filteredList.filter(x => x._daerah === selectedDaerah && x.domisili === selectedKamar);

        if (santriInKamar.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); background:var(--card-bg); border-radius:18px;">Tidak ada santri pada kamar ini yang sesuai filter.</div>`;
            return;
        }

        let listDiv = document.createElement('div');
        listDiv.className = 'santri-list fade-in';

        santriInKamar.forEach(item => {
            let badgeHtml = item._isDone ? `<span class="config-badge all">✔ Sesuai</span>` : `<span class="config-badge alpha">Belum</span>`;
            
            let nameDisp = highlightTextHTML(item.namasantri, rawSearch);
            let kamarDisp = highlightTextHTML(item.domisili, rawSearch);

            let wrapper = document.createElement('div');
            wrapper.className = 'santri-card-swipe-wrapper';

            let bgSwipe = document.createElement('div');
            bgSwipe.className = 'santri-card-swipe-bg';
            bgSwipe.innerHTML = `<span>✔ VERIFY (KANAN)</span><span>EDIT ✏️ (KIRI)</span>`;

            let card = document.createElement('div');
            card.className = 'santri-card';
            card.innerHTML = `
                <div class="card-top">
                    <div>
                        <div class="santri-nama">${nameDisp}</div>
                        <div class="santri-meta">ID: <b>${item.idpps}</b> • Domisili: <b>${kamarDisp}</b></div>
                    </div>
                    <div>${badgeHtml}</div>
                </div>
                <div class="pills-group">
                    <span class="pill-tag pill-sakit">Sakit: ${item._tglSakitArr.length}</span>
                    <span class="pill-tag pill-izin">Izin: ${item._tglIzinArr.length}</span>
                    <span class="pill-tag pill-alpha">Alpha: ${item._tglAlphaArr.length}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-act btn-verify ripple-target" onclick="markAsSesuaiByRowIndex(${item._rowIndex})">✔ Verify Sesuai</button>
                    <button class="btn-act btn-edit-card ripple-target" onclick="bukaModalKoreksiByRowIndex(${item._rowIndex})">✏ Drag Tanggal</button>
                </div>
            `;

            attachSwipeToCard(wrapper, card, item._rowIndex);

            wrapper.appendChild(bgSwipe);
            wrapper.appendChild(card);
            listDiv.appendChild(wrapper);
        });

        container.appendChild(listDiv);
        return;
    }

    if (selectedDaerah !== null) {
        breadcrumb.style.display = 'flex';
        let labelDaerah = selectedDaerah === 'LAIN' ? 'LAINNYA / RUMAH ORANG TUA' : `Daerah ${selectedDaerah}`;
        breadcrumbText.innerHTML = `📍 <b>${labelDaerah}</b> (Pilih Kamar / Lokasi)`;

        let santriInDaerah = filteredList.filter(x => x._daerah === selectedDaerah);
        let groupedKamar = {};

        santriInDaerah.forEach(item => {
            let kName = item.domisili || 'LAIN-LAIN';
            if (!groupedKamar[kName]) groupedKamar[kName] = [];
            groupedKamar[kName].push(item);
        });

        let sortedKamars = Object.keys(groupedKamar).sort((a,b)=>a.localeCompare(b, undefined, {numeric: true}));

        if (sortedKamars.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); background:var(--card-bg); border-radius:18px;">Tidak ada lokasi di ${labelDaerah} yang sesuai filter.</div>`;
            return;
        }

        let gridDiv = document.createElement('div');
        gridDiv.className = 'grid-cards fade-in';

        sortedKamars.forEach(kName => {
            let count = groupedKamar[kName].length;
            let roomDisp = highlightTextHTML(kName, rawSearch);
            let card = document.createElement('div');
            card.className = 'item-card ripple-target';
            card.onclick = () => selectKamarLevel(kName);
            card.innerHTML = `
                <div class="item-card-header">
                    <div class="item-card-title">
                        <span>🚪</span>
                        <span>${roomDisp}</span>
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

    let sortedDaerahs = Object.keys(groupedDaerah).sort((a,b) => {
        if (a === 'LAIN') return 1;
        if (b === 'LAIN') return -1;
        return a.localeCompare(b);
    });

    if (sortedDaerahs.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px 15px; color:var(--text-muted); font-size:12px; background:var(--card-bg); border-radius:18px; border:1px solid var(--border);">Tidak ada data daerah yang sesuai filter.</div>`;
        return;
    }

    let gridDiv = document.createElement('div');
    gridDiv.className = 'grid-cards fade-in';

    sortedDaerahs.forEach(dCode => {
        let count = groupedDaerah[dCode].length;
        let drhName = dCode === 'LAIN' ? 'Lainnya / Rumah Ortu' : `Daerah ${dCode}`;
        let drhDisp = highlightTextHTML(drhName, rawSearch);
        let card = document.createElement('div');
        card.className = 'item-card ripple-target';
        card.onclick = () => selectDaerahLevel(dCode);
        card.innerHTML = `
            <div class="item-card-header">
                <div class="item-card-title">
                    <span>📍</span>
                    <span>${drhDisp}</span>
                </div>
                <span class="item-card-badge">${count} Santri</span>
            </div>
            <div class="item-card-footer">
                <span>${editorStatusFilter === 'belum' ? 'Perlu Koreksi' : 'Filtered'}</span>
                <span style="color:var(--primary); font-weight:800;">Buka ➔</span>
            </div>
        `;
        gridDiv.appendChild(card);
    });

    container.appendChild(gridDiv);
}

function markAsSesuaiByRowIndex(rowIndex) {
    triggerHaptic(25);
    const item = rawKoreksiData.find(x => x._rowIndex === rowIndex && x._source === editorSource);
    if (!item) return;

    let nowISO = new Date().toISOString();
    item._statusKoreksi = 'Sesuai (Benar)';
    item._isDone = true;
    item._timestamp = nowISO;
    renderEditorView();

    sendOrQueueData({
        _rowIndex: item._rowIndex,
        _idPps: item.idpps,
        _source: item._source,
        tglSakit: item._tglSakitArr.join(', '),
        tglIzin: item._tglIzinArr.join(', '),
        tglAlpha: item._tglAlphaArr.join(', '),
        keterangan: item._keterangan !== '-' ? item._keterangan : '',
        status: 'Sesuai (Benar)',
        timestamp: nowISO
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

function bukaModalKoreksiByRowIndex(rowIndex) {
    triggerHaptic(15);
    activeEditRowIndex = rowIndex;
    const item = rawKoreksiData.find(x => x._rowIndex === rowIndex && x._source === editorSource);
    if (!item) return;

    tempSakit = [...(item._tglSakitArr || [])];
    tempIzin = [...(item._tglIzinArr || [])];
    tempAlpha = [...(item._tglAlphaArr || [])];
    historyStack = [];

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
    updateUndoUI();
    document.getElementById('modal-edit-koreksi').style.display = 'flex';
}

function saveHistorySnapshot() {
    historyStack.push({
        alpha: [...tempAlpha],
        izin: [...tempIzin],
        sakit: [...tempSakit]
    });
    updateUndoUI();
}

function undoLastAction() {
    if (historyStack.length === 0) return;
    let lastState = historyStack.pop();
    tempAlpha = lastState.alpha;
    tempIzin = lastState.izin;
    tempSakit = lastState.sakit;
    renderChips();
    updateUndoUI();
    showToast("↩️ Perubahan dibatalkan!");
}

function updateUndoUI() {
    let btn = document.getElementById('btn-undo');
    if (!btn) return;
    if (historyStack.length > 0) {
        btn.disabled = false;
        btn.style.opacity = "1";
    } else {
        btn.disabled = true;
        btn.style.opacity = "0.5";
    }
}

function renderChips() {
    const setChips = (containerId, arr, type, chipClass) => {
        let el = document.getElementById(containerId);
        if (!el) return;
        if (arr.length === 0) {
            el.innerHTML = `<span style="font-size:10px; color:var(--text-muted); padding:4px;">Kosong (geser tanggal ke sini)</span>`;
        } else {
            el.innerHTML = arr.map(tgl => `
                <span class="chip ${chipClass}" data-tgl="${tgl}" data-type="${type}">
                    🖐️ Tgl ${tgl}
                </span>
            `).join('');
        }
    };

    setChips('chips-alpha', tempAlpha, 'alpha', 'chip-alpha');
    setChips('chips-izin', tempIzin, 'izin', 'chip-izin');
    setChips('chips-sakit', tempSakit, 'sakit', 'chip-sakit');

    let reqBadge = document.getElementById('ket-required-badge');
    if (reqBadge) reqBadge.style.display = tempAlpha.length > 0 ? 'inline' : 'none';
}

function moveChip(tgl, fromType, toType) {
    if (fromType === toType) return;
    saveHistorySnapshot();

    if (fromType === 'alpha') tempAlpha = tempAlpha.filter(x => x !== tgl);
    if (fromType === 'izin') tempIzin = tempIzin.filter(x => x !== tgl);
    if (fromType === 'sakit') tempSakit = tempSakit.filter(x => x !== tgl);

    if (toType === 'alpha' && !tempAlpha.includes(tgl)) tempAlpha.push(tgl);
    if (toType === 'izin' && !tempIzin.includes(tgl)) tempIzin.push(tgl);
    if (toType === 'sakit' && !tempSakit.includes(tgl)) tempSakit.push(tgl);

    renderChips();

    if (toType === 'trash') {
        showToast(`🗑️ Tgl ${tgl} dihapus. (Klik Undo jika batal)`);
    } else {
        showToast(`↔️ Tgl ${tgl} dipindah ke ${toType.toUpperCase()}`);
    }
}

/* SISTEM DRAG & DROP POINTER/TOUCH TEROPTIMASI */
function setupTouchDragAndDrop() {
    let draggedData = null;
    let ghostEl = null;
    const trashZone = document.getElementById('trash-zone');
    let ticking = false;
    let currentX = 0, currentY = 0;
    let cachedZones = [];

    document.addEventListener('pointerdown', function(e) {
        let chip = e.target.closest('.chip');
        if (!chip) return;

        let tgl = parseInt(chip.getAttribute('data-tgl'), 10);
        let type = chip.getAttribute('data-type');
        if (!tgl || !type) return;

        draggedData = { tgl, type, element: chip };
        
        if (trashZone) trashZone.classList.add('show-floating');

        cachedZones = Array.from(document.querySelectorAll('[data-zone]')).map(el => {
            let rect = el.getBoundingClientRect();
            return {
                element: el,
                zone: el.getAttribute('data-zone'),
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom
            };
        });

        document.body.classList.add('is-dragging');

        ghostEl = chip.cloneNode(true);
        ghostEl.style.position = 'fixed';
        ghostEl.style.top = '0px';
        ghostEl.style.left = '0px';
        ghostEl.style.zIndex = '9999999';
        ghostEl.style.pointerEvents = 'none';
        ghostEl.style.opacity = '0.9';
        ghostEl.style.boxShadow = '0 10px 25px rgba(0,0,0,0.25)';
        
        currentX = e.clientX - 35;
        currentY = e.clientY - 20;
        ghostEl.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(1.1) rotate(2deg)`;
        
        document.body.appendChild(ghostEl);
        chip.style.opacity = '0.2';

        function updatePosition() {
            if (ghostEl) {
                ghostEl.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(1.1) rotate(2deg)`;
                
                let checkX = currentX + 35;
                let checkY = currentY + 20;
                
                cachedZones.forEach(z => {
                    let isHover = checkX >= z.left && checkX <= z.right && checkY >= z.top && checkY <= z.bottom;
                    if (isHover) {
                        z.element.classList.add('drag-over');
                    } else {
                        z.element.classList.remove('drag-over');
                    }
                });
            }
            ticking = false;
        }

        function onPointerMove(pe) {
            if (!ghostEl) return;
            currentX = pe.clientX - 35;
            currentY = pe.clientY - 20;

            if (!ticking) {
                requestAnimationFrame(updatePosition);
                ticking = true;
            }
        }

        function onPointerUp(pe) {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);

            document.body.classList.remove('is-dragging');

            let dropZoneType = null;
            let checkX = pe.clientX;
            let checkY = pe.clientY;

            cachedZones.forEach(z => {
                z.element.classList.remove('drag-over');
                if (checkX >= z.left && checkX <= z.right && checkY >= z.top && checkY <= z.bottom) {
                    dropZoneType = z.zone;
                }
            });

            if (trashZone) trashZone.classList.remove('show-floating');

            if (ghostEl) {
                ghostEl.remove();
                ghostEl = null;
            }
            if (draggedData && draggedData.element) {
                draggedData.element.style.opacity = '1';
            }

            if (dropZoneType && draggedData) {
                moveChip(draggedData.tgl, draggedData.type, dropZoneType);
            }
            draggedData = null;
        }

        document.addEventListener('pointermove', onPointerMove, { passive: true });
        document.addEventListener('pointerup', onPointerUp);
    });
}

function tambahTanggalGlobal(type) {
    const el = document.getElementById('input-global-tgl');
    if (!el) return;
    
    const rawVal = el.value.trim();
    if (!rawVal) return;

    const parsedDates = parseDates(rawVal);
    if (parsedDates.length === 0) {
        showToast("⚠️ Tanggal tidak valid (harus 1-31)");
        el.value = '';
        return;
    }

    saveHistorySnapshot();

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
    saveHistorySnapshot();

    tempAlpha = tempAlpha.filter(x => x !== today);
    tempIzin = tempIzin.filter(x => x !== today);
    tempSakit = tempSakit.filter(x => x !== today);

    if (type === 'alpha') tempAlpha.push(today);
    if (type === 'izin') tempIzin.push(today);
    if (type === 'sakit') tempSakit.push(today);

    renderChips();
}

function closeEditModal() {
    document.getElementById('modal-edit-koreksi').style.display = 'none';
}

function saveEditModal() {
    triggerHaptic(20);
    if (activeEditRowIndex === null) return;
    const item = rawKoreksiData.find(x => x._rowIndex === activeEditRowIndex && x._source === editorSource);
    if (!item) return;

    let ketVal = document.getElementById('edit-ket').value.trim();
    if (tempAlpha.length > 0 && (!ketVal || ketVal === '-')) {
        showToast("⚠️ Wajib isi Keterangan jika ada Alpha!");
        return;
    }

    let nowISO = new Date().toISOString();
    item._tglSakitArr = tempSakit.sort((a,b)=>a-b);
    item._tglIzinArr = tempIzin.sort((a,b)=>a-b);
    item._tglAlphaArr = tempAlpha.sort((a,b)=>a-b);
    item._keterangan = ketVal || '-';
    item._statusKoreksi = 'Sudah Dikoreksi';
    item._isDone = true;
    item._timestamp = nowISO;

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
        status: 'Sudah Dikoreksi',
        timestamp: nowISO
    });
}