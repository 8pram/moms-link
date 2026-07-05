/**
 * MOMS-LINK - Application Logic (Vanilla JS)
 */

// --- 1. STATE MANAGEMENT ---
const state = {
    role: null, // 'rsud' or 'bidan' or 'dinkes' or 'superadmin'
    view: 'login',  // 'login', 'list', 'detail', 'form'
    records: [],   // All raw records from Google Sheet
    patients: [],  // Grouped by No RM
    selectedRm: null,
    searchQuery: '',
    filterDate: '',
    filterStatus: '',
    currentPage: 1,
    itemsPerPage: 10,
    formData: {},
    isSubmitting: false,
    isLoading: true
};

const scriptURL = 'https://script.google.com/macros/s/AKfycbxb2l_akdbIaN5SHf0oZonmyasqKiHeBdYZC7K3fTryaXsYZA8xRkqofH8BuhEKbdk16Q/exec';

const emptyForm = {
    id: null, no: '', nama_pasien: '', tgl_lahir: '', no_register: '', jenis_kelamin: '', tgl_kunjungan_rs: '', umur_bayi: '', kelainan_kongenital: '',
    umur_kehamilan: '', bb_lahir: '', hamil_ke: '', jenis_kehamilan: '', cara_lahir: '', indikasi_ibu: '', apgar_score: '', mendapat_resusitasi: '',
    status_rujukan: '', nama_faskes_rujukan: '', diagnosa_rujukan: '', terapi_infus: false, terapi_antibiotik: false, terapi_obat_kejang: false, terapi_nihil: false, terapi_lain: '',
    diagnosa_awal: '', diagnosa_akhir: '', alat_tpeace: false, alat_o2nasal: false, alat_cpap: false, alat_venti: false, alat_nihil: false,
    minum: '', imunisasi: '', cairan_parenteral: '', pmk: '', kondisi_krs: '',
    tgl_kunjungan_bidan: '', bb_kunjungan: '', pb_kunjungan: '', keadaan_umum: '', suhu: '', nadi: '', pernafasan: '',
    kemampuan_menyusu: '', kemampuan_ibu_menyusui: '', pelaksanaan_pmk: '', tanda_kegawatan: '', tindakan_kegawatan: '', hasil: '', kontrol: '',
    foto_rs_1: '', foto_rs_1_name: '', foto_rs_1_type: '',
    foto_rs_2: '', foto_rs_2_name: '', foto_rs_2_type: '',
    foto_bidan_1: '', foto_bidan_1_name: '', foto_bidan_1_type: '',
    foto_bidan_2: '', foto_bidan_2_name: '', foto_bidan_2_type: '',
    nama_petugas_rs: '', kontak_petugas_rs: '', nama_bidan: '', kontak_bidan: ''
};

// --- 2. UTILITY FUNCTIONS ---
function updateState(newState) {
    Object.assign(state, newState);
    renderApp();
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}-${month}-${year}, ${hours}:${minutes} WIB`;
}

function formatForDateTimeInput(dateStr) {
    if (!dateStr) return '';
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatForDateInput(dateStr) {
    if (!dateStr) return '';
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function handleInput(field, value, isCheckbox = false) {
    state.formData[field] = isCheckbox ? value === true : value;

    if (field === 'terapi_nihil' && value) {
        state.formData.terapi_infus = false;
        state.formData.terapi_antibiotik = false;
        state.formData.terapi_obat_kejang = false;
        if(document.getElementById('terapi_infus')) document.getElementById('terapi_infus').checked = false;
        if(document.getElementById('terapi_antibiotik')) document.getElementById('terapi_antibiotik').checked = false;
        if(document.getElementById('terapi_obat_kejang')) document.getElementById('terapi_obat_kejang').checked = false;
    } else if ((field === 'terapi_infus' || field === 'terapi_antibiotik' || field === 'terapi_obat_kejang') && value) {
        state.formData.terapi_nihil = false;
        if(document.getElementById('terapi_nihil')) document.getElementById('terapi_nihil').checked = false;
    }

    if (field === 'alat_nihil' && value) {
        state.formData.alat_tpeace = false;
        state.formData.alat_o2nasal = false;
        state.formData.alat_cpap = false;
        state.formData.alat_venti = false;
        if(document.getElementById('alat_tpeace')) document.getElementById('alat_tpeace').checked = false;
        if(document.getElementById('alat_o2nasal')) document.getElementById('alat_o2nasal').checked = false;
        if(document.getElementById('alat_cpap')) document.getElementById('alat_cpap').checked = false;
        if(document.getElementById('alat_venti')) document.getElementById('alat_venti').checked = false;
    } else if ((field === 'alat_tpeace' || field === 'alat_o2nasal' || field === 'alat_cpap' || field === 'alat_venti') && value) {
        state.formData.alat_nihil = false;
        if(document.getElementById('alat_nihil')) document.getElementById('alat_nihil').checked = false;
    }
    if (field === 'tgl_lahir' || field === 'tgl_kunjungan_rs') {
        if (state.formData.tgl_lahir) {
            const tglLahir = new Date(state.formData.tgl_lahir);
            const tglKunjungan = state.formData.tgl_kunjungan_rs ? new Date(state.formData.tgl_kunjungan_rs) : new Date();
            if (!isNaN(tglLahir) && !isNaN(tglKunjungan)) {
                let diffTime = tglKunjungan.getTime() - tglLahir.getTime();
                if (diffTime < 0) diffTime = 0;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                let umurStr = '';
                if (diffDays === 0) umurStr = '0 Hari';
                else if (diffDays < 30) umurStr = `${diffDays} Hari`;
                else {
                    const months = Math.floor(diffDays / 30);
                    const days = diffDays % 30;
                    umurStr = `${months} Bulan ${days > 0 ? days + ' Hari' : ''}`;
                }
                
                state.formData.umur_bayi = umurStr;
                const umurInput = document.getElementById('umur_bayi');
                if (umurInput) umurInput.value = umurStr;
            }
        }
    }
}

// Multi-File Upload Handler
window.handleFileUpload = function(event, fieldPrefix) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran file terlalu besar! Maksimal 5MB.");
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64String = e.target.result.split(',')[1];
        
        state.formData[fieldPrefix] = base64String;
        state.formData[fieldPrefix + '_name'] = file.name;
        state.formData[fieldPrefix + '_type'] = file.type;
        
        const previewEl = document.getElementById(`preview-${fieldPrefix}`);
        const uploadBoxEl = document.getElementById(`box-${fieldPrefix}`);
        if (previewEl && uploadBoxEl) {
            previewEl.src = e.target.result;
            uploadBoxEl.classList.add('has-file');
        }
    };
    reader.readAsDataURL(file);
};

// Group records by No RM
function processRecords(rawRecords) {
    state.records = rawRecords;
    const grouped = {};
    
    // Sort chronological (oldest first for correct grouping, though id is usually chronological)
    const sorted = [...rawRecords].sort((a, b) => a.id - b.id);
    
    sorted.forEach(record => {
        if (!grouped[record.no]) {
            grouped[record.no] = {
                no: record.no,
                nama_pasien: record.nama_pasien,
                tgl_lahir: record.tgl_lahir,
                latest_krs: record.tgl_kunjungan_rs,
                latest_diagnosa: record.diagnosa_akhir,
                history: []
            };
        }
        grouped[record.no].history.push(record);
        // Update latest info
        if (record.tgl_kunjungan_rs) grouped[record.no].latest_krs = record.tgl_kunjungan_rs;
        if (record.diagnosa_akhir) grouped[record.no].latest_diagnosa = record.diagnosa_akhir;
    });
    
    state.patients = Object.values(grouped).sort((a, b) => {
        // Sort patients by their latest activity
        const lastA = a.history[a.history.length-1].id;
        const lastB = b.history[b.history.length-1].id;
        return lastB - lastA; // descending
    });
}

// --- 3. RENDERERS ---

function renderLogin() {
    return `
        <div class="login-container fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem; color: var(--text-main);">Selamat Datang</h1>
                <p style="color: var(--text-secondary); font-size: 1.1rem;">Silakan pilih peran Anda untuk masuk ke sistem MOMS-LINK</p>
            </div>
            <div class="role-cards" style="display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; max-width: 800px;">
                <button class="btn-role rsud" style="padding: 1.5rem 2rem; font-size: 1.2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border-radius: 12px;" onclick="updateState({role: 'rsud', view: 'list', currentPage: 1})">
                    <span style="font-size: 2rem;">🏥</span> Admin Faskes / RS
                </button>
                <button class="btn-role bidan" style="padding: 1.5rem 2rem; font-size: 1.2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border-radius: 12px;" onclick="updateState({role: 'bidan', view: 'list', currentPage: 1})">
                    <span style="font-size: 2rem;">🌸</span> Bidan Pemantau
                </button>
                <button class="btn-role dinkes" style="padding: 1.5rem 2rem; font-size: 1.2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border-radius: 12px;" onclick="updateState({role: 'dinkes', view: 'list', currentPage: 1})">
                    <span style="font-size: 2rem;">👁️</span> Pengawas (Dinkes)
                </button>
                <button class="btn-role superadmin" style="padding: 1.5rem 2rem; font-size: 1.2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border-radius: 12px;" onclick="loginSuperAdmin()">
                    <span style="font-size: 2rem;">🛡️</span> Superadmin
                </button>
            </div>
        </div>
    `;
}

function renderHeader() {
    let roleText = '';
    if(state.role === 'rsud') roleText = '🏥 Admin Faskes / RS';
    else if(state.role === 'bidan') roleText = '🌸 Bidan Pemantau';
    else if(state.role === 'dinkes') roleText = '👁️ Pengawas (Dinkes)';
    else if(state.role === 'superadmin') roleText = '🛡️ Superadmin';

    return `
        <div class="app-header fade-in">
            <div class="header-title">
                <h1>Sistem Terintegrasi <span class="${state.role}">MOMS-LINK</span></h1>
                <p>Midwifery Online Monitoring System - Link</p>
                <div id="live-clock" style="font-size: 0.85rem; font-weight: 600; color: var(--text-tertiary); margin-top: 0.35rem; display: flex; align-items: center; gap: 0.25rem;">
                    ⏱️ --
                </div>
            </div>
            <div class="role-switcher" style="justify-content: flex-end; gap: 1rem;">
                <span style="font-weight: 500; color: var(--text-secondary); display: flex; align-items: center;">
                    Login sebagai: <span style="color: var(--text-main); font-weight: 700; margin-left: 0.5rem; padding: 0.25rem 0.75rem; background: var(--bg-main); border-radius: 20px; border: 1px solid var(--border-color);">${roleText}</span>
                </span>
                <button class="btn-role" onclick="exitApp()" style="color: #ef4444; border: 1px solid #ef4444; background: rgba(239,68,68,0.1);">
                    🚪 Keluar
                </button>
            </div>
        </div>
    `;
}

function renderList() {
    let filtered = state.patients.filter(p => 
        p.nama_pasien.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
        p.no.toLowerCase().includes(state.searchQuery.toLowerCase())
    );
    
    if (state.filterDate) {
        filtered = filtered.filter(p => {
            return p.latest_krs === state.filterDate || p.history.some(h => h.tgl_kunjungan_bidan === state.filterDate || h.tgl_kunjungan_rs === state.filterDate);
        });
    }

    if (state.filterStatus === 'dipantau') {
        filtered = filtered.filter(p => p.history.some(h => h.tgl_kunjungan_bidan));
    } else if (state.filterStatus === 'menunggu') {
        filtered = filtered.filter(p => !p.history.some(h => h.tgl_kunjungan_bidan));
    }
    
    const totalPages = Math.ceil(filtered.length / state.itemsPerPage);
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const currentData = filtered.slice(startIndex, startIndex + state.itemsPerPage);

    let tableRows = '';
    if (currentData.length > 0) {
        currentData.forEach(row => {
            const hasBidanVisit = row.history.some(h => h.tgl_kunjungan_bidan);
            const statusBadge = hasBidanVisit 
                ? `<span class="badge-status success">✓ Telah Dipantau</span>` 
                : `<span class="badge-status warning">⏳ Menunggu Pemantauan</span>`;
            
            const lastRecord = row.history[row.history.length - 1];
            let perkembangan = '-';
            if (lastRecord.tgl_kunjungan_bidan) {
                perkembangan = `Pantau Bidan: ${lastRecord.hasil || 'Dipantau'}`;
            } else if (lastRecord.tgl_kunjungan_rs) {
                let kondisi = lastRecord.kondisi_krs || 'Selesai Rawat';
                perkembangan = `RSUD: ${kondisi}`;
            } else {
                perkembangan = 'Baru';
            }
            
            let tglLahirText = formatDateTime(row.tgl_lahir);
            if (lastRecord.umur_bayi) {
                tglLahirText += ` <span style="color: var(--text-secondary); font-size: 0.8rem; font-weight: 500;">(${lastRecord.umur_bayi})</span>`;
            }

            tableRows += `
                <tr onclick="viewPatient('${row.no}')" style="cursor: pointer;" title="Klik untuk melihat riwayat lengkap">
                    <td class="font-medium">${row.no}</td>
                    <td>${row.nama_pasien}</td>
                    <td>${tglLahirText}</td>
                    <td><span class="badge">${perkembangan}</span></td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn-action ${state.role}" onclick="event.stopPropagation(); viewPatient('${row.no}')">
                            Lihat Riwayat
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-secondary);">Tidak ada data pasien.</td></tr>`;
    }

    const newBtn = state.role === 'rsud' 
        ? `<button class="btn-primary" onclick="newPatient()">+ Entry Pasien Baru</button>`
        : '';

    const paginationHTML = totalPages > 1 ? `
        <div class="pagination">
            <span>Halaman ${state.currentPage} dari ${totalPages || 1}</span>
            <div class="pagination-controls">
                <button class="btn-page" ${state.currentPage === 1 ? 'disabled' : ''} onclick="updateState({currentPage: ${state.currentPage - 1}})">Sebelumnya</button>
                <button class="btn-page" ${state.currentPage >= totalPages ? 'disabled' : ''} onclick="updateState({currentPage: ${state.currentPage + 1}})">Selanjutnya</button>
            </div>
        </div>
    ` : '';

    return `
        <div class="fade-in">
            <div class="table-container">
                <div class="toolbar">
                    <div class="search-box">
                        <span class="search-icon">🔍</span>
                        <input type="text" placeholder="Cari No RM / Nama Pasien..." value="${state.searchQuery}" oninput="updateState({searchQuery: this.value, currentPage: 1})">
                    </div>
                    <div class="filter-box">
                        <input type="date" class="form-input filter-input" value="${state.filterDate || ''}" onchange="updateState({filterDate: this.value, currentPage: 1})" title="Filter Tanggal">
                        <select class="form-select filter-select" onchange="updateState({filterStatus: this.value, currentPage: 1})">
                            <option value="">Semua Status</option>
                            <option value="dipantau" ${state.filterStatus === 'dipantau' ? 'selected' : ''}>Telah Dipantau</option>
                            <option value="menunggu" ${state.filterStatus === 'menunggu' ? 'selected' : ''}>Menunggu Pemantauan</option>
                        </select>
                    </div>
                    ${newBtn}
                </div>
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>No RM</th>
                            <th>Nama Pasien</th>
                            <th>Tgl Lahir</th>
                            <th>Kondisi Terakhir</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
            ${paginationHTML}
        </div>
    `;
}

function renderPatientDetail() {
    const patient = state.patients.find(p => p.no === state.selectedRm);
    if (!patient) return '';

    let timelineHTML = '';
    
    patient.history.forEach((h, idx) => {
        // Determine if it's RSUD admission or Bidan visit
        const isRsud = h.tgl_kunjungan_rs && !h.tgl_kunjungan_bidan;
        const isBidan = !!h.tgl_kunjungan_bidan;
        
        let headerClass = isRsud ? 'theme-blue' : (isBidan ? 'theme-pink' : 'theme-gray');
        let iconClass = isRsud ? 'rsud' : (isBidan ? 'bidan' : 'gray');
        let title = isRsud ? `🏥 Rawat Inap RSUD (${formatDateTime(h.tgl_kunjungan_rs)})` : `🌸 Pemantauan Bidan (${formatDateTime(h.tgl_kunjungan_bidan)})`;
        if (h.tgl_kunjungan_rs && h.tgl_kunjungan_bidan) {
            title = `🏥 Rawat Inap & Pemantauan (${formatDateTime(h.tgl_kunjungan_rs)})`;
        }
        
        let rsudSection = '';
        if (h.tgl_kunjungan_rs) {
            let terapiList = [];
            if(h.terapi_infus) terapiList.push('Infus');
            if(h.terapi_antibiotik) terapiList.push('Antibiotik');
            if(h.terapi_obat_kejang) terapiList.push('Obat Kejang');
            if(h.terapi_lain) terapiList.push(h.terapi_lain);
            let terapiText = terapiList.length > 0 ? terapiList.join(', ') : 'Nihil / Tidak Ada';

            rsudSection = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div><strong>Tgl & Jam Masuk:</strong> ${formatDateTime(h.tgl_kunjungan_rs)}</div>
                    <div><strong>Kelahiran:</strong> ${h.cara_lahir || '-'}, BB: ${h.bb_lahir || '-'}g, UK: ${h.umur_kehamilan || '-'} mgg</div>
                    <div><strong>Diagnosa Awal:</strong> ${h.diagnosa_awal || '-'}</div>
                    <div><strong>Diagnosa Akhir:</strong> ${h.diagnosa_akhir || '-'}</div>
                    <div><strong>Tindakan / Terapi (Tahap 1-4):</strong> ${terapiText}</div>
                    <div><strong>Rujukan:</strong> ${h.status_rujukan || '-'} ${h.nama_faskes_rujukan ? `(${h.nama_faskes_rujukan})` : ''} ${h.diagnosa_rujukan ? `[${h.diagnosa_rujukan}]` : ''}</div>
                    <div><strong>Tindakan Lanjutan (KRS):</strong> <span class="badge ${h.kondisi_krs && h.kondisi_krs.includes('MENINGGAL') ? 'warning' : 'success'}">${h.kondisi_krs || '-'}</span></div>
                    <div style="grid-column: 1 / -1;"><strong>Tindakan Lainnya:</strong> PMK: ${h.pmk || '-'} | Minum: ${h.minum || '-'} | Imunisasi: ${h.imunisasi || '-'}</div>
                </div>
            `;
            if (h.foto_rs_1 || h.foto_rs_2) {
                rsudSection += `<div style="display:flex; gap: 1rem; margin-top: 1rem; margin-bottom: 1rem;">`;
                if(h.foto_rs_1) rsudSection += `<img src="${h.foto_rs_1}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid #ccc; cursor:pointer;" onclick="window.open('${h.foto_rs_1}')">`;
                if(h.foto_rs_2) rsudSection += `<img src="${h.foto_rs_2}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid #ccc; cursor:pointer;" onclick="window.open('${h.foto_rs_2}')">`;
                rsudSection += `</div>`;
            }
            if (h.nama_petugas_rs || h.kontak_petugas_rs) {
                let waLink = h.kontak_petugas_rs ? h.kontak_petugas_rs.replace(/^0/, '62').replace(/\D/g, '') : '';
                let waBtn = waLink ? `<a href="https://wa.me/${waLink}" target="_blank" class="btn-wa">💬 Hubungi via WA</a>` : '';
                rsudSection += `
                    <div class="contact-card rsud" style="margin-bottom: 1rem;">
                        <div><span class="contact-label">👤 Petugas RS:</span> ${h.nama_petugas_rs || '-'}</div>
                        ${waBtn}
                    </div>
                `;
            }
        }

        let bidanSection = '';
        if (h.tgl_kunjungan_bidan) {
            bidanSection = `
                <div style="${h.tgl_kunjungan_rs ? 'border-top: 1px dashed #ccc; padding-top: 1rem; margin-top: 0.5rem;' : ''}">
                    <h4 style="color: var(--bidan-primary); margin-bottom: 1rem;">🌸 Data Lanjutan (Tahap 5: Pemantauan Bidan)</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div><strong>Tgl & Jam Pantau:</strong> ${formatDateTime(h.tgl_kunjungan_bidan)}</div>
                        <div><strong>Keadaan Umum:</strong> ${h.keadaan_umum || '-'}</div>
                        <div><strong>TTV:</strong> Suhu: ${h.suhu || '-'}°C, Nadi: ${h.nadi || '-'}, RR: ${h.pernafasan || '-'}</div>
                        <div><strong>Pertumbuhan:</strong> BB: ${h.bb_kunjungan || '-'}g, PB: ${h.pb_kunjungan || '-'}cm</div>
                        <div><strong>Menyusu (Bayi/Ibu):</strong> ${h.kemampuan_menyusu || '-'} / ${h.kemampuan_ibu_menyusui || '-'}</div>
                        <div><strong>Tanda Kegawatan:</strong> ${h.tanda_kegawatan || '-'} (Tindakan: ${h.tindakan_kegawatan || '-'})</div>
                        <div><strong>Hasil / Tindakan Lanjutan:</strong> <span class="badge ${h.hasil && (h.hasil.includes('RUJUK') || h.hasil.includes('MENINGGAL')) ? 'warning' : 'success'}">${h.hasil || '-'}</span></div>
                        <div><strong>Kontrol Selanjutnya:</strong> ${h.kontrol || '-'}</div>
                    </div>
                </div>
            `;
            if (h.foto_bidan_1 || h.foto_bidan_2) {
                bidanSection += `<div style="display:flex; gap: 1rem; margin-top: 1rem;">`;
                if(h.foto_bidan_1) bidanSection += `<img src="${h.foto_bidan_1}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid #ccc; cursor:pointer;" onclick="window.open('${h.foto_bidan_1}')">`;
                if(h.foto_bidan_2) bidanSection += `<img src="${h.foto_bidan_2}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid #ccc; cursor:pointer;" onclick="window.open('${h.foto_bidan_2}')">`;
                bidanSection += `</div>`;
            }
            if (h.nama_bidan || h.kontak_bidan) {
                let waLink = h.kontak_bidan ? h.kontak_bidan.replace(/^0/, '62').replace(/\D/g, '') : '';
                let waBtn = waLink ? `<a href="https://wa.me/${waLink}" target="_blank" class="btn-wa">💬 Hubungi via WA</a>` : '';
                bidanSection += `
                    <div class="contact-card bidan" style="margin-top: 1rem;">
                        <div><span class="contact-label">🌸 Bidan Pemantau:</span> ${h.nama_bidan || '-'}</div>
                        ${waBtn}
                    </div>
                `;
            }
        }

        let content = rsudSection + bidanSection;

        timelineHTML += `
            <div class="timeline-item fade-in" style="animation-delay: ${idx * 0.1}s">
                <div class="timeline-dot ${iconClass}"></div>
                <div class="timeline-content" style="border-left: 4px solid var(--${iconClass}-primary);">
                    <div class="timeline-header">
                        <span class="timeline-title">${title}</span>
                        <button class="btn-action ${iconClass}" onclick="editRecord(${h.id})">Edit</button>
                    </div>
                    ${content}
                </div>
            </div>
        `;
    });

    return `
        <div class="fade-in">
            <div class="form-header">
                <button class="btn-back" onclick="updateState({view: 'list', selectedRm: null})">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
                <h2 class="form-title">Rekam Medis: ${patient.nama_pasien} (${patient.no})</h2>
            </div>

            <div class="form-actions" style="justify-content: flex-start; padding: 0 0 1rem 0;">
                ${state.role === 'rsud' ? `<button class="btn-primary" style="background-color: var(--rsud-primary);" onclick="addControl('rsud')">+ Kontrol RSUD</button>` : ''}
                ${state.role === 'bidan' ? `<button class="btn-primary" style="background-color: var(--bidan-primary);" onclick="addControl('bidan')">+ Tambah Pemantauan (Tahap 5)</button>` : ''}
            </div>

            <div class="timeline-container">
                <div class="timeline">
                    ${timelineHTML}
                </div>
            </div>
        </div>
    `;
}

function createInput(label, id, type = 'text', value, options = null, disabled = false, placeholder = '') {
    const disabledAttr = disabled ? 'disabled' : '';
    let inputHTML = '';
    if (options) {
        let opts = `<option value="" disabled ${!value ? 'selected' : ''}>Pilih...</option>`;
        options.forEach(opt => {
            const isSelected = value === opt ? 'selected' : '';
            opts += `<option value="${opt}" ${isSelected}>${opt}</option>`;
        });
        inputHTML = `<select class="form-select" id="${id}" ${disabledAttr} onchange="handleInput('${id}', this.value)">${opts}</select>`;
    } else if (type === 'textarea') {
        const valAttr = value || '';
        inputHTML = `<textarea class="form-input" id="${id}" placeholder="${placeholder}" ${disabledAttr} onchange="handleInput('${id}', this.value)" rows="5" style="resize: vertical; font-family: inherit;">${valAttr}</textarea>`;
    } else {
        const valAttr = value ? `value="${value}"` : '';
        inputHTML = `<input class="form-input" type="${type}" id="${id}" ${valAttr} placeholder="${placeholder}" ${disabledAttr} onchange="handleInput('${id}', this.value)">`;
    }
    const wrapperClass = type === 'textarea' ? 'form-group col-span-full' : 'form-group';
    return `<div class="${wrapperClass}"><label class="form-label">${label}</label>${inputHTML}</div>`;
}

function createCheckbox(label, id, checked, disabled = false) {
    const disabledClass = disabled ? 'disabled' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const checkedAttr = checked ? 'checked' : '';
    return `
        <label class="checkbox-label ${disabledClass}">
            <input type="checkbox" id="${id}" ${checkedAttr} ${disabledAttr} onchange="handleInput('${id}', this.checked, true)">
            <span class="checkbox-text">${label}</span>
        </label>
    `;
}

function createUploadBox(fieldPrefix, disabled) {
    const f = state.formData;
    const value = f[fieldPrefix];
    const hasFile = value || f[fieldPrefix+'_name'];
    
    return `
        <div class="upload-area ${hasFile ? 'has-file' : ''}" id="box-${fieldPrefix}">
            <input type="file" accept="image/*" class="file-input" ${disabled ? 'disabled' : ''} onchange="handleFileUpload(event, '${fieldPrefix}')">
            <div class="upload-placeholder">
                <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <p>Klik / Drag Foto</p>
            </div>
            <div class="upload-preview">
                <img id="preview-${fieldPrefix}" src="${value ? (value.startsWith('http') ? value : 'data:image/jpeg;base64,' + value) : ''}" alt="Preview Foto">
                ${!disabled ? `<div class="change-overlay" onclick="document.querySelector('#box-${fieldPrefix} .file-input').click()">Ganti</div>` : ''}
            </div>
        </div>
        ${value && value.startsWith('http') ? `<div style="font-size: 0.75rem; text-align:center; margin-top: 4px;"><a href="${value}" target="_blank">Lihat Asli</a></div>` : ''}
    `;
}

function renderForm() {
    const isBidan = state.role === 'bidan';
    const isDinkes = state.role === 'dinkes';
    
    const lockRsudFields = state.role === 'bidan' || state.role === 'dinkes';
    const lockBidanFields = state.role === 'rsud' || state.role === 'dinkes';
    const f = state.formData;

    const isNew = !f.id;
    const title = isNew ? 'Input Riwayat Baru' : 'Edit Riwayat Medis';

    return `
        <div class="fade-in">
            <div class="form-header">
                <button class="btn-back" onclick="updateState({view: state.selectedRm ? 'detail' : 'list'})">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
                <h2 class="form-title">${title}</h2>
            </div>

            <form onsubmit="submitForm(event)">
                <!-- SECTION RSUD (1-4) -->
                <div class="${lockRsudFields ? 'readonly-section' : ''}">
                    <!-- TAHAP 1 -->
                    <div class="form-card">
                        <div class="card-header ${lockRsudFields ? 'theme-gray' : 'theme-blue'}">📋 1. Identitas Pasien & Register (RSUD)</div>
                        <div class="card-body">
                            ${createInput('No. Urut / RM', 'no', 'text', f.no, null, lockRsudFields || f.no !== '', 'Nomor urut...')}
                            ${createInput('Nama Pasien Bayi', 'nama_pasien', 'text', f.nama_pasien, null, lockRsudFields, 'Nama lengkap...')}
                            ${createInput('Tanggal Lahir', 'tgl_lahir', 'date', formatForDateInput(f.tgl_lahir), null, lockRsudFields)}
                            ${createInput('No. Register', 'no_register', 'text', f.no_register, null, lockRsudFields, 'Nomor Register...')}
                            ${createInput('Jenis Kelamin', 'jenis_kelamin', 'text', f.jenis_kelamin, ['Perempuan (P)', 'Laki-laki (L)'], lockRsudFields)}
                            ${createInput('Umur Bayi', 'umur_bayi', 'text', f.umur_bayi, null, lockRsudFields, 'Dalam hari/bulan...')}
                            ${createInput('Tanggal & Jam Kunjungan ke RS', 'tgl_kunjungan_rs', 'datetime-local', formatForDateTimeInput(f.tgl_kunjungan_rs), null, lockRsudFields)}
                            ${createInput('Kelainan Kongenital', 'kelainan_kongenital', 'text', f.kelainan_kongenital, null, lockRsudFields, 'Ada/Tidak, sebutkan...')}
                        </div>
                    </div>

                    <!-- TAHAP 2 -->
                    <div class="form-card">
                        <div class="card-header ${lockRsudFields ? 'theme-gray' : 'theme-blue'}">👶 2. Riwayat Kehamilan & Persalinan</div>
                        <div class="card-body">
                            ${createInput('Umur Kehamilan (Minggu)', 'umur_kehamilan', 'text', f.umur_kehamilan, ['< 28', '28 - <32', '32 - <34', '34 - <37', '> 37'], lockRsudFields)}
                            ${createInput('Berat Badan Lahir (Gram)', 'bb_lahir', 'text', f.bb_lahir, ['< 1000', '>1000 - 1500', '>1500 - 2000', '>2000 - 2500', '> 2500'], lockRsudFields)}
                            ${createInput('Hamil Ke-', 'hamil_ke', 'number', f.hamil_ke, null, lockRsudFields, '1, 2, 3...')}
                            ${createInput('Jenis Kehamilan', 'jenis_kehamilan', 'text', f.jenis_kehamilan, ['Tunggal', 'Ganda'], lockRsudFields)}
                            ${createInput('Cara Lahir', 'cara_lahir', 'text', f.cara_lahir, ['SPT', 'VACUM', 'FORCEP', 'SC', 'LAIN-LAIN'], lockRsudFields)}
                            ${createInput('Indikasi Ibu', 'indikasi_ibu', 'text', f.indikasi_ibu, null, lockRsudFields, 'Indikasi...')}
                            ${createInput('Apgar Score', 'apgar_score', 'text', f.apgar_score, null, lockRsudFields, 'Contoh: 8/9')}
                            ${createInput('Mendapat Resusitasi', 'mendapat_resusitasi', 'text', f.mendapat_resusitasi, ['YA', 'TIDAK'], lockRsudFields)}
                        </div>
                    </div>

                    <!-- TAHAP 3 -->
                    <div class="form-card">
                        <div class="card-header ${lockRsudFields ? 'theme-gray' : 'theme-blue'}">🚑 3. Data & Terapi Pra-Rujukan</div>
                        <div class="card-body">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                ${createInput('Status Rujukan Dari', 'status_rujukan', 'text', f.status_rujukan, ['PKM', 'BPM', 'RS', 'KLINIK', 'DTS', 'LAINNYA'], lockRsudFields)}
                                ${createInput('Nama Lokasi / Faskes', 'nama_faskes_rujukan', 'text', f.nama_faskes_rujukan, null, lockRsudFields, 'Ketik nama faskes...')}
                            </div>
                            ${createInput('Diagnosa Rujukan', 'diagnosa_rujukan', 'textarea', f.diagnosa_rujukan, null, lockRsudFields, 'Diagnosa...')}
                            
                            <div class="form-group col-span-full">
                                <label class="form-label">Terapi Pra Rujukan Diberikan:</label>
                                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                                    ${createCheckbox('Infus', 'terapi_infus', f.terapi_infus, lockRsudFields)}
                                    ${createCheckbox('Antibiotik', 'terapi_antibiotik', f.terapi_antibiotik, lockRsudFields)}
                                    ${createCheckbox('Obat Kejang', 'terapi_obat_kejang', f.terapi_obat_kejang, lockRsudFields)}
                                    ${createCheckbox('Nihil / Tidak Ada', 'terapi_nihil', f.terapi_nihil, lockRsudFields)}
                                </div>
                            </div>
                            ${createInput('Obat Lainnya', 'terapi_lain', 'textarea', f.terapi_lain, null, lockRsudFields, 'Obat Lain...')}
                        </div>
                    </div>

                    <!-- TAHAP 4 -->
                    <div class="form-card">
                        <div class="card-header ${lockRsudFields ? 'theme-gray' : 'theme-blue'}">🏥 4. Intervensi & Keluar RSUD</div>
                        <div class="card-body">
                            ${createInput('Diagnosa Awal (RSUD)', 'diagnosa_awal', 'textarea', f.diagnosa_awal, null, lockRsudFields)}
                            ${createInput('Diagnosa Akhir (Ruang Rawat)', 'diagnosa_akhir', 'textarea', f.diagnosa_akhir, null, lockRsudFields)}
                            
                            <div class="form-group col-span-full">
                                <label class="form-label">Terpasang Alat:</label>
                                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                                    ${createCheckbox('T-Peace', 'alat_tpeace', f.alat_tpeace, lockRsudFields)}
                                    ${createCheckbox('O2 Nasal', 'alat_o2nasal', f.alat_o2nasal, lockRsudFields)}
                                    ${createCheckbox('CPAP/NIV', 'alat_cpap', f.alat_cpap, lockRsudFields)}
                                    ${createCheckbox('Venti', 'alat_venti', f.alat_venti, lockRsudFields)}
                                    ${createCheckbox('Nihil / Tidak Ada', 'alat_nihil', f.alat_nihil, lockRsudFields)}
                                </div>
                            </div>
                            
                            ${createInput('Minum', 'minum', 'text', f.minum, ['ASI', 'SUFOR'], lockRsudFields)}
                            ${createInput('Imunisasi', 'imunisasi', 'text', f.imunisasi, ['HB 0', 'HIPERHEP'], lockRsudFields)}
                            ${createInput('Cairan Parenteral', 'cairan_parenteral', 'text', f.cairan_parenteral, ['TPN', 'TRANFUSI'], lockRsudFields)}
                            ${createInput('PMK (Metode Kanguru)', 'pmk', 'text', f.pmk, ['YA', 'TIDAK'], lockRsudFields)}
                            
                            ${createInput('Kondisi Bayi KRS (Keluar RS)', 'kondisi_krs', 'text', f.kondisi_krs, ['HIDUP (<1000g)', 'HIDUP (>1000-1500g)', 'HIDUP (>1500-2000g)', 'HIDUP (>2000-2500g)', 'HIDUP (>2500g)', 'MENINGGAL (<1000g)', 'MENINGGAL (>1000-1500g)', 'MENINGGAL (>1500-2000g)', 'MENINGGAL (>2000-2500g)'], lockRsudFields)}

                            <div class="col-span-full border-top">
                                <label class="form-label mb-2 block">📷 Dokumentasi RSUD (Opsional)</label>
                                <div class="upload-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                    ${createUploadBox('foto_rs_1', lockRsudFields)}
                                    ${createUploadBox('foto_rs_2', lockRsudFields)}
                                </div>
                            </div>
                            
                            <div class="col-span-full border-top">
                                <label class="form-label mb-2 block" style="color: var(--rsud-primary);">👤 Identitas Penginput (RSUD)</label>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                    ${createInput('Nama Petugas RS / Instansi', 'nama_petugas_rs', 'text', f.nama_petugas_rs, null, lockRsudFields, 'Nama Petugas...')}
                                    ${createInput('No. WhatsApp (Contoh: 081234...)', 'kontak_petugas_rs', 'text', f.kontak_petugas_rs, null, lockRsudFields, '08...')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECTION BIDAN (5) -->
                <div class="${lockBidanFields ? 'readonly-section' : 'highlight-section form-card'}">
                    <div class="form-card" style="margin-bottom:0; box-shadow:none; border:none;">
                        <div class="card-header ${lockBidanFields ? 'theme-gray' : 'theme-pink'}">🌸 Tahap 5: Pemantauan Bidan</div>
                        <div class="card-body">
                            ${createInput('Tanggal & Jam Kunjungan Bidan', 'tgl_kunjungan_bidan', 'datetime-local', formatForDateTimeInput(f.tgl_kunjungan_bidan), null, lockBidanFields)}
                            ${createInput('Berat Badan (Gram)', 'bb_kunjungan', 'number', f.bb_kunjungan, null, lockBidanFields, 'Gram...')}
                            ${createInput('Panjang Badan (Cm)', 'pb_kunjungan', 'number', f.pb_kunjungan, null, lockBidanFields, 'Cm...')}
                            ${createInput('Keadaan Umum', 'keadaan_umum', 'text', f.keadaan_umum, null, lockBidanFields)}
                            ${createInput('Suhu (°C)', 'suhu', 'number', f.suhu, null, lockBidanFields, '°C...')}
                            ${createInput('Nadi (x/mnt)', 'nadi', 'number', f.nadi, null, lockBidanFields)}
                            ${createInput('Pernafasan (x/mnt)', 'pernafasan', 'number', f.pernafasan, null, lockBidanFields)}
                            ${createInput('Kemampuan Bayi Menyusu', 'kemampuan_menyusu', 'text', f.kemampuan_menyusu, ['KUAT', 'LEMAH', 'TIDAK MAU'], lockBidanFields)}
                            ${createInput('Kemampuan Ibu Menyusui', 'kemampuan_ibu_menyusui', 'text', f.kemampuan_ibu_menyusui, ['BAIK', 'KURANG'], lockBidanFields)}
                            ${createInput('Pelaksanaan Metode Kanguru', 'pelaksanaan_pmk', 'text', f.pelaksanaan_pmk, ['YA', 'TIDAK'], lockBidanFields)}
                            ${createInput('Tanda Kegawatan Bayi', 'tanda_kegawatan', 'text', f.tanda_kegawatan, null, lockBidanFields)}
                            ${createInput('Tindakan Kegawatan', 'tindakan_kegawatan', 'text', f.tindakan_kegawatan, null, lockBidanFields)}
                            ${createInput('Hasil Pemantauan', 'hasil', 'text', f.hasil, ['MEMBAIK', 'RUJUK KEMBALI', 'MENINGGAL'], lockBidanFields)}
                            ${createInput('Jadwal Kontrol Selanjutnya', 'kontrol', 'text', f.kontrol, ['YA (Perlu)', 'TIDAK (Selesai)'], lockBidanFields)}
                            
                            <div class="col-span-full border-top">
                                <label class="form-label mb-2 block">📷 Dokumentasi Bidan (Opsional)</label>
                                <div class="upload-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                    ${createUploadBox('foto_bidan_1', lockBidanFields)}
                                    ${createUploadBox('foto_bidan_2', lockBidanFields)}
                                </div>
                            </div>

                            <div class="col-span-full border-top">
                                <label class="form-label mb-2 block" style="color: var(--bidan-primary);">👤 Identitas Bidan Pemantau</label>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                    ${createInput('Nama Bidan Pemantau', 'nama_bidan', 'text', f.nama_bidan, null, lockBidanFields, 'Nama Bidan...')}
                                    ${createInput('No. WhatsApp (Contoh: 081234...)', 'kontak_bidan', 'text', f.kontak_bidan, null, lockBidanFields, '08...')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-cancel" onclick="updateState({view: state.selectedRm ? 'detail' : 'list'})">Batal</button>
                    ${!isDinkes ? `<button type="submit" class="btn-submit ${state.role}" ${state.isSubmitting ? 'disabled' : ''}>💾 SIMPAN DATA</button>` : ''}
                </div>
            </form>
        </div>
    `;
}

// --- 5. EVENT HANDLERS ---
window.newPatient = function() {
    // Generate nomor RM otomatis, misal "RM-001"
    const nextNum = state.patients.length + 1;
    const generatedRM = "RM-" + String(nextNum).padStart(3, '0');
    
    updateState({ view: 'form', formData: { ...emptyForm, no: generatedRM }, selectedRm: null });
};

window.loginSuperAdmin = function() {
    const pwd = prompt("Masukkan password Superadmin:");
    if (pwd === "@Nox86") {
        updateState({ role: 'superadmin', view: 'list', currentPage: 1 });
    } else if (pwd !== null) {
        alert("Password salah!");
    }
};

window.exitApp = function() {
    if (confirm("Anda akan keluar aplikasi? Pastikan data sudah benar dan tersimpan")) {
        updateState({ role: null, view: 'login' });
    }
};

window.viewPatient = function(noRm) {
    updateState({ view: 'detail', selectedRm: noRm });
};

window.addControl = function(sourceRole) {
    // Cari pasien dari state.patients
    const patient = state.patients.find(p => p.no === state.selectedRm);
    // Kita copy identitas statis dari row terakhir
    const lastRecord = patient.history[patient.history.length - 1];
    
    // Set ID ke null agar menjadi baris baru (riwayat) di Sheets!
    const newForm = {
        ...emptyForm,
        no: lastRecord.no,
        nama_pasien: lastRecord.nama_pasien,
        tgl_lahir: lastRecord.tgl_lahir,
        jenis_kelamin: lastRecord.jenis_kelamin
    };

    updateState({ view: 'form', formData: newForm });
};

window.editRecord = function(id) {
    const record = state.records.find(r => r.id === id);
    if (record) {
        let formData = { ...record };
        if (!formData.nama_faskes_rujukan && formData.status_rujukan && formData.status_rujukan.includes(' - ')) {
            const parts = formData.status_rujukan.split(' - ');
            formData.status_rujukan = parts[0];
            formData.nama_faskes_rujukan = parts.slice(1).join(' - ');
        }
        updateState({ view: 'form', formData: formData });
    }
};

window.submitForm = async function(e) {
    e.preventDefault();
    
    // Validation
    const form = e.target;
    const inputs = form.querySelectorAll('input:not([type="file"]):not([disabled]):not([type="checkbox"]), select:not([disabled]), textarea:not([disabled])');
    const optionalFields = ['kelainan_kongenital', 'indikasi_ibu', 'diagnosa_rujukan', 'terapi_lain', 'tanda_kegawatan', 'tindakan_kegawatan'];
    let hasError = false;
    
    inputs.forEach(input => {
        input.classList.remove('error-blink');
        if (!optionalFields.includes(input.id) && !input.value.trim()) {
            hasError = true;
            input.classList.add('error-blink');
        }
    });
    
    if (hasError) {
        alert("⚠️ Terdapat data wajib yang belum diisi. Mohon periksa kolom yang berkedip merah.");
        return;
    }

    if (!confirm("Apakah data yang Anda input sudah benar?\n\nPilih 'OK/Simpan' untuk mengirim, atau 'Batal' untuk mengecek kembali.")) {
        return;
    }

    updateState({ isSubmitting: true });
    
    const payload = { ...state.formData };

    try {
        const response = await fetch(scriptURL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        const result = await response.json();

        if (result.status === 'success') {
            alert("✅ " + result.message);
            // Refresh data from server to ensure accuracy
            await loadData();
            updateState({ isSubmitting: false, view: state.selectedRm ? 'detail' : 'list' });
        } else {
            alert("❌ Terjadi kesalahan pada server: " + result.message);
            updateState({ isSubmitting: false });
        }
    } catch (error) {
        console.error("Error:", error);
        alert("❌ Gagal mengirim data. Pastikan koneksi internet Anda stabil.");
        updateState({ isSubmitting: false });
    }
};

// --- 6. INITIAL RENDER ---
async function loadData() {
    try {
        const res = await fetch(scriptURL);
        const json = await res.json();
        if(json.status === 'success') {
            processRecords(json.data);
        }
    } catch(e) {
        console.error('Failed to load data', e);
        // If it fails (CORS, offline), start empty
        processRecords([]);
    }
}

window.initApp = async function() {
    renderApp(); // Render loading state
    
    await loadData();
    updateState({ isLoading: false });

    // Hide splash screen
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => splash.style.display = 'none', 600);
    }
};

function renderApp() {
    const app = document.getElementById('app');
    
    if (state.isLoading) {
        app.innerHTML = `<div style="text-align:center; padding: 5rem; color: #666;">Sedang Memuat Data...</div>`;
        return;
    }

    let html = `<div class="container">`;
    if (state.view === 'login') {
        html += renderLogin();
    } else {
        html += renderHeader();
        if (state.view === 'list') {
            html += renderList();
        } else if (state.view === 'detail') {
            html += renderPatientDetail();
        } else {
            html += renderForm();
        }
    }
    
    html += `
        <div style="text-align: center; margin-top: 2rem; padding-bottom: 2rem; font-size: 0.8rem; color: var(--text-tertiary);">
            Ada Kendala Teknis atau Perlu Koreksi Data? Hubungi Super Admin | design by <a href="https://wa.me/6281233249944" target="_blank" style="color: inherit; text-decoration: underline; font-weight: 600;">nox86</a>
        </div>
    `;
    
    html += `</div>`;
    
    app.innerHTML = html;
}

function startClock() {
    setInterval(() => {
        const clockEl = document.getElementById('live-clock');
        if (clockEl) {
            const now = new Date();
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            
            const dayName = days[now.getDay()];
            const date = String(now.getDate()).padStart(2, '0');
            const monthName = months[now.getMonth()];
            const year = now.getFullYear();
            
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            
            clockEl.textContent = `⏱️ ${dayName}, ${date} ${monthName} ${year} | Pukul ${hours}:${minutes} WIB`;
        }
    }, 1000);
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    startClock();
});
