/* =========================================================
   TAB 1: DASHBOARD ANALITIK & GRAFIK
========================================================= */

function populateGlobalDaerahDropdown() {
    let select = document.getElementById('filter-global-daerah');
    if (!select) return;
    let currVal = select.value;
    select.innerHTML = '<option value="ALL">📍 Semua Daerah</option>';

    let daerahSet = new Set();
    rawMasterSantri.forEach(m => {
        let d = window.getValPeka(m, ['domisili', 'daerah', 'kamar', 'wilayah']);
        if (d) {
            let ltr = window.extractDaerahCode(d);
            if (ltr) daerahSet.add(ltr);
        }
    });
    rawKoreksiData.forEach(m => { if (m._daerah) daerahSet.add(m._daerah); });

    Array.from(daerahSet).sort((a,b) => {
        if (a === 'LAIN') return 1;
        if (b === 'LAIN') return -1;
        return a.localeCompare(b);
    }).forEach(ltr => {
        let opt = document.createElement('option');
        opt.value = ltr;
        opt.innerText = ltr === 'LAIN' ? 'Lainnya / Rumah Ortu' : `Daerah ${ltr}`;
        select.appendChild(opt);
    });

    select.value = currVal || "ALL";
    buildCustomSelectDropdown(select);
}

function populateGlobalBulanDropdown() {
    let select = document.getElementById('filter-global-bulan');
    if (!select) return;
    let currVal = select.value;
    select.innerHTML = '<option value="ALL">🌙 Semua Bulan Hijriah</option>';

    let bulanSet = new Set();
    rawKoreksiData.forEach(r => {
        let b = r.bulanhijriah || window.getValPeka(r, ['bulan', 'bulanhijriah']);
        let cleanB = String(b || '').trim();
        if (cleanB && cleanB !== '-' && cleanB !== 'undefined' && cleanB !== 'null') {
            bulanSet.add(cleanB);
        }
    });

    Array.from(bulanSet).sort().forEach(b => {
        let opt = document.createElement('option');
        opt.value = b;
        opt.innerText = b;
        select.appendChild(opt);
    });

    select.value = currVal || "ALL";
    buildCustomSelectDropdown(select);
}

function populateGlobalTahunDropdown() {
    let select = document.getElementById('filter-global-tahun');
    if (!select) return;
    let currVal = select.value;
    select.innerHTML = '<option value="ALL">📅 Semua Tahun</option>';

    let tahunSet = new Set();
    rawKoreksiData.forEach(r => {
        let t = r.tahunhijriah || window.getValPeka(r, ['tahun', 'tahunhijriah']);
        let cleanT = String(t || '').trim();
        if (cleanT && cleanT !== '-' && cleanT !== 'undefined' && cleanT !== 'null') {
            tahunSet.add(cleanT);
        }
    });

    if (tahunSet.size === 0) tahunSet.add("1448");

    Array.from(tahunSet).sort((a,b)=>b-a).forEach(y => {
        let opt = document.createElement('option');
        opt.value = y;
        opt.innerText = `${y} H`;
        select.appendChild(opt);
    });

    select.value = currVal || "ALL";
    buildCustomSelectDropdown(select);
}

function buildCustomSelectDropdown(selectEl) {
    if (!selectEl) return;
    let parent = selectEl.parentElement;
    if (!parent) return;

    let oldWrapper = parent.querySelector('.custom-select-wrapper');
    if (oldWrapper) oldWrapper.remove();

    selectEl.style.setProperty('display', 'none', 'important');

    let wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';

    let trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    let selectedOpt = selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
    trigger.innerText = selectedOpt ? selectedOpt.innerText : selectEl.value;

    let optionsMenu = document.createElement('div');
    optionsMenu.className = 'custom-options-menu';

    Array.from(selectEl.options).forEach(opt => {
        let item = document.createElement('div');
        item.className = `custom-option ${opt.value === selectEl.value ? 'selected' : ''}`;
        item.innerText = opt.innerText;
        item.dataset.value = opt.value;

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            selectEl.value = opt.value;
            trigger.innerText = opt.innerText;

            optionsMenu.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');

            wrapper.classList.remove('open');
            selectEl.dispatchEvent(new Event('change'));
        });

        optionsMenu.appendChild(item);
    });

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsMenu);
    parent.appendChild(wrapper);
}

document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
});

function resetGlobalFilters() {
    let elDaerah = document.getElementById('filter-global-daerah');
    let elKat = document.getElementById('filter-global-kategori');
    let elBulan = document.getElementById('filter-global-bulan');
    let elTahun = document.getElementById('filter-global-tahun');
    let elMin = document.getElementById('filter-tgl-min');
    let elMax = document.getElementById('filter-tgl-max');

    if (elDaerah) elDaerah.value = "ALL";
    if (elKat) elKat.value = "ALL";
    if (elBulan) elBulan.value = "ALL";
    if (elTahun) elTahun.value = "ALL";
    if (elMin) elMin.value = "";
    if (elMax) elMax.value = "";

    ['filter-global-kategori', 'filter-global-daerah', 'filter-global-bulan', 'filter-global-tahun'].forEach(id => {
        let el = document.getElementById(id);
        if (el) buildCustomSelectDropdown(el);
    });

    processAndRenderStats();
    showToast("🔄 Filter Dashboard Reset!");
}

function parseTimestampMs(tsStr) {
    if (!tsStr) return 0;
    let d = new Date(tsStr);
    if (!isNaN(d.getTime())) return d.getTime();
    
    let parts = String(tsStr).match(/\d+/g);
    if (parts && parts.length >= 3) {
        return new Date(parts[0], parts[1]-1, parts[2]).getTime();
    }
    return 0;
}

function formatLogTime(tsStr) {
    if (!tsStr) return 'Baru saja';
    let d = new Date(tsStr);
    if (isNaN(d.getTime())) return String(tsStr);
    
    let hh = String(d.getHours()).padStart(2, '0');
    let mm = String(d.getMinutes()).padStart(2, '0');
    let dd = String(d.getDate()).padStart(2, '0');
    let mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mo} ${hh}:${mm}`;
}

function processAndRenderStats() {
    let filterDaerah   = document.getElementById('filter-global-daerah')?.value || "ALL";
    let filterKategori = document.getElementById('filter-global-kategori')?.value || "ALL";
    let filterBulan    = document.getElementById('filter-global-bulan')?.value || "ALL";
    let filterTahun    = document.getElementById('filter-global-tahun')?.value || "ALL";

    let rawMin = parseInt(document.getElementById('filter-tgl-min')?.value, 10);
    let rawMax = parseInt(document.getElementById('filter-tgl-max')?.value, 10);
    let tglMin = isNaN(rawMin) ? 1 : Math.max(1, Math.min(30, rawMin));
    let tglMax = isNaN(rawMax) ? 30 : Math.max(1, Math.min(30, rawMax));
    if (tglMin > tglMax) { let temp = tglMin; tglMin = tglMax; tglMax = temp; }

    let masterMap = {};
    rawMasterSantri.forEach(m => {
        let idPps = String(m.idpps || m.id_pps || '').trim();
        if (idPps) masterMap[idPps] = m;
    });

    let filteredMasterData = rawMasterSantri.filter(m => {
        let dom = String(m.domisili || '').toUpperCase();
        let ltr = window.extractDaerahCode(dom);
        if (filterDaerah !== "ALL" && ltr !== filterDaerah) return false;

        let kat = String(m.kategori || '').toUpperCase().trim();
        if (filterKategori === "MTQ" && !kat.includes("MTQ")) return false;
        if (filterKategori === "MQS" && !kat.includes("MQS")) return false;
        return true;
    });

    let isFilterActive = (filterBulan !== "ALL" || filterTahun !== "ALL");
    
    let datasetAbsensiFiltered = rawKoreksiData.filter(row => {
        if (!isFilterActive && row._source !== 'koreksi') return false;

        let idPps = String(row.idpps || row.id_pps || '').trim();
        let mDetail = masterMap[idPps];

        let letter = row._daerah;
        if ((!letter || letter === 'LAIN') && mDetail) {
            letter = window.extractDaerahCode(mDetail.domisili);
        }
        if (filterDaerah !== "ALL" && letter !== filterDaerah) return false;

        let katText = String(row.kategori || (mDetail ? mDetail.kategori : '') || '').toUpperCase().trim();
        if (filterKategori === "MTQ" && !katText.includes("MTQ")) return false;
        if (filterKategori === "MQS" && !katText.includes("MQS")) return false;

        if (filterBulan !== "ALL") {
            let rBulan = String(row.bulanhijriah || '').trim().toLowerCase();
            if (rBulan && rBulan !== filterBulan.toLowerCase()) return false;
        }
        if (filterTahun !== "ALL") {
            let rTahun = String(row.tahunhijriah || '').trim();
            if (rTahun && rTahun !== filterTahun) return false;
        }

        return true;
    });

    let datasetPekanIni = rawKoreksiData.filter(x => x._source === 'koreksi');
    if (filterDaerah !== "ALL") {
        datasetPekanIni = datasetPekanIni.filter(x => x._daerah === filterDaerah);
    }
    let totalPekanIni = datasetPekanIni.length;
    let selesaiPekanIni = datasetPekanIni.filter(x => x._isDone).length;
    let percentPekanIni = totalPekanIni > 0 ? Math.round((selesaiPekanIni / totalPekanIni) * 100) : 0;

    let totalSantriMaster = rawMasterSantri.length > 0 ? filteredMasterData.length : totalPekanIni;

    let subTxt = document.getElementById('dash-sub-pekan-santri');
    if (subTxt) subTxt.innerText = `Pekan ini wajib dikoreksi: ${totalPekanIni} Santri`;

    let statProg = document.getElementById('stat-progress-text');
    if (statProg) statProg.innerText = `${selesaiPekanIni} / ${totalPekanIni} Santri Dikoreksi (PEKAN INI)`;

    let statPct = document.getElementById('stat-percent');
    if (statPct) statPct.innerText = `${percentPekanIni}%`;

    updateCircularGauge(percentPekanIni);

    let countSakitTotal = 0, countIzinTotal = 0, countAlphaTotal = 0, countVerifiedTotal = 0;
    
    let statsPerDaerah = { 'LAIN': { total: 0, sudah: 0, belum: 0, sakit: 0, izin: 0, alpha: 0 } };
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(ltr => {
        statsPerDaerah[ltr] = { total: 0, sudah: 0, belum: 0, sakit: 0, izin: 0, alpha: 0 };
    });

    let dailyTrendData = { sakit: Array(31).fill(0), izin: Array(31).fill(0), alpha: Array(31).fill(0) };

    let mtqGlobal = { total: 0, hadir: 0, sakit: 0, izin: 0, alpha: 0 };
    let mqsGlobal = { total: 0, hadir: 0, sakit: 0, izin: 0, alpha: 0 };

    let mtqDaerah = { 'LAIN': { total: 0, hadir: 0, sakit: 0, izin: 0, alpha: 0 } }, 
        mqsDaerah = { 'LAIN': { total: 0, hadir: 0, sakit: 0, izin: 0, alpha: 0 } };
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(l => {
        mtqDaerah[l] = { total: 0, hadir: 0, sakit: 0, izin: 0, alpha: 0 };
        mqsDaerah[l] = { total: 0, hadir: 0, sakit: 0, izin: 0, alpha: 0 };
    });

    filteredMasterData.forEach(m => {
        let katText = String(m.kategori || '').toUpperCase().trim();
        let dom = String(m.domisili || '').toUpperCase();
        let ltr = window.extractDaerahCode(dom);

        if (katText.includes("MQS")) {
            mqsGlobal.total++;
            if (mqsDaerah[ltr]) mqsDaerah[ltr].total++;
        } else {
            mtqGlobal.total++;
            if (mtqDaerah[ltr]) mtqDaerah[ltr].total++;
        }
    });

    let auditLogList = [];

    datasetAbsensiFiltered.forEach(row => {
        let idPps = String(row.idpps || row.id_pps || '').trim();
        let mDetail = masterMap[idPps];

        let letter = row._daerah;
        if ((!letter || letter === 'LAIN') && mDetail) {
            letter = window.extractDaerahCode(mDetail.domisili);
        }

        let tSakit = (row._tglSakitArr || []).filter(d => d >= tglMin && d <= tglMax);
        let tIzin   = (row._tglIzinArr || []).filter(d => d >= tglMin && d <= tglMax);
        let tAlpha = (row._tglAlphaArr || []).filter(d => d >= tglMin && d <= tglMax);

        tSakit.forEach(day => { if(day >= 1 && day <= 30) dailyTrendData.sakit[day]++; });
        tIzin.forEach(day  => { if(day >= 1 && day <= 30) dailyTrendData.izin[day]++; });
        tAlpha.forEach(day => { if(day >= 1 && day <= 30) dailyTrendData.alpha[day]++; });

        let numSakit = tSakit.length || (tglMin === 1 && tglMax === 30 ? (row._totSakitNum || 0) : 0);
        let numIzin  = tIzin.length  || (tglMin === 1 && tglMax === 30 ? (row._totIzinNum  || 0) : 0);
        let numAlpha = tAlpha.length || (tglMin === 1 && tglMax === 30 ? (row._totAlphaNum || 0) : 0);

        let hasSakit = numSakit > 0;
        let hasIzin  = numIzin > 0;
        let hasAlpha = numAlpha > 0;
        let isDone   = row._isDone;

        if (hasSakit) countSakitTotal++;
        if (hasIzin)  countIzinTotal++;
        if (hasAlpha) countAlphaTotal++;
        if (isDone)   countVerifiedTotal++;

        let katText = String(row.kategori || (mDetail ? mDetail.kategori : '') || '').toUpperCase().trim();
        let isMqs = katText.includes("MQS");

        if (isMqs) {
            if (hasSakit) mqsGlobal.sakit++;
            if (hasIzin)  mqsGlobal.izin++;
            if (hasAlpha) mqsGlobal.alpha++;
            if (!hasSakit && !hasIzin && !hasAlpha) mqsGlobal.hadir++;

            if (mqsDaerah[letter]) {
                if (hasSakit) mqsDaerah[letter].sakit++;
                if (hasIzin)  mqsDaerah[letter].izin++;
                if (hasAlpha) mqsDaerah[letter].alpha++;
                if (!hasSakit && !hasIzin && !hasAlpha) mqsDaerah[letter].hadir++;
            }
        } else {
            if (hasSakit) mtqGlobal.sakit++;
            if (hasIzin)  mtqGlobal.izin++;
            if (hasAlpha) mtqGlobal.alpha++;
            if (!hasSakit && !hasIzin && !hasAlpha) mtqGlobal.hadir++;

            if (mtqDaerah[letter]) {
                if (hasSakit) mtqDaerah[letter].sakit++;
                if (hasIzin)  mtqDaerah[letter].izin++;
                if (hasAlpha) mtqDaerah[letter].alpha++;
                if (!hasSakit && !hasIzin && !hasAlpha) mtqDaerah[letter].hadir++;
            }
        }

        if (statsPerDaerah[letter]) {
            statsPerDaerah[letter].total++;
            if (isDone) {
                statsPerDaerah[letter].sudah++;
                if (row._source === 'koreksi') {
                    let namaClean = row.namasantri !== '-' ? row.namasantri : (mDetail ? mDetail.namasantri : '-');
                    let dispLabel = letter === 'LAIN' ? 'Lainnya / Ortu' : `Daerah ${letter}`;
                    auditLogList.push({ 
                        nama: namaClean, 
                        daerah: dispLabel, 
                        status: row._statusKoreksi, 
                        s: numSakit, i: numIzin, a: numAlpha,
                        timestamp: row._timestamp,
                        rawTime: parseTimestampMs(row._timestamp)
                    });
                }
            } else {
                statsPerDaerah[letter].belum++;
            }
            if (hasSakit) statsPerDaerah[letter].sakit++;
            if (hasIzin)  statsPerDaerah[letter].izin++;
            if (hasAlpha) statsPerDaerah[letter].alpha++;
        }
    });

    if (rawMasterSantri.length > 0) {
        mtqGlobal.hadir = Math.max(0, mtqGlobal.total - (mtqGlobal.sakit + mtqGlobal.izin + mtqGlobal.alpha));
        mqsGlobal.hadir = Math.max(0, mqsGlobal.total - (mqsGlobal.sakit + mqsGlobal.izin + mqsGlobal.alpha));

        Object.keys(mtqDaerah).forEach(l => {
            if (mtqDaerah[l].total > 0) {
                mtqDaerah[l].hadir = Math.max(0, mtqDaerah[l].total - (mtqDaerah[l].sakit + mtqDaerah[l].izin + mtqDaerah[l].alpha));
            }
            if (mqsDaerah[l].total > 0) {
                mqsDaerah[l].hadir = Math.max(0, mqsDaerah[l].total - (mqsDaerah[l].sakit + mqsDaerah[l].izin + mqsDaerah[l].alpha));
            }
        });
    }

    auditLogList.sort((a, b) => b.rawTime - a.rawTime);

    let totalEl = document.getElementById('dash-total-santri');
    if (totalEl) totalEl.innerText = totalSantriMaster;

    let sudahEl = document.getElementById('dash-total-sudah');
    if (sudahEl) sudahEl.innerText = countVerifiedTotal;

    let pctSudahEl = document.getElementById('dash-pct-sudah');
    if (pctSudahEl) pctSudahEl.innerText = `Total Santri Diverifikasi`;

    let sakitEl = document.getElementById('dash-total-sakit');
    if (sakitEl) sakitEl.innerText = countSakitTotal;

    let izinEl = document.getElementById('dash-total-izin');
    if (izinEl) izinEl.innerText = countIzinTotal;

    let alphaEl = document.getElementById('dash-total-alpha');
    if (alphaEl) alphaEl.innerText = countAlphaTotal;

    renderMtqMqsTables(mtqGlobal, mqsGlobal, mtqDaerah, mqsDaerah);
    renderAuditLogTable(auditLogList);

    let labelsDaily = [];
    for (let i = tglMin; i <= tglMax; i++) {
        labelsDaily.push(`Tgl ${i}`);
    }

    drawChart('chartLineTrend', 'line', {
        labels: labelsDaily,
        datasets: [
            { label: 'Sakit', data: dailyTrendData.sakit.slice(tglMin, tglMax + 1), borderColor: '#0284c7', backgroundColor: '#0284c715', fill: true },
            { label: 'Izin', data: dailyTrendData.izin.slice(tglMin, tglMax + 1), borderColor: '#d97706', backgroundColor: '#d9770615', fill: true },
            { label: 'Alpha', data: dailyTrendData.alpha.slice(tglMin, tglMax + 1), borderColor: '#e11d48', backgroundColor: '#e11d4815', fill: true }
        ]
    });

    let activeRegions = Object.keys(statsPerDaerah)
        .filter(k => statsPerDaerah[k].total > 0 || mtqDaerah[k].total > 0 || mqsDaerah[k].total > 0)
        .sort((a,b) => (a === 'LAIN' ? 1 : b === 'LAIN' ? -1 : a.localeCompare(b)));

    drawChart('chartBarDaerah', 'bar', {
        labels: activeRegions.map(r => r === 'LAIN' ? 'Lain/Ortu' : `Drh ${r}`),
        datasets: [
            { label: 'Sakit', data: activeRegions.map(r => statsPerDaerah[r].sakit), backgroundColor: '#0284c7' },
            { label: 'Izin', data: activeRegions.map(r => statsPerDaerah[r].izin), backgroundColor: '#d97706' },
            { label: 'Alpha', data: activeRegions.map(r => statsPerDaerah[r].alpha), backgroundColor: '#e11d48' }
        ]
    });

    drawChart('chartBarMtq', 'bar', {
        labels: activeRegions.map(r => r === 'LAIN' ? 'Lain/Ortu' : `Drh ${r}`),
        datasets: [
            { label: 'Hadir', data: activeRegions.map(r => mtqDaerah[r].hadir), backgroundColor: '#059669' },
            { label: 'Sakit', data: activeRegions.map(r => mtqDaerah[r].sakit), backgroundColor: '#0284c7' },
            { label: 'Izin', data: activeRegions.map(r => mtqDaerah[r].izin), backgroundColor: '#d97706' },
            { label: 'Alpha', data: activeRegions.map(r => mtqDaerah[r].alpha), backgroundColor: '#e11d48' }
        ]
    });

    drawChart('chartBarMqs', 'bar', {
        labels: activeRegions.map(r => r === 'LAIN' ? 'Lain/Ortu' : `Drh ${r}`),
        datasets: [
            { label: 'Hadir', data: activeRegions.map(r => mqsDaerah[r].hadir), backgroundColor: '#059669' },
            { label: 'Sakit', data: activeRegions.map(r => mqsDaerah[r].sakit), backgroundColor: '#0284c7' },
            { label: 'Izin', data: activeRegions.map(r => mqsDaerah[r].izin), backgroundColor: '#d97706' },
            { label: 'Alpha', data: activeRegions.map(r => mqsDaerah[r].alpha), backgroundColor: '#e11d48' }
        ]
    });

    drawChart('chartDonutAbsensi', 'doughnut', {
        labels: ['Sakit', 'Izin', 'Alpha', 'Verifikasi'],
        datasets: [{ data: [countSakitTotal, countIzinTotal, countAlphaTotal, countVerifiedTotal], backgroundColor: ['#0284c7', '#d97706', '#e11d48', '#059669'] }]
    });
}

function drawChart(canvasId, type, dataConfig) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (charts[canvasId]) { charts[canvasId].destroy(); }
    charts[canvasId] = new Chart(canvas.getContext('2d'), {
        type: type,
        data: dataConfig,
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderMtqMqsTables(mtqG, mqsG, mtqD, mqsD) {
    let tbodyG = document.getElementById('tbody-mtq-mqs-global');
    if (tbodyG) {
        tbodyG.innerHTML = `
            <tr><td><b>MTQ</b></td><td style="text-align:center; font-weight:800;">${mtqG.total}</td><td style="text-align:center; color:var(--primary); font-weight:800;">${mtqG.hadir}</td><td style="text-align:center; color:var(--sakit-color);">${mtqG.sakit}</td><td style="text-align:center; color:var(--izin-color);">${mtqG.izin}</td><td style="text-align:center; color:var(--alpha-color); font-weight:800;">${mtqG.alpha}</td></tr>
            <tr><td><b>MQS</b></td><td style="text-align:center; font-weight:800;">${mqsG.total}</td><td style="text-align:center; color:var(--primary); font-weight:800;">${mqsG.hadir}</td><td style="text-align:center; color:var(--sakit-color);">${mqsG.sakit}</td><td style="text-align:center; color:var(--izin-color);">${mqsG.izin}</td><td style="text-align:center; color:var(--alpha-color); font-weight:800;">${mqsG.alpha}</td></tr>
        `;
    }

    let tbodyD = document.getElementById('tbody-mtq-mqs-daerah');
    if (tbodyD) {
        tbodyD.innerHTML = "";
        let activeKeys = Object.keys(mtqD)
            .filter(k => mtqD[k].total > 0 || mqsD[k].total > 0)
            .sort((a,b) => (a === 'LAIN' ? 1 : b === 'LAIN' ? -1 : a.localeCompare(b)));

        activeKeys.forEach(k => {
            let m = mtqD[k], q = mqsD[k];
            let labelText = k === 'LAIN' ? 'Lain/Ortu' : `Daerah ${k}`;
            tbodyD.innerHTML += `
                <tr>
                    <td><b>${labelText}</b></td>
                    <td style="text-align:center; font-weight:700;">${m.total}</td><td style="text-align:center; color:var(--primary);">${m.hadir}</td><td style="text-align:center; color:var(--sakit-color);">${m.sakit}</td><td style="text-align:center; color:var(--izin-color);">${m.izin}</td><td style="text-align:center; color:var(--alpha-color); font-weight:800;">${m.alpha}</td>
                    <td style="text-align:center; font-weight:700; border-left:1px dashed var(--border);">${q.total}</td><td style="text-align:center; color:var(--primary);">${q.hadir}</td><td style="text-align:center; color:var(--sakit-color);">${q.sakit}</td><td style="text-align:center; color:var(--izin-color);">${q.izin}</td><td style="text-align:center; color:var(--alpha-color); font-weight:800;">${q.alpha}</td>
                </tr>
            `;
        });
    }
}

function renderAuditLogTable(logs) {
    let tbody = document.getElementById('tbody-audit-log');
    if (!tbody) return;
    tbody.innerHTML = logs.length === 0 ? `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:12px;">Belum ada verifikasi data pekan ini.</td></tr>` :
        logs.slice(0, 20).map(item => `
            <tr>
                <td><span style="font-size:10px; font-weight:700; color:var(--text-muted); white-space:nowrap;">🕒 ${formatLogTime(item.timestamp)}</span></td>
                <td><b>${item.nama}</b></td>
                <td><span class="status-tag status-selesai">${item.daerah}</span></td>
                <td><span style="color:var(--primary); font-weight:800; font-size:10px;">✔ ${item.status || 'OK'}</span></td>
                <td style="text-align:center; font-weight:800; font-size:10px;">
                    <span style="color:var(--sakit-color)">S:${item.s}</span> 
                    <span style="color:var(--izin-color)">I:${item.i}</span> 
                    <span style="color:var(--alpha-color)">A:${item.a}</span>
                </td>
            </tr>
        `).join('');
}