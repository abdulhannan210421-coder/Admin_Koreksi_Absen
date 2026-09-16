/* =========================================================
   TAB 3: PROGRESS KOREKSI PEKAN INI (Sheet Koreksi_Absen)
========================================================= */

// Helper pembuat warna gradasi HSL (0% Merah -> 50% Kuning -> 100% Hijau)
function getProgressGradientColor(percent) {
    let p = Math.max(0, Math.min(100, percent));
    let hue = Math.round((p * 120) / 100); // 0 = Red, 60 = Yellow, 120 = Green
    return {
        bg: `hsl(${hue}, 85%, 93%)`,
        text: `hsl(${hue}, 90%, 28%)`,
        border: `hsl(${hue}, 70%, 75%)`
    };
}

function renderMonitoringTable() {
    let container = document.getElementById('tbody-monitoring');
    if (!container) return;
    
    let searchVal = document.getElementById('search-daerah')?.value.toUpperCase().trim() || '';
    let sortMode = document.getElementById('sort-progress')?.value || 'lowest';
    container.innerHTML = "";

    // 1. Murni mengambil data dari sheet Koreksi_Absen (Pekan Ini)
    let koreksiOnlyDataset = rawKoreksiData.filter(x => x._source === 'koreksi');

    // 2. Filter Mode App HP (Alpha / Izin / Sakit)
    if (appConfigFilter === 'alpha') {
        koreksiOnlyDataset = koreksiOnlyDataset.filter(x => 
            (x._tglAlphaArr && x._tglAlphaArr.length > 0) || parseInt(window.getValPeka(x, ['total_alpa', 'totalalpa', 'alpa']), 10) > 0
        );
    } else if (appConfigFilter === 'izin') {
        koreksiOnlyDataset = koreksiOnlyDataset.filter(x => 
            (x._tglIzinArr && x._tglIzinArr.length > 0) || parseInt(window.getValPeka(x, ['total_izin', 'totalizin', 'izin']), 10) > 0
        );
    } else if (appConfigFilter === 'sakit') {
        koreksiOnlyDataset = koreksiOnlyDataset.filter(x => 
            (x._tglSakitArr && x._tglSakitArr.length > 0) || parseInt(window.getValPeka(x, ['total_sakit', 'totalsakit', 'sakit']), 10) > 0
        );
    }

    // 3. Inisialisasi statistik per Daerah (A-Z)
    let statsProgress = {};
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(l => { 
        statsProgress[l] = { daerah: l, total: 0, sudah: 0, belum: 0, percent: 0 }; 
    });

    // 4. Hitung Target & Koreksi Selesai
    koreksiOnlyDataset.forEach(item => {
        let d = item._daerah;
        if (d && d !== 'LAIN' && statsProgress[d]) {
            statsProgress[d].total++;
            if (item._isDone) {
                statsProgress[d].sudah++;
            } else {
                statsProgress[d].belum++;
            }
        }
    });

    // 5. Filter daerah aktif
    let activeList = Object.keys(statsProgress)
        .filter(k => statsProgress[k].total > 0 && (!searchVal || k.includes(searchVal)))
        .map(k => {
            let obj = statsProgress[k];
            obj.percent = obj.total > 0 ? Math.round((obj.sudah / obj.total) * 100) : 0;
            return obj;
        });

    // 6. Urutkan data
    if (sortMode === 'lowest') {
        activeList.sort((a, b) => a.percent - b.percent || b.total - a.total);
    } else if (sortMode === 'highest') {
        activeList.sort((a, b) => b.percent - a.percent || b.total - a.total);
    } else if (sortMode === 'name_asc') {
        activeList.sort((a, b) => a.daerah.localeCompare(b.daerah));
    } else if (sortMode === 'total_desc') {
        activeList.sort((a, b) => b.total - a.total);
    }

    if (activeList.length === 0) {
        container.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:16px;">Tidak ada target data koreksi di sheet Koreksi_Absen.</td></tr>`;
        return;
    }

    // 7. Render baris tabel (6 Kolom - Ringkas untuk HP)
    activeList.forEach(item => {
        let color = getProgressGradientColor(item.percent);
        let labelText = item.percent === 100 ? "✔ 100%" : `${item.percent}%`;
        
        let statusBadge = `
            <span style="
                background: ${color.bg}; 
                color: ${color.text}; 
                border: 1px solid ${color.border}; 
                font-weight: 800; 
                padding: 3px 8px; 
                border-radius: 12px; 
                font-size: 10px; 
                display: inline-block;
                white-space: nowrap;
            ">${labelText}</span>
        `;

        container.innerHTML += `
            <tr>
                <td style="font-weight:800; color:var(--text-main); white-space:nowrap;">Daerah ${item.daerah}</td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center; font-weight:800;">${item.total}</td>
                <td style="text-align:center; color:var(--primary); font-weight:800;">${item.sudah}</td>
                <td style="text-align:center; color:var(--text-muted);">${item.belum}</td>
                <td style="text-align:center;">
                    <button class="btn-outline" onclick="openDetailModal('${item.daerah}')" style="padding:4px 8px; font-size:10px; border-radius:8px; font-weight:700;">🔍 Detail</button>
                </td>
            </tr>
        `;
    });
}

function openDetailModal(daerah) {
    let container = document.getElementById('detail-daerah-body');
    if (!container) return;
    container.innerHTML = "";

    let koreksiOnly = rawKoreksiData.filter(x => x._source === 'koreksi' && x._daerah === daerah);

    if (appConfigFilter === 'alpha') {
        koreksiOnly = koreksiOnly.filter(x => 
            (x._tglAlphaArr && x._tglAlphaArr.length > 0) || parseInt(window.getValPeka(x, ['total_alpa', 'totalalpa', 'alpa']), 10) > 0
        );
    } else if (appConfigFilter === 'izin') {
        koreksiOnly = koreksiOnly.filter(x => 
            (x._tglIzinArr && x._tglIzinArr.length > 0) || parseInt(window.getValPeka(x, ['total_izin', 'totalizin', 'izin']), 10) > 0
        );
    } else if (appConfigFilter === 'sakit') {
        koreksiOnly = koreksiOnly.filter(x => 
            (x._tglSakitArr && x._tglSakitArr.length > 0) || parseInt(window.getValPeka(x, ['total_sakit', 'totalsakit', 'sakit']), 10) > 0
        );
    }

    let countSudah = koreksiOnly.filter(x => x._isDone).length;

    document.getElementById('detail-daerah-title').innerText = `Daerah ${daerah} (${countSudah}/${koreksiOnly.length} Pekan Ini)`;

    let grouped = {};
    koreksiOnly.forEach(s => {
        let room = s.domisili || 'LAIN-LAIN';
        if (!grouped[room]) grouped[room] = [];
        grouped[room].push(s);
    });

    Object.keys(grouped).sort().forEach(roomName => {
        let list = grouped[roomName];
        let roomDiv = document.createElement('div');
        roomDiv.style.cssText = 'background:#f8fafc; border:1px solid var(--border); border-radius:14px; padding:10px; margin-bottom:10px;';
        
        let itemsHtml = list.map(s => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:8px 10px; border-radius:10px; border:1px solid var(--border); margin-top:6px; font-size:11px;">
                <div>
                    <div style="font-weight:800; color:var(--text-main);">${s.namasantri}</div>
                    <div style="font-size:9px; color:var(--text-muted);">ID PPS: ${s.idpps}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:10px; font-weight:700;">S:${s._tglSakitArr.length} I:${s._tglIzinArr.length} A:${s._tglAlphaArr.length}</div>
                    <div style="font-size:9px; font-weight:800; color:${s._isDone ? 'var(--primary)' : '#d97706'};">${s._isDone ? '✔ Selesai' : '⏳ Belum'}</div>
                </div>
            </div>
        `).join('');

        roomDiv.innerHTML = `<div style="font-weight:800; font-size:11px; color:var(--primary);">🚪 Kamar ${roomName} (${list.length} Santri)</div>${itemsHtml}`;
        container.appendChild(roomDiv);
    });

    document.getElementById('modal-detail-daerah').style.display = 'flex';
}

function closeDetailModal() { document.getElementById('modal-detail-daerah').style.display = 'none'; }