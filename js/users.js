/* =========================================================
   TAB 5: KELOLA SANDI PENGURUS DAERAH
========================================================= */
function renderUsersTable() {
    let tbody = document.getElementById('tbody-users');
    if (!tbody) return;
    tbody.innerHTML = rawUserData.length === 0 ? `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:12px;">Data sandi tidak ditemukan.</td></tr>` :
        rawUserData.map((u, idx) => `
            <tr>
                <td><b>Daerah ${u.daerah}</b></td>
                <td style="text-align:center;">
                    <div style="display:inline-flex; align-items:center; gap:4px;">
                        <input type="password" id="pass-val-${idx}" readonly value="${u.password}" style="background:#f1f5f9; border:1px solid var(--border); padding:6px 10px; border-radius:8px; font-weight:800; font-size:11px; width:95px; text-align:center; outline:none;">
                        <button onclick="togglePeekPass(${idx})" id="btn-peek-${idx}" title="Intip Sandi" style="background:#f1f5f9; border:1px solid var(--border); padding:6px 8px; border-radius:8px; font-size:11px; cursor:pointer;">👁️</button>
                    </div>
                </td>
                <td style="text-align:center;">
                    <button class="btn-act btn-dark" onclick="openPassModal('${u.daerah}','${u.password}')" style="padding:6px 12px; font-size:10px; margin:0 auto;">✏ Edit Sandi</button>
                </td>
            </tr>
        `).join('');
}

function togglePeekPass(idx) {
    let input = document.getElementById(`pass-val-${idx}`);
    let btn = document.getElementById(`btn-peek-${idx}`);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerText = '🙈';
    } else {
        input.type = 'password';
        btn.innerText = '👁️';
    }
}

function openPassModal(daerah, currentPass) {
    document.getElementById('modal-target-daerah').innerText = daerah;
    document.getElementById('input-new-pass').value = currentPass;
    document.getElementById('modal-pass').style.display = 'flex';
}

function closePassModal() { document.getElementById('modal-pass').style.display = 'none'; }

async function submitNewPassword() {
    let daerah = document.getElementById('modal-target-daerah').innerText;
    let newPass = document.getElementById('input-new-pass').value.trim();
    if (!newPass) return alert("Sandi tidak boleh kosong!");

    showToast("Mengirim...");
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updatePassword', daerah: daerah, newPassword: newPass })
        });
        showToast("✅ Sandi Diperbarui!");
        closePassModal();
        loadAllRealtimeData(true);
    } catch(e) { showToast("❌ Gagal!"); }
}
