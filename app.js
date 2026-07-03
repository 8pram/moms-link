/**
 * MOMS-LINK - Application Logic (Vanilla JS)
 */

// --- 1. STATE MANAGEMENT ---
const state = {
    role: 'bidan', // 'rsud' or 'bidan' or 'dinkes'
    view: 'list',  // 'list', 'detail', 'form'
    records: [],   // All raw records from Google Sheet
    patients: [],  // Grouped by No RM
    selectedRm: null,
    searchQuery: '',
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
    status_rujukan: '', diagnosa_rujukan: '', terapi_infus: false, terapi_antibiotik: false, terapi_obat_kejang: false, terapi_lain: '',
    diagnosa_awal: '', diagnosa_akhir: '', alat_tpeace: false, alat_o2nasal: false, alat_cpap: false, alat_venti: false,
    minum: '', imunisasi: '', cairan_parenteral: '', pmk: '', kondisi_krs: '',
    tgl_kunjungan_bidan: '', bb_kunjungan: '', pb_kunjungan: '', keadaan_umum: '', suhu: '', nadi: '', pernafasan: '',
    kemampuan_menyusu: '', kemampuan_ibu_menyusui: '', pelaksanaan_pmk: '', tanda_kegawatan: '', tindakan_kegawatan: '', hasil: '', kontrol: '',
    foto_rs_1: '', foto_rs_1_name: '', foto_rs_1_type: '',
    foto_rs_2: '', foto_rs_2_name: '', foto_rs_2_type: '',
    foto_bidan_1: '', foto_bidan_1_name: '', foto_bidan_1_type: '',
    foto_bidan_2: '', foto_bidan_2_name: '', foto_bidan_2_type: ''
};

// --- 2. UTILITY FUNCTIONS ---
function updateState(newState) {
    Object.assign(state, newState);
    renderApp();
}

function handleInput(field, value, isCheckbox = false) {
    state.formData[field] = isCheckbox ? value === true : value;
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

function renderHeader() {
    return `
        <div class="app-header fade-in">
            <div class="header-title">
                <h1>Sistem Terintegrasi <span class="${state.role}">MOMS-LINK</span></h1>
                <p>Midwifery Online Monitoring System - Link</p>
            </div>
            <div class="role-switcher">
                <span>Login sebagai ?</span>
                <button class="btn-role rsud ${state.role === 'rsud' ? 'active' : ''}" onclick="updateState({role: 'rsud', view: 'list', currentPage: 1})">
                    🏥 Admin Faskes / RS
                </button>
                <button class="btn-role bidan ${state.role === 'bidan' ? 'active' : ''}" onclick="updateState({role: 'bidan', view: 'list', currentPage: 1})">
                    🌸 Bidan Pemantau
                </button>
                <button class="btn-role dinkes ${state.role === 'dinkes' ? 'active' : ''}" onclick="updateState({role: 'dinkes', view: 'list', currentPage: 1})">
                    👁️ Pengawas (Dinkes)
                </button>
                <button class="btn-role superadmin ${state.role === 'superadmin' ? 'active' : ''}" onclick="loginSuperAdmin()">
                    🛡️ Superadmin
                </button>
                <button class="btn-role" onclick="exitApp()" style="color: #ef4444; margin-left: auto;">
                    🚪 Keluar
                </button>
            </div>
        </div>
    `;
}

function renderList() {
    const filtered = state.patients.filter(p => 
        p.nama_pasien.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
        p.no.toLowerCase().includes(state.searchQuery.toLowerCase())
    );
    
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
            
            tableRows += `
                <tr>
                    <td class="font-medium">${row.no}</td>
                    <td>${row.nama_pasien}</td>
                    <td>
                        <div>L: ${row.tgl_lahir}</div>
                        <div class="text-sm-gray">KRS Terakhir: ${row.latest_krs || '-'}</div>
                    </td>
                    <td><span class="badge">${row.latest_diagnosa || '-'}</span></td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn-action ${state.role}" onclick="viewPatient('${row.no}')">
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
                    ${newBtn}
                </div>
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>No RM</th>
                            <th>Nama Pasien</th>
                            <th>Tgl Lahir / KRS</th>
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
        let title = isRsud ? `🏥 Rawat Inap RSUD (${h.tgl_kunjungan_rs})` : `🌸 Pemantauan Bidan (${h.tgl_kunjungan_bidan})`;
        
        let content = '';
        if (isRsud) {
            content = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div><strong>Diagnosa Awal:</strong> ${h.diagnosa_awal}</div>
                    <div><strong>Diagnosa Akhir:</strong> ${h.diagnosa_akhir}</div>
                    <div><strong>Kondisi KRS:</strong> ${h.kondisi_krs}</div>
                    <div><strong>Tindakan:</strong> ${h.terapi_infus ? 'Infus, ' : ''}${h.terapi_antibiotik ? 'Antibiotik, ' : ''}${h.terapi_lain}</div>
                </div>
            `;
            if (h.foto_rs_1 || h.foto_rs_2) {
                content += `<div style="display:flex; gap: 1rem; margin-top: 1rem;">`;
                if(h.foto_rs_1) content += `<img src="${h.foto_rs_1}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid #ccc;">`;
                if(h.foto_rs_2) content += `<img src="${h.foto_rs_2}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid #ccc;">`;
                content += `</div>`;
            }
        } else {
            content = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div><strong>Keadaan Umum:</strong> ${h.keadaan_umum}</div>
                    <div><strong>BB / PB:</strong> ${h.bb_kunjungan}g / ${h.pb_kunjungan}cm</div>
                    <div><strong>Hasil:</strong> ${h.hasil}</div>
                    <div><strong>Kontrol Selanjutnya:</strong> ${h.kontrol}</div>
                </div>
            `;
            if (h.foto_bidan_1 || h.foto_bidan_2) {
                content += `<div style="display:flex; gap: 1rem; margin-top: 1rem;">`;
                if(h.foto_bidan_1) content += `<img src="${h.foto_bidan_1}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid #ccc;">`;
                if(h.foto_bidan_2) content += `<img src="${h.foto_bidan_2}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid #ccc;">`;
                content += `</div>`;
            }
        }

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

            <div class="timeline">
                ${timelineHTML}
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
    } else {
        const valAttr = value ? `value="${value}"` : '';
        inputHTML = `<input class="form-input" type="${type}" id="${id}" ${valAttr} placeholder="${placeholder}" ${disabledAttr} onchange="handleInput('${id}', this.value)">`;
    }
    return `<div class="form-group"><label class="form-label">${label}</label>${inputHTML}</div>`;
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
                    <div class="form-card">
                        <div class="card-header ${lockRsudFields ? 'theme-gray' : 'theme-blue'}">📋 1. Identitas & Kontrol RSUD</div>
                        <div class="card-body">
                            ${createInput('No. Urut / RM', 'no', 'text', f.no, null, lockRsudFields || f.no !== '')}
                            ${createInput('Nama Pasien Bayi', 'nama_pasien', 'text', f.nama_pasien, null, lockRsudFields)}
                            ${createInput('Tanggal Lahir', 'tgl_lahir', 'date', f.tgl_lahir, null, lockRsudFields)}
                            ${createInput('No. Register', 'no_register', 'text', f.no_register, null, lockRsudFields)}
                            ${createInput('Tgl Kunjungan RS', 'tgl_kunjungan_rs', 'date', f.tgl_kunjungan_rs, null, lockRsudFields)}
                            ${createInput('Umur Bayi', 'umur_bayi', 'text', f.umur_bayi, null, lockRsudFields)}
                        </div>
                    </div>

                    <div class="form-card">
                        <div class="card-header ${lockRsudFields ? 'theme-gray' : 'theme-blue'}">🏥 2. Klinis & Keluar RSUD</div>
                        <div class="card-body">
                            ${createInput('Diagnosa Awal', 'diagnosa_awal', 'text', f.diagnosa_awal, null, lockRsudFields)}
                            ${createInput('Diagnosa Akhir', 'diagnosa_akhir', 'text', f.diagnosa_akhir, null, lockRsudFields)}
                            ${createInput('Kondisi KRS', 'kondisi_krs', 'text', f.kondisi_krs, ['HIDUP (<1000g)', 'HIDUP (>1000-1500g)', 'HIDUP (>1500-2000g)', 'HIDUP (>2000-2500g)', 'HIDUP (>2500g)', 'MATI'], lockRsudFields)}
                            <div class="col-span-full border-top">
                                <label class="form-label mb-2 block">📷 Dokumentasi RSUD</label>
                                <div class="upload-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                    ${createUploadBox('foto_rs_1', lockRsudFields)}
                                    ${createUploadBox('foto_rs_2', lockRsudFields)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECTION BIDAN (5) -->
                <div class="${lockBidanFields ? 'readonly-section' : 'highlight-section form-card'}">
                    <div class="form-card" style="margin-bottom:0; box-shadow:none; border:none;">
                        <div class="card-header ${lockBidanFields ? 'theme-gray' : 'theme-pink'}">🌸 3. Pemantauan Bidan</div>
                        <div class="card-body">
                            ${createInput('Tanggal Kunjungan Bidan', 'tgl_kunjungan_bidan', 'date', f.tgl_kunjungan_bidan, null, lockBidanFields)}
                            ${createInput('Berat Badan (Gram)', 'bb_kunjungan', 'number', f.bb_kunjungan, null, lockBidanFields, 'Gram...')}
                            ${createInput('Panjang Badan (Cm)', 'pb_kunjungan', 'number', f.pb_kunjungan, null, lockBidanFields, 'Cm...')}
                            ${createInput('Keadaan Umum', 'keadaan_umum', 'text', f.keadaan_umum, null, lockBidanFields)}
                            ${createInput('Hasil Pemantauan', 'hasil', 'text', f.hasil, ['MEMBAIK', 'RUJUK KEMBALI', 'MENINGGAL'], lockBidanFields)}
                            ${createInput('Jadwal Kontrol Selanjutnya', 'kontrol', 'text', f.kontrol, ['YA (Perlu)', 'TIDAK (Selesai)'], lockBidanFields)}
                            
                            <div class="col-span-full border-top">
                                <label class="form-label mb-2 block">📷 Dokumentasi Bidan</label>
                                <div class="upload-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                    ${createUploadBox('foto_bidan_1', lockBidanFields)}
                                    ${createUploadBox('foto_bidan_2', lockBidanFields)}
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
    updateState({ view: 'form', formData: { ...emptyForm }, selectedRm: null });
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
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');
    if (splash) {
        // Remove the hidden class so it fades back in
        splash.style.display = 'flex';
        // Small delay to allow display:flex to apply before changing opacity
        setTimeout(() => {
            splash.classList.remove('hidden');
            const loader = splash.querySelector('.splash-loader');
            if (loader) loader.style.display = 'none'; // hide loader on exit
            app.innerHTML = ''; // Clear the app content
        }, 50);
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
        updateState({ view: 'form', formData: { ...record } });
    }
};

window.submitForm = async function(e) {
    e.preventDefault();
    updateState({ isSubmitting: true });

    try {
        const response = await fetch(scriptURL, { 
            method: 'POST', 
            body: JSON.stringify(state.formData) 
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
        setTimeout(() => splash.remove(), 600);
    }
};

function renderApp() {
    const app = document.getElementById('app');
    
    if (state.isLoading) {
        app.innerHTML = `<div style="text-align:center; padding: 5rem; color: #666;">Sedang Memuat Data...</div>`;
        return;
    }

    let html = `<div class="container">`;
    html += renderHeader();
    if (state.view === 'list') {
        html += renderList();
    } else if (state.view === 'detail') {
        html += renderPatientDetail();
    } else {
        html += renderForm();
    }
    html += `</div>`;
    
    app.innerHTML = html;
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
