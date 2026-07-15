/**
 * MOMS-LINK - Application Logic (Vanilla JS)
 */

// --- 1. STATE MANAGEMENT ---
const state = {
    role: null, // 'rsud' or 'bidan' or 'dinkes' or 'superadmin'
    view: 'login',  // 'login', 'list', 'detail', 'form'
    records: [],   // All raw records from Google Sheet
    settings: [],  // User Role & Passwords
    selectedRm: null,
    searchQuery: '',
    filterStartDate: '',
    filterEndDate: '',
    dashboardMonth: 'all',
    dashboardYear: new Date().getFullYear(),
    currentPage: 1,
    itemsPerPage: 10,
    formData: {},
    isSubmitting: false,
    isLoading: true,
    isPerburukan: false
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
    foto_rs_3: '', foto_rs_3_name: '', foto_rs_3_type: '',
    foto_rs_4: '', foto_rs_4_name: '', foto_rs_4_type: '',
    foto_bidan_1: '', foto_bidan_1_name: '', foto_bidan_1_type: '',
    foto_bidan_2: '', foto_bidan_2_name: '', foto_bidan_2_type: '',
    foto_bidan_3: '', foto_bidan_3_name: '', foto_bidan_3_type: '',
    foto_bidan_4: '', foto_bidan_4_name: '', foto_bidan_4_type: '',
    nama_petugas_rs: '', kontak_petugas_rs: '', nama_bidan: '', kontak_bidan: '',
    is_dirujuk: false, lokasi_rujukan_lanjutan: '', status_akhir_superadmin: '',
    kabupaten_bidan_pj: 'Pasuruan', kecamatan_bidan_pj: '', desa_bidan_pj: '', nama_bidan_pj: '', kontak_bidan_pj: ''
};

// --- 2. UTILITY FUNCTIONS ---
function updateState(newState, pushHistory = true) {
    const previousView = state.view;
    Object.assign(state, newState);
    
    // Mencegah aplikasi keluar saat tombol back ditekan dengan memanipulasi history browser
    if (pushHistory && newState.view && newState.view !== previousView && state.view !== 'login') {
        history.pushState({ view: state.view, selectedRm: state.selectedRm }, "");
    }
    
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

window.showConfirmModal = function (icon, title, message, confirmText, confirmClass, onConfirm) {
    const modalHtml = `
        <div id="custom-modal" class="modal-overlay fade-in">
            <div class="modal-content scale-in">
                <div class="modal-icon">${icon}</div>
                <h3 class="modal-title">${title}</h3>
                <p class="modal-message">${message}</p>
                <div class="modal-actions">
                    <button class="btn-cancel" onclick="document.getElementById('custom-modal').remove()">Batal</button>
                    <button class="${confirmClass}" id="modal-confirm-btn">${confirmText}</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('modal-confirm-btn').onclick = () => {
        document.getElementById('custom-modal').remove();
        onConfirm();
    };
};

window.showAlertModal = function (icon, title, message, callback = null) {
    const modalHtml = `
        <div id="custom-alert-modal" class="modal-overlay fade-in">
            <div class="modal-content scale-in">
                <div class="modal-icon">${icon}</div>
                <h3 class="modal-title">${title}</h3>
                <p class="modal-message">${message}</p>
                <div class="modal-actions" style="justify-content: center;">
                    <button class="btn-primary" id="modal-alert-btn" style="min-width: 120px;">OK</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const btn = document.getElementById('modal-alert-btn');
    btn.focus();
    btn.onclick = () => {
        document.getElementById('custom-alert-modal').remove();
        if (callback) callback();
    };
};

window.showPhotoModal = function (url) {
    const modalHtml = `
        <div id="photo-modal" class="modal-overlay fade-in" style="z-index: 10000; flex-direction: column; background: rgba(0,0,0,0.9);">
            <div style="width: 100%; padding: 1.5rem; display: flex; justify-content: flex-start; position: absolute; top: 0; left: 0; z-index: 10001;">
                <button class="btn-cancel" onclick="document.getElementById('photo-modal').remove()" style="background: white; border-radius: 50%; width: 45px; height: 45px; padding: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: none; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                    <svg width="24" height="24" fill="none" stroke="#333" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
            </div>
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 1rem; width: 100%; height: 100%;">
                <img src="${url}" style="max-width: 95vw; max-height: 95vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

function formatForDateInput(dateStr) {
    if (!dateStr) return '';
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

window.calculateAgeString = function(dateStr) {
    if (!dateStr) return '';
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    
    let today = new Date();
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    let diffTime = today.getTime() - d.getTime();
    if (diffTime < 0) return '0 Hari';
    
    let diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
    
    if (diffDays < 30) {
        return `${diffDays} Hari`;
    } else {
        const months = Math.floor(diffDays / 30);
        const remainingDays = diffDays % 30;
        return `${months} Bulan ${remainingDays > 0 ? remainingDays + ' Hari' : ''}`;
    }
}

function handleInput(field, value, isCheckbox = false) {
    state.formData[field] = isCheckbox ? value === true : value;

    if (field === 'terapi_nihil' && value) {
        state.formData.terapi_infus = false;
        state.formData.terapi_antibiotik = false;
        state.formData.terapi_obat_kejang = false;
        if (document.getElementById('terapi_infus')) document.getElementById('terapi_infus').checked = false;
        if (document.getElementById('terapi_antibiotik')) document.getElementById('terapi_antibiotik').checked = false;
        if (document.getElementById('terapi_obat_kejang')) document.getElementById('terapi_obat_kejang').checked = false;
    } else if ((field === 'terapi_infus' || field === 'terapi_antibiotik' || field === 'terapi_obat_kejang') && value) {
        state.formData.terapi_nihil = false;
        if (document.getElementById('terapi_nihil')) document.getElementById('terapi_nihil').checked = false;
    }

    if (field === 'alat_nihil' && value) {
        state.formData.alat_tpeace = false;
        state.formData.alat_o2nasal = false;
        state.formData.alat_cpap = false;
        state.formData.alat_venti = false;
        if (document.getElementById('alat_tpeace')) document.getElementById('alat_tpeace').checked = false;
        if (document.getElementById('alat_o2nasal')) document.getElementById('alat_o2nasal').checked = false;
        if (document.getElementById('alat_cpap')) document.getElementById('alat_cpap').checked = false;
        if (document.getElementById('alat_venti')) document.getElementById('alat_venti').checked = false;
    } else if ((field === 'alat_tpeace' || field === 'alat_o2nasal' || field === 'alat_cpap' || field === 'alat_venti') && value) {
        state.formData.alat_nihil = false;
        if (document.getElementById('alat_nihil')) document.getElementById('alat_nihil').checked = false;
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

window.autofillContact = function (type, name) {
    if (!name) return;
    let contact = '';
    if (type === 'rs') {
        const found = state.records.find(r => r.nama_petugas_rs === name && r.kontak_petugas_rs);
        if (found) contact = found.kontak_petugas_rs;
    } else if (type === 'bidan') {
        const found = state.records.find(r => r.nama_bidan === name && r.kontak_bidan);
        if (found) contact = found.kontak_bidan;
    }
    if (contact) {
        const fieldName = type === 'rs' ? 'kontak_petugas_rs' : 'kontak_bidan';
        state.formData[fieldName] = contact;
        const inputEl = document.getElementById(fieldName);
        if (inputEl) {
            inputEl.value = contact;
            inputEl.classList.remove('error-blink');
        }
    }
};

// Multi-File Upload Handler
window.handleFileUpload = function (event, fieldPrefix) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showAlertModal("⚠️", "Ukuran File", "Ukuran file terlalu besar! Maksimal 5MB.");
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
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
        if (record.is_dirujuk) {
            grouped[record.no].is_dirujuk = record.is_dirujuk;
            grouped[record.no].lokasi_rujukan_lanjutan = record.lokasi_rujukan_lanjutan;
        }
        if (record.status_akhir_superadmin) {
            grouped[record.no].status_akhir = record.status_akhir_superadmin;
        }
    });

    state.patients = Object.values(grouped).sort((a, b) => {
        // Sort patients by their latest activity
        const lastA = a.history[a.history.length - 1].id;
        const lastB = b.history[b.history.length - 1].id;
        return lastB - lastA; // descending
    });
}

// --- 3. RENDERERS ---

function renderLogin() {
    return `
        <div class="login-container fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem; color: var(--text-main);">Selamat Datang</h1>
                <p style="color: var(--text-secondary); font-size: 1.1rem;">Silakan pilih peran Anda untuk masuk ke sistem NEO-LINK GRATI</p>
            </div>
            <div class="role-cards" style="display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; max-width: 800px;">
                <button class="btn-role fktp" style="padding: 1.5rem 2rem; font-size: 1.2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border-radius: 12px;" onclick="attemptLogin('fktp')">
                    <span style="font-size: 2rem;">🏥</span> FKTP
                </button>
                <button class="btn-role rsud" style="padding: 1.5rem 2rem; font-size: 1.2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border-radius: 12px;" onclick="attemptLogin('rsud')">
                    <span style="font-size: 2rem;">🏥</span> RSUD Grati
                </button>
                <button class="btn-role bidan" style="padding: 1.5rem 2rem; font-size: 1.2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border-radius: 12px;" onclick="attemptLogin('bidan')">
                    <span style="font-size: 2rem;">🌸</span> Bidan Desa
                </button>
                <button class="btn-role dinkes" style="padding: 1.5rem 2rem; font-size: 1.2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border-radius: 12px;" onclick="attemptLogin('dinkes')">
                    <span style="font-size: 2rem;">👁️</span> Pengawas (Dinkes)
                </button>
                <button class="btn-role superadmin" style="padding: 1.5rem 2rem; font-size: 1.2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border-radius: 12px;" onclick="attemptLogin('superadmin')">
                    <span style="font-size: 2rem;">🛡️</span> Superadmin
                </button>
                <button class="btn-role faskes_rujukan" style="padding: 1.5rem 2rem; font-size: 1.2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border-radius: 12px; background: rgba(239, 68, 68, 0.05); border: 1px solid #ef4444;" onclick="attemptLogin('faskes_rujukan')">
                    <span style="font-size: 2rem;">🚑</span> RS Rujukan Lanjutan Tipe A / B
                </button>
            </div>
        </div>
    `;
}

function renderHeader() {
    let roleText = '';
    if (state.role === 'fktp') roleText = '🏥 FKTP';
    else if (state.role === 'rsud') roleText = '🏥 RSUD Grati';
    else if (state.role === 'bidan') roleText = '🌸 Bidan Desa';
    else if (state.role === 'dinkes') roleText = '👁️ Pengawas (Dinkes)';
    else if (state.role === 'superadmin') roleText = '🛡️ Superadmin';
    else if (state.role === 'faskes_rujukan') roleText = '🚑 RS Rujukan Lanjutan Tipe A / B';

    return `
        <div class="app-header fade-in">
            <div class="header-title">
                <h1>Sistem Terintegrasi <span class="${state.role}">NEO-LINK GRATI</span></h1>
                <p>NEOnatal Online Monitoring System - LINK RSUD GRATI</p>
                <div id="live-clock" style="font-size: 0.85rem; font-weight: 600; color: var(--text-tertiary); margin-top: 0.35rem; display: flex; align-items: center; gap: 0.25rem;">
                    ⏱️ --
                </div>
            </div>
            <div class="role-switcher header-controls" style="display: flex; gap: 0.75rem; align-items: center; padding: 0.5rem; background: var(--gray-light); border: 1px solid var(--gray-border); border-radius: var(--radius-md); flex-wrap: wrap; justify-content: center;">
                <span style="font-weight: 500; color: var(--text-secondary); display: flex; align-items: center; white-space: normal; text-align: center; justify-content: center; flex-wrap: wrap; margin-bottom: 0.25rem;">
                    Login sebagai: <span style="color: var(--text-main); font-weight: 700; margin-left: 0.5rem; padding: 0.25rem 0.75rem; background: white; border-radius: 20px; border: 1px solid var(--gray-border);">${roleText}</span>
                </span>
                <div class="header-controls-buttons" style="display: flex; gap: 0.5rem; align-items: center; margin-left: auto; margin-right: auto; flex-wrap: wrap; justify-content: center;">
                    ${(state.role === 'superadmin' || state.role === 'dinkes') ? `
                        <button class="btn-role" onclick="updateState({view: 'dashboard'})" style="${state.view === 'dashboard' ? 'background: #3b82f6; color: white;' : 'color: #3b82f6; border: 1px solid #3b82f6; background: rgba(59,130,246,0.1);'}">📊 Dashboard</button>
                        <button class="btn-role" onclick="updateState({view: 'list', currentPage: 1})" style="${state.view === 'list' ? 'background: #3b82f6; color: white;' : 'color: #3b82f6; border: 1px solid #3b82f6; background: rgba(59,130,246,0.1);'}">📋 Daftar Pasien</button>
                    ` : ''}
                    ${state.role === 'superadmin' ? `<button class="btn-role" onclick="showAccountManager()" style="color: #3b82f6; border: 1px solid #3b82f6; background: rgba(59,130,246,0.1);">⚙️ Manajemen Akun</button>` : ''}
                    <button class="btn-role" onclick="exitApp()" style="color: #ef4444; border: 1px solid #ef4444; background: rgba(239,68,68,0.1);">
                        🚪 Keluar
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderList() {
    let filtered = state.patients.filter(p =>
        p.nama_pasien.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        p.no.toLowerCase().includes(state.searchQuery.toLowerCase())
    );

    if (state.filterStartDate && state.filterEndDate) {
        const start = new Date(state.filterStartDate).getTime();
        const end = new Date(state.filterEndDate).setHours(23, 59, 59, 999);

        filtered = filtered.filter(p => {
            // Check if any history date falls in range
            return p.history.some(h => {
                const dateRS = new Date(h.tgl_kunjungan_rs).getTime();
                const dateBidan = new Date(h.tgl_kunjungan_bidan).getTime();
                return (!isNaN(dateRS) && dateRS >= start && dateRS <= end) ||
                    (!isNaN(dateBidan) && dateBidan >= start && dateBidan <= end);
            });
        });
    }

    // Filter Role Berdasarkan Status Akhir
    if (state.role === 'faskes_rujukan') {
        filtered = filtered.filter(p => p.status_akhir === 'Dirujuk' || p.is_dirujuk === true);
    } else if (state.role === 'rsud') {
        // RSUD melihat pasien yang masih dirawat (belum Sembuh/Dirujuk/Meninggal)
        filtered = filtered.filter(p => !p.status_akhir || p.status_akhir === '');
    } else if (state.role === 'fktp') {
        // FKTP hanya melihat pasien yang belum diisi Tahap 4 oleh RSUD
        filtered = filtered.filter(p => {
            if (p.status_akhir && p.status_akhir !== '') return false;
            const lastRecord = p.history[p.history.length - 1];
            if (!lastRecord) return false;
            // Jika salah satu field Tahap 4 ini sudah terisi, berarti RSUD sudah menangani
            const hasTahap4 = lastRecord.diagnosa_awal || lastRecord.nama_petugas_rs || lastRecord.kondisi_krs;
            return !hasTahap4;
        });
    } else if (state.role === 'bidan') {
        // Bidan Desa melihat pasien yang sudah Sembuh untuk di pantau
        filtered = filtered.filter(p => p.status_akhir === 'Sembuh');
    }
    // superadmin dan dinkes melihat semua (tidak difilter)

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
            
            if (row.status_akhir) {
                perkembangan = `Status: ${row.status_akhir}`;
            } else if (lastRecord.tgl_kunjungan_bidan) {
                perkembangan = `Pantau Bidan: ${lastRecord.hasil || 'Dipantau'}`;
            } else if (lastRecord.tgl_kunjungan_rs) {
                let kondisi = lastRecord.kondisi_krs || 'Selesai Rawat';
                perkembangan = `RSUD: ${kondisi}`;
            } else {
                perkembangan = 'Baru';
            }

            let tglLahirText = `<div style="white-space: nowrap;">${formatDateTime(row.tgl_lahir)}</div>`;
            let calculatedAge = row.tgl_lahir ? window.calculateAgeString(row.tgl_lahir) : lastRecord.umur_bayi;
            if (calculatedAge) {
                tglLahirText += `<div style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 500; white-space: nowrap;">(${calculatedAge})</div>`;
            }

            let nameCell = `<div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${row.nama_pasien}</div>`;
            if (row.is_dirujuk) {
                nameCell += `<div style="margin-top: 2px;"><span class="badge warning" style="font-size: 0.65rem; background-color: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; white-space: nowrap; max-width: 150px; overflow: hidden; text-overflow: ellipsis; display: inline-block;">Dirujuk ke: ${row.lokasi_rujukan_lanjutan}</span></div>`;
            }
            if (state.role === 'superadmin' || state.role === 'dinkes') {
                let contactsHtml = `<div style="margin-top: 6px; font-size: 0.65rem; color: #4b5563; display: flex; flex-direction: column; gap: 4px;">`;
                if (lastRecord.nama_bidan_pj && lastRecord.kontak_bidan_pj) {
                    const wa1 = String(lastRecord.kontak_bidan_pj).replace(/^0/, '62');
                    contactsHtml += `<a href="https://wa.me/${wa1}" target="_blank" onclick="event.stopPropagation()" style="color:#10b981; text-decoration:none; display:flex; align-items:center; gap:4px;">💬 PJ: ${lastRecord.nama_bidan_pj}</a>`;
                }
                if (lastRecord.nama_petugas_rs && lastRecord.kontak_petugas_rs) {
                    const wa2 = String(lastRecord.kontak_petugas_rs).replace(/^0/, '62');
                    contactsHtml += `<a href="https://wa.me/${wa2}" target="_blank" onclick="event.stopPropagation()" style="color:#3b82f6; text-decoration:none; display:flex; align-items:center; gap:4px;">💬 RS: ${lastRecord.nama_petugas_rs}</a>`;
                }
                if (lastRecord.nama_bidan && lastRecord.kontak_bidan) {
                    const wa3 = String(lastRecord.kontak_bidan).replace(/^0/, '62');
                    contactsHtml += `<a href="https://wa.me/${wa3}" target="_blank" onclick="event.stopPropagation()" style="color:#ec4899; text-decoration:none; display:flex; align-items:center; gap:4px;">💬 Pantau: ${lastRecord.nama_bidan}</a>`;
                }
                contactsHtml += `</div>`;
                if (contactsHtml.includes('<a')) {
                    nameCell += contactsHtml;
                }
            } else {
                if (row.status_akhir === 'Sembuh' && lastRecord.nama_bidan_pj) {
                    const waNumber = String(lastRecord.kontak_bidan_pj).replace(/^0/, '62');
                    nameCell += `<div style="margin-top: 4px; font-size: 0.7rem; color: #4b5563;">
                        <div style="font-weight:600; color:var(--bidan-primary)">PJ: Bidan ${lastRecord.nama_bidan_pj}</div>
                        <div>${lastRecord.desa_bidan_pj}, Kec. ${lastRecord.kecamatan_bidan_pj}</div>
                        <a href="https://wa.me/${waNumber}" target="_blank" onclick="event.stopPropagation()" style="color:#10b981; text-decoration:none;">💬 WA: ${lastRecord.kontak_bidan_pj}</a>
                    </div>`;
                }
            }

            let actionBtns = '';
            if (state.role === 'superadmin') {
                if (!row.status_akhir) {
                    actionBtns += `
                    <div style="display:flex; flex-direction:column; gap:0.25rem;">
                        <button class="btn-action" style="background-color: #d1fae5; color: #10b981; border-color: #10b981; padding: 0.25rem 0.5rem; font-size:0.75rem;" onclick="event.stopPropagation(); setPatientStatus('${row.no}', 'Sembuh')">Set Sembuh</button>
                        <button class="btn-action" style="background-color: #fee2e2; color: #ef4444; border-color: #ef4444; padding: 0.25rem 0.5rem; font-size:0.75rem;" onclick="event.stopPropagation(); showRujukanModal('${row.no}')">Set Dirujuk</button>
                        <button class="btn-action" style="background-color: #1f2937; color: white; border-color: #1f2937; padding: 0.25rem 0.5rem; font-size:0.75rem;" onclick="event.stopPropagation(); setPatientStatus('${row.no}', 'Meninggal')">Set Meninggal</button>
                    </div>`;
                }
            }

            tableRows += `
                <tr onclick="viewPatient('${row.no}')" class="patient-row" style="cursor: pointer;" title="Klik untuk melihat riwayat lengkap">
                    <td data-label="No RM" class="font-medium" style="color: var(--rsud-primary);">${row.no}</td>
                    <td data-label="Nama Pasien" style="font-weight: 600;">${nameCell}</td>
                    <td data-label="Tgl Lahir">${tglLahirText}</td>
                    <td data-label="Kondisi Terakhir"><span class="badge">${perkembangan}</span></td>
                    <td data-label="Status">${statusBadge}</td>
                    <td data-label="Aksi" style="white-space: nowrap;">
                        ${actionBtns || '<span style="color: var(--text-tertiary); font-size: 0.75rem;">Klik untuk detail ➔</span>'}
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-secondary);">Tidak ada data pasien.</td></tr>`;
    }

    const newBtn = (state.role === 'fktp' || state.role === 'superadmin')
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
                    <div class="filter-box" style="display:flex; gap:0.5rem; align-items:center;">
                        ${(state.role === 'superadmin' || state.role === 'dinkes') ? `
                            <span style="font-size:0.85rem; color:var(--text-secondary);">Filter Tanggal:</span>
                            <input type="date" class="form-input filter-input" value="${state.filterStartDate || ''}" onchange="updateState({filterStartDate: this.value, currentPage: 1})" title="Tanggal Mulai">
                            <span style="font-size:0.85rem; color:var(--text-secondary);">-</span>
                            <input type="date" class="form-input filter-input" value="${state.filterEndDate || ''}" onchange="updateState({filterEndDate: this.value, currentPage: 1})" title="Tanggal Akhir">
                            <button class="btn-action" style="background-color: #f1f5f9; color: #475569;" onclick="updateState({filterStartDate: '', filterEndDate: '', currentPage: 1})">Reset</button>
                        ` : ''}
                    </div>
                    ${newBtn}
                    ${(state.role === 'superadmin' || state.role === 'dinkes') ? `
                        <div style="display:flex; gap:0.5rem; margin-left:auto;">
                            <button class="btn-primary" style="background-color:#dc2626; border-color:#b91c1c;" onclick="exportToPDF()">📄 Export PDF</button>
                            <button class="btn-primary" style="background-color:#16a34a; border-color:#15803d;" onclick="exportToExcel()">📊 Export Excel</button>
                        </div>
                    ` : ''}
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
            if (h.terapi_infus) terapiList.push('Infus');
            if (h.terapi_antibiotik) terapiList.push('Antibiotik');
            if (h.terapi_obat_kejang) terapiList.push('Obat Kejang');
            if (h.terapi_lain) terapiList.push(h.terapi_lain);
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
            if (h.foto_rs_1 || h.foto_rs_2 || h.foto_rs_3 || h.foto_rs_4) {
                rsudSection += `<div style="display:flex; gap: 1rem; margin-top: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">`;
                if (h.foto_rs_1) rsudSection += `<div onclick="window.showPhotoModal('${h.foto_rs_1}')" style="cursor:pointer; border:1px solid var(--gray-border); border-radius:var(--radius-md); overflow:hidden; width:120px; box-shadow:var(--shadow-sm); background:white; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><img src="${h.foto_rs_1}" style="width:100%; height:90px; object-fit:cover; display:block;"><div style="font-size:0.7rem; text-align:center; padding:6px; color:var(--text-secondary); font-weight:600; background:var(--gray-light); border-top:1px solid var(--gray-border);">Foto 1</div></div>`;
                if (h.foto_rs_2) rsudSection += `<div onclick="window.showPhotoModal('${h.foto_rs_2}')" style="cursor:pointer; border:1px solid var(--gray-border); border-radius:var(--radius-md); overflow:hidden; width:120px; box-shadow:var(--shadow-sm); background:white; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><img src="${h.foto_rs_2}" style="width:100%; height:90px; object-fit:cover; display:block;"><div style="font-size:0.7rem; text-align:center; padding:6px; color:var(--text-secondary); font-weight:600; background:var(--gray-light); border-top:1px solid var(--gray-border);">Foto 2</div></div>`;
                if (h.foto_rs_3) rsudSection += `<div onclick="window.showPhotoModal('${h.foto_rs_3}')" style="cursor:pointer; border:1px solid var(--gray-border); border-radius:var(--radius-md); overflow:hidden; width:120px; box-shadow:var(--shadow-sm); background:white; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><img src="${h.foto_rs_3}" style="width:100%; height:90px; object-fit:cover; display:block;"><div style="font-size:0.7rem; text-align:center; padding:6px; color:var(--text-secondary); font-weight:600; background:var(--gray-light); border-top:1px solid var(--gray-border);">Foto 3</div></div>`;
                if (h.foto_rs_4) rsudSection += `<div onclick="window.showPhotoModal('${h.foto_rs_4}')" style="cursor:pointer; border:1px solid var(--gray-border); border-radius:var(--radius-md); overflow:hidden; width:120px; box-shadow:var(--shadow-sm); background:white; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><img src="${h.foto_rs_4}" style="width:100%; height:90px; object-fit:cover; display:block;"><div style="font-size:0.7rem; text-align:center; padding:6px; color:var(--text-secondary); font-weight:600; background:var(--gray-light); border-top:1px solid var(--gray-border);">Foto 4</div></div>`;
                rsudSection += `</div>`;
            }
            if (h.nama_petugas_rs || h.kontak_petugas_rs) {
                let waLink = h.kontak_petugas_rs ? String(h.kontak_petugas_rs).replace(/^0/, '62').replace(/\D/g, '') : '';
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
            if (h.foto_bidan_1 || h.foto_bidan_2 || h.foto_bidan_3 || h.foto_bidan_4) {
                bidanSection += `<div style="display:flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;">`;
                if (h.foto_bidan_1) bidanSection += `<div onclick="window.showPhotoModal('${h.foto_bidan_1}')" style="cursor:pointer; border:1px solid var(--gray-border); border-radius:var(--radius-md); overflow:hidden; width:120px; box-shadow:var(--shadow-sm); background:white; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><img src="${h.foto_bidan_1}" style="width:100%; height:90px; object-fit:cover; display:block;"><div style="font-size:0.7rem; text-align:center; padding:6px; color:var(--text-secondary); font-weight:600; background:var(--gray-light); border-top:1px solid var(--gray-border);">Foto 1</div></div>`;
                if (h.foto_bidan_2) bidanSection += `<div onclick="window.showPhotoModal('${h.foto_bidan_2}')" style="cursor:pointer; border:1px solid var(--gray-border); border-radius:var(--radius-md); overflow:hidden; width:120px; box-shadow:var(--shadow-sm); background:white; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><img src="${h.foto_bidan_2}" style="width:100%; height:90px; object-fit:cover; display:block;"><div style="font-size:0.7rem; text-align:center; padding:6px; color:var(--text-secondary); font-weight:600; background:var(--gray-light); border-top:1px solid var(--gray-border);">Foto 2</div></div>`;
                if (h.foto_bidan_3) bidanSection += `<div onclick="window.showPhotoModal('${h.foto_bidan_3}')" style="cursor:pointer; border:1px solid var(--gray-border); border-radius:var(--radius-md); overflow:hidden; width:120px; box-shadow:var(--shadow-sm); background:white; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><img src="${h.foto_bidan_3}" style="width:100%; height:90px; object-fit:cover; display:block;"><div style="font-size:0.7rem; text-align:center; padding:6px; color:var(--text-secondary); font-weight:600; background:var(--gray-light); border-top:1px solid var(--gray-border);">Foto 3</div></div>`;
                if (h.foto_bidan_4) bidanSection += `<div onclick="window.showPhotoModal('${h.foto_bidan_4}')" style="cursor:pointer; border:1px solid var(--gray-border); border-radius:var(--radius-md); overflow:hidden; width:120px; box-shadow:var(--shadow-sm); background:white; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><img src="${h.foto_bidan_4}" style="width:100%; height:90px; object-fit:cover; display:block;"><div style="font-size:0.7rem; text-align:center; padding:6px; color:var(--text-secondary); font-weight:600; background:var(--gray-light); border-top:1px solid var(--gray-border);">Foto 4</div></div>`;
                bidanSection += `</div>`;
            }
            if (h.nama_bidan || h.kontak_bidan) {
                let waLink = h.kontak_bidan ? String(h.kontak_bidan).replace(/^0/, '62').replace(/\D/g, '') : '';
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
                        ${state.role === 'superadmin' ? `
                            <div style="display:flex; gap:0.5rem;">
                                <button class="btn-action ${iconClass}" onclick="editRecord(${h.id})">Edit</button>
                                <button class="btn-action" style="background-color: #fee2e2; color: #ef4444; border-color: #ef4444;" onclick="deleteRecord(${h.id})">Hapus</button>
                            </div>
                        ` : `
                            <div style="display:flex; gap:0.5rem;">
                                ${['fktp', 'rsud', 'bidan'].includes(state.role) && idx === patient.history.length - 1 ? `<button class="btn-action ${iconClass}" onclick="editRecord(${h.id})">Lengkapi Data</button>` : ''}
                            </div>
                        `}
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

            <div class="form-actions" style="justify-content: flex-start; padding: 0 0 1rem 0; gap: 0.5rem; flex-wrap: wrap;">
                ${state.role === 'fktp' && patient.status_akhir !== 'Sembuh' ? `<button class="btn-primary" style="background-color: var(--rsud-primary);" onclick="addControl('fktp')">+ Kunjungan Baru FKTP</button>` : ''}
                ${state.role === 'rsud' && patient.status_akhir !== 'Sembuh' ? `<button class="btn-primary" style="background-color: var(--rsud-primary);" onclick="addControl('rsud')">+ Kunjungan Baru RSUD Grati</button>` : ''}
                ${state.role === 'bidan' && patient.status_akhir !== 'Sembuh' ? `<button class="btn-primary" style="background-color: var(--bidan-primary);" onclick="addControl('bidan')">+ Tambah Pemantauan (Tahap 5)</button>` : ''}
                ${(state.role === 'bidan' || state.role === 'fktp') && patient.status_akhir === 'Sembuh' ? `<button class="btn-primary" style="background-color: #ef4444; border-color: #ef4444;" onclick="addPerburukan()">⚠️ Perburukan -> Rujuk ke RSUD</button>` : ''}
            </div>

            <div class="timeline-container">
                <div class="timeline">
                    ${timelineHTML}
                </div>
            </div>
        </div>
    `;
}

function createInput(label, id, type = 'text', value, options = null, disabled = false, placeholder = '', extraAttrs = '') {
    const disabledAttr = disabled ? 'disabled' : '';
    let inputHTML = '';
    if (options) {
        let opts = `<option value="" disabled ${!value ? 'selected' : ''}>Pilih...</option>`;
        options.forEach(opt => {
            const isSelected = value === opt ? 'selected' : '';
            opts += `<option value="${opt}" ${isSelected}>${opt}</option>`;
        });
        inputHTML = `<select class="form-select" id="${id}" ${disabledAttr} ${extraAttrs} onchange="handleInput('${id}', this.value)">${opts}</select>`;
    } else if (type === 'textarea') {
        const valAttr = value || '';
        inputHTML = `<textarea class="form-input" id="${id}" placeholder="${placeholder}" ${disabledAttr} ${extraAttrs} onchange="handleInput('${id}', this.value)" rows="5" style="resize: vertical; font-family: inherit;">${valAttr}</textarea>`;
    } else {
        const valAttr = value ? `value="${value}"` : '';
        const fpClass = type === 'date' ? 'fp-date' : (type === 'datetime-local' ? 'fp-datetime' : '');
        inputHTML = `<input class="form-input ${fpClass}" type="${type}" id="${id}" ${valAttr} placeholder="${placeholder}" ${disabledAttr} ${extraAttrs} onchange="handleInput('${id}', this.value)">`;
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
    const hasFile = value || f[fieldPrefix + '_name'];

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

    const lockTahap1_3 = (!['fktp', 'superadmin'].includes(state.role)) && !state.isPerburukan;
    const lockTahap1_2 = lockTahap1_3 || state.isPerburukan;
    const lockTahap4 = !['rsud', 'superadmin'].includes(state.role);
    const lockTahap5 = (!['bidan', 'superadmin'].includes(state.role)) || state.isPerburukan;
    const f = state.formData;

    const isNew = !f.id;
    const title = isNew ? 'Input Riwayat Baru' : 'Edit Riwayat Medis';

    const datalistPetugasRS = [...new Set(state.records.map(r => r.nama_petugas_rs).filter(v => v))];
    const datalistBidan = [...new Set(state.records.map(r => r.nama_bidan).filter(v => v))];

    setTimeout(() => {
        // Initialize datalist for kecamatan
        if (typeof WILAYAH_PASURUAN !== 'undefined') {
            const dl = document.getElementById('list-kecamatan');
            if (dl) dl.innerHTML = Object.keys(WILAYAH_PASURUAN).sort().map(k => `<option value="${k}">`).join('');
        }
        
        // Initialize desa if kecamatan is already filled
        if (f.kecamatan_bidan_pj) {
            if (window.updateDesaList) window.updateDesaList(f.kecamatan_bidan_pj);
        }
        if (f.kecamatan_bidan) {
            if (window.updateDesaListBidan) window.updateDesaListBidan(f.kecamatan_bidan);
        }

        // Initialize flatpickr
        if (typeof flatpickr !== 'undefined') {
            flatpickr("input[type=datetime-local]", {
                enableTime: true,
                dateFormat: "Y-m-d\\TH:i",
                altInput: true,
                altFormat: "d/m/Y H:i",
                time_24hr: true,
                allowInput: true
            });
            flatpickr("input[type=date]", {
                enableTime: false,
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: "d/m/Y",
                allowInput: true
            });
        }
    }, 100);

    return `
        <div class="fade-in">
            <datalist id="list-petugas-rs">
                ${datalistPetugasRS.map(v => `<option value="${v}">`).join('')}
            </datalist>
            <datalist id="list-bidan">
                ${datalistBidan.map(v => `<option value="${v}">`).join('')}
            </datalist>
            <div class="form-header">
                <button class="btn-back" onclick="updateState({view: state.selectedRm ? 'detail' : 'list'})">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
                <h2 class="form-title">${title}</h2>
            </div>

            <form onsubmit="submitForm(event)">
                <!-- SECTION RSUD (1-4) -->
                <div>
                    <!-- TAHAP 1 -->
                    <div class="form-card ${lockTahap1_2 ? 'readonly-section' : ''}">
                        <div class="card-header ${lockTahap1_2 ? 'theme-gray' : 'theme-blue'}">📋 1. Identitas Pasien & Register (RSUD)</div>
                        <div class="card-body">
                            ${createInput('No. Urut / RM', 'no', 'text', f.no, null, lockTahap1_2 || f.no !== '', 'Nomor urut...')}
                            ${createInput('Nama Pasien Bayi', 'nama_pasien', 'text', f.nama_pasien, null, lockTahap1_2, 'Nama lengkap...')}
                            ${createInput('Tanggal Lahir', 'tgl_lahir', 'date', formatForDateInput(f.tgl_lahir), null, lockTahap1_2)}
                            ${createInput('No. Register', 'no_register', 'text', f.no_register, null, lockTahap1_2, 'Nomor Register...')}
                            ${createInput('Jenis Kelamin', 'jenis_kelamin', 'text', f.jenis_kelamin, ['Perempuan (P)', 'Laki-laki (L)', 'Ambiguous Genitalia'], lockTahap1_2)}
                            ${createInput('Umur Bayi', 'umur_bayi', 'text', f.umur_bayi, null, lockTahap1_2, 'Dalam hari/bulan...')}
                            <div style="pointer-events: auto;">
                                ${createInput('Tanggal & Jam Kunjungan ke RS', 'tgl_kunjungan_rs', 'datetime-local', formatForDateTimeInput(f.tgl_kunjungan_rs), null, lockTahap1_3)}
                            </div>
                            ${createInput('Kelainan Kongenital', 'kelainan_kongenital', 'text', f.kelainan_kongenital, null, lockTahap1_2, 'Ada/Tidak, sebutkan...')}
                        </div>
                    </div>

                    <!-- TAHAP 2 -->
                    <div class="form-card ${lockTahap1_2 ? 'readonly-section' : ''}">
                        <div class="card-header ${lockTahap1_2 ? 'theme-gray' : 'theme-blue'}">👶 2. Riwayat Kehamilan & Persalinan</div>
                        <div class="card-body">
                            ${createInput('Umur Kehamilan (Minggu)', 'umur_kehamilan', 'text', f.umur_kehamilan, ['< 28', '28 - <32', '32 - <34', '34 - <37', '> 37'], lockTahap1_2)}
                            ${createInput('Berat Badan Lahir (Gram)', 'bb_lahir', 'text', f.bb_lahir, ['< 1000', '>1000 - 1500', '>1500 - 2000', '>2000 - 2500', '> 2500'], lockTahap1_2)}
                            ${createInput('Hamil Ke-', 'hamil_ke', 'number', f.hamil_ke, null, lockTahap1_2, '1, 2, 3...')}
                            ${createInput('Jenis Kehamilan', 'jenis_kehamilan', 'text', f.jenis_kehamilan, ['Tunggal', 'Ganda'], lockTahap1_2)}
                            ${createInput('Cara Lahir', 'cara_lahir', 'text', f.cara_lahir, ['SPT', 'VACUM', 'FORCEP', 'SC', 'LAIN-LAIN'], lockTahap1_2)}
                            ${createInput('Indikasi Ibu', 'indikasi_ibu', 'text', f.indikasi_ibu, null, lockTahap1_2, 'Indikasi...')}
                            ${createInput('Apgar Score', 'apgar_score', 'text', f.apgar_score, null, lockTahap1_2, 'Contoh: 8/9')}
                            ${createInput('Mendapat Resusitasi', 'mendapat_resusitasi', 'text', f.mendapat_resusitasi, ['YA', 'TIDAK'], lockTahap1_2)}
                        </div>
                    </div>

                    <!-- TAHAP 3 -->
                    <div class="form-card ${lockTahap1_3 ? 'readonly-section' : ''}">
                        <div class="card-header ${lockTahap1_3 ? 'theme-gray' : 'theme-blue'}">🚑 3. Data & Terapi Pra-Rujukan</div>
                        <div class="card-body">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                ${createInput('Status Rujukan Dari', 'status_rujukan', 'text', f.status_rujukan, ['PKM', 'BPM', 'RS', 'KLINIK', 'DTS', 'LAINNYA'], lockTahap1_3)}
                                ${createInput('Nama Lokasi / Faskes', 'nama_faskes_rujukan', 'text', f.nama_faskes_rujukan, null, lockTahap1_3, 'Ketik nama faskes...')}
                            </div>
                            ${createInput('Diagnosa Rujukan', 'diagnosa_rujukan', 'textarea', f.diagnosa_rujukan, null, lockTahap1_3, 'Diagnosa...')}
                            
                            <div class="form-group col-span-full">
                                <label class="form-label">Terapi Pra Rujukan Diberikan:</label>
                                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                                    ${createCheckbox('Infus', 'terapi_infus', f.terapi_infus, lockTahap1_3)}
                                    ${createCheckbox('Antibiotik', 'terapi_antibiotik', f.terapi_antibiotik, lockTahap1_3)}
                                    ${createCheckbox('Obat Kejang', 'terapi_obat_kejang', f.terapi_obat_kejang, lockTahap1_3)}
                                    ${createCheckbox('Nihil / Tidak Ada', 'terapi_nihil', f.terapi_nihil, lockTahap1_3)}
                                </div>
                            </div>
                            ${createInput('Obat Lainnya', 'terapi_lain', 'textarea', f.terapi_lain, null, lockTahap1_3, 'Obat Lain...')}
                            
                            <div class="col-span-full border-top">
                                <label class="form-label mb-2 block" style="color: var(--bidan-primary);">👤 Penanggung Jawab Pemantauan (Bidan Desa)</label>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                                    ${createInput('Kabupaten Bidan PJ', 'kabupaten_bidan_pj', 'text', f.kabupaten_bidan_pj, null, lockTahap1_3, 'Pasuruan')}
                                    ${createInput('Kecamatan Bidan PJ', 'kecamatan_bidan_pj', 'text', f.kecamatan_bidan_pj, null, lockTahap1_3, 'Pilih Kecamatan...', 'list="list-kecamatan" oninput="window.updateDesaList(this.value)"')}
                                    ${createInput('Desa Bidan PJ', 'desa_bidan_pj', 'text', f.desa_bidan_pj, null, lockTahap1_3, 'Pilih Desa (Opsional)...', 'list="list-desa-pj"')}
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                                    ${createInput('Nama Bidan PJ', 'nama_bidan_pj', 'text', f.nama_bidan_pj, null, lockTahap1_3, 'Nama Bidan...')}
                                    ${createInput('No. WhatsApp (Contoh: 081234...)', 'kontak_bidan_pj', 'text', f.kontak_bidan_pj, null, lockTahap1_3, '08...')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TAHAP 4 -->
                    <div class="form-card ${lockTahap4 ? 'readonly-section' : ''}">
                        <div class="card-header ${lockTahap4 ? 'theme-gray' : 'theme-blue'}">🏥 4. Intervensi & Keluar RSUD</div>
                        <div class="card-body">
                            ${createInput('Diagnosa Awal (RSUD)', 'diagnosa_awal', 'textarea', f.diagnosa_awal, null, lockTahap4)}
                            ${createInput('Diagnosa Akhir (Ruang Rawat)', 'diagnosa_akhir', 'textarea', f.diagnosa_akhir, null, lockTahap4)}
                            
                            <div class="form-group col-span-full">
                                <label class="form-label">Terpasang Alat:</label>
                                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                                    ${createCheckbox('T-Peace', 'alat_tpeace', f.alat_tpeace, lockTahap4)}
                                    ${createCheckbox('O2 Nasal', 'alat_o2nasal', f.alat_o2nasal, lockTahap4)}
                                    ${createCheckbox('CPAP/NIV', 'alat_cpap', f.alat_cpap, lockTahap4)}
                                    ${createCheckbox('Venti', 'alat_venti', f.alat_venti, lockTahap4)}
                                    ${createCheckbox('Nihil / Tidak Ada', 'alat_nihil', f.alat_nihil, lockTahap4)}
                                </div>
                            </div>
                            
                            ${createInput('Minum', 'minum', 'text', f.minum, ['ASI', 'SUFOR'], lockTahap4)}
                            ${createInput('Imunisasi', 'imunisasi', 'text', f.imunisasi, ['HB 0', 'HIPERHEP'], lockTahap4)}
                            ${createInput('Cairan Parenteral', 'cairan_parenteral', 'text', f.cairan_parenteral, ['TPN', 'TRANFUSI'], lockTahap4)}
                            ${createInput('PMK (Metode Kanguru)', 'pmk', 'text', f.pmk, ['YA', 'TIDAK'], lockTahap4)}
                            
                            ${createInput('Kondisi Bayi KRS (Keluar RS)', 'kondisi_krs', 'text', f.kondisi_krs, ['HIDUP (<1000g)', 'HIDUP (>1000-1500g)', 'HIDUP (>1500-2000g)', 'HIDUP (>2000-2500g)', 'HIDUP (>2500g)', 'MENINGGAL (<1000g)', 'MENINGGAL (>1000-1500g)', 'MENINGGAL (>1500-2000g)', 'MENINGGAL (>2000-2500g)'], lockTahap4)}

                            <div class="col-span-full border-top">
                                <label class="form-label mb-2 block">📷 Dokumentasi RSUD (Opsional)</label>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                                    ${createUploadBox('foto_rs_1', lockTahap4)}
                                    ${createUploadBox('foto_rs_2', lockTahap4)}
                                    ${createUploadBox('foto_rs_3', lockTahap4)}
                                    ${createUploadBox('foto_rs_4', lockTahap4)}
                                </div>
                            </div>
                            
                            <div class="col-span-full border-top">
                                <label class="form-label mb-2 block" style="color: var(--rsud-primary);">👤 Identitas Penginput (RSUD)</label>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                    ${createInput('Nama Petugas RS / Instansi', 'nama_petugas_rs', 'text', f.nama_petugas_rs, null, lockTahap4, 'Nama Petugas...', 'list="list-petugas-rs" oninput="autofillContact(\\\'rs\\\', this.value)"')}
                                    ${createInput('No. WhatsApp (Contoh: 081234...)', 'kontak_petugas_rs', 'text', f.kontak_petugas_rs, null, lockTahap4, '08...')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECTION BIDAN (5) -->
                <div class="${lockTahap5 ? 'readonly-section' : 'highlight-section form-card'}">
                    <div class="form-card" style="margin-bottom:0; box-shadow:none; border:none;">
                        <div class="card-header ${lockTahap5 ? 'theme-gray' : 'theme-pink'}">🌸 Tahap 5: Pemantauan Bidan</div>
                        <div class="card-body">
                            ${createInput('Tanggal & Jam Kunjungan Bidan', 'tgl_kunjungan_bidan', 'datetime-local', formatForDateTimeInput(f.tgl_kunjungan_bidan), null, lockTahap5)}
                            ${createInput('Berat Badan (Gram)', 'bb_kunjungan', 'number', f.bb_kunjungan, null, lockTahap5, 'Gram...')}
                            ${createInput('Panjang Badan (Cm)', 'pb_kunjungan', 'number', f.pb_kunjungan, null, lockTahap5, 'Cm...')}
                            ${createInput('Keadaan Umum', 'keadaan_umum', 'text', f.keadaan_umum, null, lockTahap5)}
                            ${createInput('Suhu (°C)', 'suhu', 'number', f.suhu, null, lockTahap5, '°C...')}
                            ${createInput('Nadi (x/mnt)', 'nadi', 'number', f.nadi, null, lockTahap5)}
                            ${createInput('Pernafasan (x/mnt)', 'pernafasan', 'number', f.pernafasan, null, lockTahap5)}
                            ${createInput('Kemampuan Bayi Menyusu', 'kemampuan_menyusu', 'text', f.kemampuan_menyusu, ['KUAT', 'LEMAH', 'TIDAK MAU'], lockTahap5)}
                            ${createInput('Kemampuan Ibu Menyusui', 'kemampuan_ibu_menyusui', 'text', f.kemampuan_ibu_menyusui, ['BAIK', 'KURANG'], lockTahap5)}
                            ${createInput('Pelaksanaan Metode Kanguru', 'pelaksanaan_pmk', 'text', f.pelaksanaan_pmk, ['YA', 'TIDAK'], lockTahap5)}
                            ${createInput('Tanda Kegawatan Bayi', 'tanda_kegawatan', 'text', f.tanda_kegawatan, null, lockTahap5)}
                            ${createInput('Tindakan Kegawatan', 'tindakan_kegawatan', 'text', f.tindakan_kegawatan, null, lockTahap5)}
                            ${createInput('Hasil Pemantauan', 'hasil', 'text', f.hasil, ['MEMBAIK', 'RUJUK KEMBALI', 'MENINGGAL'], lockTahap5)}
                            ${createInput('Jadwal Kontrol Selanjutnya', 'kontrol', 'text', f.kontrol, ['YA (Perlu)', 'TIDAK (Selesai)'], lockTahap5)}
                            
                            <div class="col-span-full border-top">
                                <label class="form-label mb-2 block">📷 Dokumentasi Bidan (Opsional)</label>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1rem; margin-top: 0.5rem;">
                                    ${createUploadBox('foto_bidan_1', lockTahap5)}
                                    ${createUploadBox('foto_bidan_2', lockTahap5)}
                                    ${createUploadBox('foto_bidan_3', lockTahap5)}
                                    ${createUploadBox('foto_bidan_4', lockTahap5)}
                                </div>
                            </div>

                            <div class="col-span-full border-top">
                                <label class="form-label mb-2 block" style="color: var(--bidan-primary);">👤 Identitas Bidan Pemantau</label>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                                    ${createInput('Kabupaten Bidan Pemantau', 'kabupaten_bidan', 'text', f.kabupaten_bidan, null, lockTahap5, 'Pasuruan')}
                                    ${createInput('Kecamatan Bidan Pemantau', 'kecamatan_bidan', 'text', f.kecamatan_bidan, null, lockTahap5, 'Pilih Kecamatan...', 'list="list-kecamatan" oninput="window.updateDesaListBidan(this.value)"')}
                                    ${createInput('Desa Bidan Pemantau', 'desa_bidan', 'text', f.desa_bidan, null, lockTahap5, 'Pilih Desa...', 'list="list-desa-pemantau"')}
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                                    ${createInput('Nama Bidan Pemantau', 'nama_bidan', 'text', f.nama_bidan, null, lockTahap5, 'Nama Bidan...', 'list="list-bidan" oninput="autofillContact(\\\'bidan\\\', this.value)"')}
                                    ${createInput('No. WhatsApp (Contoh: 081234...)', 'kontak_bidan', 'text', f.kontak_bidan, null, lockTahap5, '08...')}
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
            <datalist id="list-kecamatan"></datalist>
            <datalist id="list-desa-pj"></datalist>
            <datalist id="list-desa-pemantau"></datalist>
        </div>
    `;
}

window.updateDesaList = function(kecamatan) {
    const dl = document.getElementById('list-desa-pj');
    dl.innerHTML = '';
    if (typeof WILAYAH_PASURUAN !== 'undefined' && WILAYAH_PASURUAN[kecamatan]) {
        dl.innerHTML = WILAYAH_PASURUAN[kecamatan].sort().map(d => `<option value="${d}">`).join('');
    }
};

window.updateDesaListBidan = function(kecamatan) {
    const dl = document.getElementById('list-desa-pemantau');
    dl.innerHTML = '';
    if (typeof WILAYAH_PASURUAN !== 'undefined' && WILAYAH_PASURUAN[kecamatan]) {
        dl.innerHTML = WILAYAH_PASURUAN[kecamatan].sort().map(d => `<option value="${d}">`).join('');
    }
};

// --- 5. EVENT HANDLERS ---
window.newPatient = function () {
    // Generate nomor RM otomatis, misal "RM-001"
    const nextNum = state.patients.length + 1;
    const generatedRM = "RM-" + String(nextNum).padStart(3, '0');

    updateState({ view: 'form', formData: { ...emptyForm, no: generatedRM }, selectedRm: null });
};

window.attemptLogin = function (roleName) {
    const setting = state.settings.find(s => s.role === roleName);

    // Default fallback if settings not loaded yet
    let reqPwd = false;
    let expectedPwd = '';
    if (setting) {
        reqPwd = setting.requires_password;
        expectedPwd = setting.password;
    } else {
        if (roleName === 'superadmin') { reqPwd = true; expectedPwd = '@Nox86'; }
        else if (roleName === 'dinkes') { reqPwd = true; expectedPwd = 'neoGrati321'; }
    }

    if (reqPwd) {
        showPasswordModal(roleName, expectedPwd);
    } else {
        const targetView = (roleName === 'superadmin' || roleName === 'dinkes') ? 'dashboard' : 'list';
        updateState({ role: roleName, view: targetView, currentPage: 1 });
    }
};

window.showPasswordModal = function (roleName, expectedPwd) {
    const roleLabels = {
        'fktp': 'FKTP',
        'rsud': 'RSUD Grati',
        'bidan': 'Bidan Desa',
        'dinkes': 'Pengawas (Dinkes)',
        'superadmin': 'Superadmin',
        'faskes_rujukan': 'RS Rujukan Lanjutan Tipe A / B'
    };
    const displayRole = roleLabels[roleName] || roleName.toUpperCase();

    const modalHtml = `
        <div id="pwd-modal" class="modal-overlay fade-in" style="z-index: 1000;">
            <div class="modal-content scale-in" style="max-width: 400px; text-align: center; border-radius: 16px; padding: 2.5rem 2rem;">
                <div style="font-size: 3.5rem; margin-bottom: 1rem; line-height: 1;">🔐</div>
                <h3 class="modal-title" style="margin-bottom: 0.5rem; font-size: 1.4rem; color: #0f172a;">Akses Terbatas</h3>
                <p style="margin-bottom: 1.5rem; color: #64748b; font-size: 0.95rem;">
                    Silakan masukkan kata sandi untuk masuk sebagai <br><strong style="color: #3b82f6; font-size: 1.05rem;">${displayRole}</strong>
                </p>
                <div class="form-group" style="text-align: left; margin-bottom: 0;">
                    <input type="password" id="modal-pwd-input" class="form-input" placeholder="Ketik kata sandi..." style="text-align: center; font-size: 1.1rem; padding: 0.75rem; letter-spacing: 2px; border-radius: 8px;">
                    <div id="pwd-error" style="color: #ef4444; font-size: 0.85rem; margin-top: 0.5rem; display: none; text-align: center; font-weight: 500;">Password salah! Silakan coba lagi.</div>
                </div>
                <div class="modal-actions" style="margin-top: 2rem; display: flex; gap: 1rem;">
                    <button class="btn-cancel" onclick="document.getElementById('pwd-modal').remove()" style="flex: 1; border-radius: 8px; padding: 0.75rem;">Batal</button>
                    <button class="btn-primary" id="modal-pwd-submit" style="flex: 1; border-radius: 8px; padding: 0.75rem;">Masuk</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const input = document.getElementById('modal-pwd-input');
    const submitBtn = document.getElementById('modal-pwd-submit');
    const errorMsg = document.getElementById('pwd-error');

    input.focus();

    const checkPassword = () => {
        if (input.value === expectedPwd) {
            document.getElementById('pwd-modal').remove();
            const targetView = (roleName === 'superadmin' || roleName === 'dinkes') ? 'dashboard' : 'list';
            updateState({ role: roleName, view: targetView, currentPage: 1 });
        } else {
            errorMsg.style.display = 'block';
            input.classList.add('error-blink');
            setTimeout(() => input.classList.remove('error-blink'), 1000);
            input.value = '';
            input.focus();
        }
    };

    submitBtn.onclick = checkPassword;
    input.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') checkPassword();
    });
};

window.exitApp = function () {
    showConfirmModal(
        "🚪",
        "Keluar Aplikasi?",
        "Pastikan semua data sudah terisi dengan benar dan tersimpan sebelum Anda keluar.",
        "Ya, Keluar",
        "btn-danger",
        () => {
            updateState({ role: null, view: 'login' });
        }
    );
};

window.viewPatient = function (noRm) {
    updateState({ view: 'detail', selectedRm: noRm });
};

window.addControl = function (sourceRole) {
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
        jenis_kelamin: lastRecord.jenis_kelamin,
        no_register: lastRecord.no_register
    };

    updateState({ view: 'form', formData: newForm, isPerburukan: false });
};

window.addPerburukan = function () {
    const patient = state.patients.find(p => p.no === state.selectedRm);
    const lastRecord = patient.history[patient.history.length - 1];

    const newForm = {
        ...emptyForm,
        // Tahap 1 (Identitas Tetap)
        no: lastRecord.no,
        nama_pasien: lastRecord.nama_pasien,
        tgl_lahir: lastRecord.tgl_lahir,
        jenis_kelamin: lastRecord.jenis_kelamin,
        no_register: lastRecord.no_register,
        
        // Tahap 2 (Riwayat Kehamilan & Persalinan Tetap)
        umur_kehamilan: lastRecord.umur_kehamilan,
        bb_lahir: lastRecord.bb_lahir,
        hamil_ke: lastRecord.hamil_ke,
        jenis_kehamilan: lastRecord.jenis_kehamilan,
        cara_lahir: lastRecord.cara_lahir,
        indikasi_ibu: lastRecord.indikasi_ibu,
        apgar_score: lastRecord.apgar_score,
        mendapat_resusitasi: lastRecord.mendapat_resusitasi
    };

    updateState({ view: 'form', formData: newForm, isPerburukan: true });
};

window.editRecord = function (id) {
    const record = state.records.find(r => r.id === id);
    if (record) {
        let formData = { ...record };
        if (!formData.nama_faskes_rujukan && formData.status_rujukan && formData.status_rujukan.includes(' - ')) {
            const parts = formData.status_rujukan.split(' - ');
            formData.status_rujukan = parts[0];
            formData.nama_faskes_rujukan = parts.slice(1).join(' - ');
        }
        updateState({ view: 'form', formData: formData, isPerburukan: false });
    }
};

window.deleteRecord = function (id) {
    if (state.role !== 'superadmin') {
        showAlertModal("⛔", "Akses Ditolak", "Hanya Super Admin yang dapat menghapus data.");
        return;
    }
    
    showConfirmModal(
        "⚠️", 
        "Hapus Data Permanen", 
        "Apakah Anda yakin ingin menghapus catatan rekam medis ini secara permanen? Data yang dihapus tidak dapat dikembalikan.", 
        "Ya, Hapus", 
        "btn-danger", 
        async () => {
            updateState({ isSubmitting: true });
            
            try {
                const response = await fetch(scriptURL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'delete_record', id: id })
                });
                const result = await response.json();
                
                if (result.status === 'success') {
                    showAlertModal("✅", "Berhasil", result.message, async () => {
                        await loadData();
                        updateState({ isSubmitting: false, view: state.selectedRm ? 'detail' : 'list' });
                    });
                } else {
                    showAlertModal("❌", "Gagal Menghapus", result.message);
                    updateState({ isSubmitting: false });
                }
            } catch (error) {
                console.error('Submit Error:', error);
                showAlertModal("📡", "Gangguan Jaringan", "Terjadi kesalahan jaringan. Silakan periksa koneksi internet Anda.");
                updateState({ isSubmitting: false });
            }
        }
    );
};

window.submitForm = async function (e) {
    e.preventDefault();

    // Validation
    const form = e.target;
    const inputs = form.querySelectorAll('input:not([type="file"]):not([disabled]):not([type="checkbox"]), select:not([disabled]), textarea:not([disabled])');
    const optionalFields = ['kelainan_kongenital', 'indikasi_ibu', 'diagnosa_rujukan', 'terapi_lain', 'tanda_kegawatan', 'tindakan_kegawatan', 'desa_bidan_pj'];
    let hasError = false;

    inputs.forEach(input => {
        input.classList.remove('error-blink');
        if (!optionalFields.includes(input.id) && !input.value.trim()) {
            hasError = true;
            if (state.role !== 'superadmin') {
                input.classList.add('error-blink');
            }
        }
    });

    if (hasError && state.role !== 'superadmin') {
        showAlertModal("⚠️", "Data Belum Lengkap", "Terdapat data wajib yang belum diisi. Mohon periksa kolom yang berkedip merah.");
        return;
    }

    showConfirmModal(
        "📝", 
        "Konfirmasi Simpan", 
        "Apakah data yang Anda input sudah benar?<br><br>Pilih 'Ya, Simpan' untuk mengirim, atau 'Batal' untuk mengecek kembali.", 
        "Ya, Simpan", 
        "btn-primary-modal", 
        async () => {
            updateState({ isSubmitting: true });

            const payload = { ...state.formData };

            try {
                const response = await fetch(scriptURL, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                const result = await response.json();

                if (result.status === 'success') {
                    showAlertModal("✅", "Berhasil", result.message, async () => {
                        await loadData();
                        updateState({ isSubmitting: false, view: state.selectedRm ? 'detail' : 'list' });
                    });
                } else {
                    showAlertModal("❌", "Gagal Disimpan", "Terjadi kesalahan pada server: " + result.message);
                    updateState({ isSubmitting: false });
                }
            } catch (error) {
                console.error("Error:", error);
                showAlertModal("📡", "Gangguan Jaringan", "Gagal mengirim data. Pastikan koneksi internet Anda stabil.");
                updateState({ isSubmitting: false });
            }
        }
    );
};

window.showRujukanModal = function (noRm) {
    const patient = state.patients.find(p => p.no === noRm);
    if (!patient) return;

    const modalHtml = `
        <div id="rujukan-modal" class="modal-overlay fade-in">
            <div class="modal-content scale-in" style="max-width: 400px; text-align: left;">
                <h3 class="modal-title" style="margin-bottom: 1rem;">Opsi Rujukan Pasien</h3>
                <p style="margin-bottom: 1rem; color: var(--text-secondary);">Tandai rujukan untuk <strong>${patient.nama_pasien}</strong></p>
                <div class="form-group">
                    <label class="checkbox-label" style="margin-bottom: 1rem;">
                        <input type="checkbox" id="modal-is-dirujuk" ${patient.is_dirujuk ? 'checked' : ''} onchange="document.getElementById('modal-lokasi').disabled = !this.checked">
                        <span class="checkbox-text" style="font-weight: 600; color: #ef4444;">Pasien Dirujuk ke Faskes Lanjutan</span>
                    </label>
                </div>
                <div class="form-group">
                    <label class="form-label">Lokasi Rujukan (Ketik Manual)</label>
                    <input type="text" class="form-input" id="modal-lokasi" placeholder="Misal: RSUD Saiful Anwar" value="${patient.lokasi_rujukan_lanjutan || ''}" ${patient.is_dirujuk ? '' : 'disabled'}>
                </div>
                <div class="modal-actions" style="margin-top: 1.5rem; justify-content: flex-end;">
                    <button class="btn-cancel" onclick="document.getElementById('rujukan-modal').remove()">Batal</button>
                    <button class="btn-primary" onclick="simpanRujukan('${noRm}')">Simpan</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.simpanRujukan = async function (noRm) {
    const patient = state.patients.find(p => p.no === noRm);
    if (!patient || patient.history.length === 0) return;

    const isDirujuk = document.getElementById('modal-is-dirujuk').checked;
    const lokasi = document.getElementById('modal-lokasi').value.trim();

    if (isDirujuk && !lokasi) {
        showAlertModal("⚠️", "Perhatian", "Mohon ketik lokasi rujukan!");
        return;
    }

    // Ambil record terakhir untuk di-update
    const lastRecord = { ...patient.history[patient.history.length - 1] };
    lastRecord.is_dirujuk = isDirujuk;
    lastRecord.lokasi_rujukan_lanjutan = isDirujuk ? lokasi : '';

    const btnSimpan = document.querySelector('#rujukan-modal .btn-primary');
    btnSimpan.textContent = 'Menyimpan...';
    btnSimpan.disabled = true;

    try {
        const response = await fetch(scriptURL, {
            method: 'POST',
            body: JSON.stringify(lastRecord)
        });
        const result = await response.json();

        if (result.status === 'success') {
            showAlertModal("✅", "Berhasil", "Status Rujukan Berhasil Disimpan", async () => {
                document.getElementById('rujukan-modal').remove();
                await loadData();
                updateState({}); // force re-render
            });
        } else {
            showAlertModal("❌", "Gagal", "Gagal menyimpan: " + result.message);
            btnSimpan.textContent = 'Simpan';
            btnSimpan.disabled = false;
        }
    } catch (error) {
        console.error("Error:", error);
        showAlertModal("📡", "Gangguan Jaringan", "Terjadi kesalahan koneksi.");
        btnSimpan.textContent = 'Simpan';
        btnSimpan.disabled = false;
    }
};

// --- 6. INITIAL RENDER ---
async function loadData() {
    try {
        const res = await fetch(scriptURL);
        const json = await res.json();
        if (json.status === 'success') {
            if (json.settings) state.settings = json.settings;
            processRecords(json.data);
        }
    } catch (e) {
        console.error('Failed to load data', e);
        // If it fails (CORS, offline), start empty
        processRecords([]);
    }
}

window.initApp = async function () {
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
        } else if (state.view === 'dashboard') {
            html += renderDashboard();
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

    if (state.view === 'dashboard') {
        setTimeout(initDashboardCharts, 50);
    }
}

window.exportToPDF = function () {
    if (typeof jspdf === 'undefined') {
        showAlertModal("⚠️", "Library Belum Siap", "Library PDF belum termuat sempurna. Silakan muat ulang halaman.");
        return;
    }

    // Ambil data yang tersaring
    let filtered = state.patients.filter(p =>
        p.nama_pasien.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        p.no.toLowerCase().includes(state.searchQuery.toLowerCase())
    );
    if (state.filterStartDate && state.filterEndDate) {
        const start = new Date(state.filterStartDate).getTime();
        const end = new Date(state.filterEndDate).setHours(23, 59, 59, 999);
        filtered = filtered.filter(p => p.history.some(h => {
            const dateRS = new Date(h.tgl_kunjungan_rs).getTime();
            const dateBidan = new Date(h.tgl_kunjungan_bidan).getTime();
            return (!isNaN(dateRS) && dateRS >= start && dateRS <= end) ||
                (!isNaN(dateBidan) && dateBidan >= start && dateBidan <= end);
        }));
    }
    if (state.role === 'faskes_rujukan') filtered = filtered.filter(p => p.is_dirujuk === true);

    const doc = new jspdf.jsPDF({ orientation: "landscape", format: "f4" });

    doc.setFontSize(16);
    doc.text("Laporan Pasien NEO-LINK RSUD GRATI", 14, 20);
    doc.setFontSize(10);
    let subtitle = "Semua Tanggal";
    if (state.filterStartDate && state.filterEndDate) {
        subtitle = `Periode: ${state.filterStartDate} s/d ${state.filterEndDate}`;
    }
    doc.text(subtitle, 14, 28);

    const tableData = filtered.map((p, idx) => {
        const lastRecord = p.history[p.history.length - 1];
        let kondisi = lastRecord.tgl_kunjungan_bidan ? lastRecord.hasil : (lastRecord.kondisi_krs || 'Selesai Rawat');
        let rujukan = p.is_dirujuk ? `Dirujuk: ${p.lokasi_rujukan_lanjutan}` : '-';
        return [
            idx + 1,
            p.no,
            p.nama_pasien,
            formatForDateInput(p.tgl_lahir),
            lastRecord.diagnosa_akhir || lastRecord.diagnosa_awal || '-',
            kondisi,
            rujukan
        ];
    });

    doc.autoTable({
        startY: 35,
        head: [['No', 'No RM', 'Nama Pasien', 'Tgl Lahir', 'Diagnosa Terakhir', 'Kondisi Akhir', 'Status Rujukan']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 58, 138], halign: 'center' },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 25 },
            2: { cellWidth: 40 },
            3: { cellWidth: 35 },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 40 },
            6: { cellWidth: 40 }
        },
        margin: { top: 35, right: 14, bottom: 15, left: 14 }
    });

    doc.save(`Laporan_NEO_LINK_${new Date().getTime()}.pdf`);
};

window.exportToExcel = function () {
    if (typeof XLSX === 'undefined') {
        showAlertModal("⚠️", "Library Belum Siap", "Library Excel belum termuat sempurna. Silakan muat ulang halaman.");
        return;
    }

    let filtered = state.patients.filter(p => p.nama_pasien.toLowerCase().includes(state.searchQuery.toLowerCase()) || p.no.toLowerCase().includes(state.searchQuery.toLowerCase()));
    if (state.filterStartDate && state.filterEndDate) {
        const start = new Date(state.filterStartDate).getTime();
        const end = new Date(state.filterEndDate).setHours(23, 59, 59, 999);
        filtered = filtered.filter(p => p.history.some(h => {
            const dateRS = new Date(h.tgl_kunjungan_rs).getTime();
            const dateBidan = new Date(h.tgl_kunjungan_bidan).getTime();
            return (!isNaN(dateRS) && dateRS >= start && dateRS <= end) || (!isNaN(dateBidan) && dateBidan >= start && dateBidan <= end);
        }));
    }
    if (state.role === 'faskes_rujukan') filtered = filtered.filter(p => p.is_dirujuk === true);

    const data = filtered.map((p, idx) => {
        const last = p.history[p.history.length - 1];
        return {
            "No": idx + 1,
            "No RM": p.no,
            "Nama Pasien": p.nama_pasien,
            "Tgl Lahir": formatForDateInput(p.tgl_lahir),
            "Jenis Kelamin": last.jenis_kelamin || '',
            "BB Lahir": last.bb_lahir || '',
            "PB Lahir": last.pb_lahir || '',
            "Cara Lahir": last.cara_lahir || '',
            "Tgl Kunjungan RS": formatForDateInput(last.tgl_kunjungan_rs) || '',
            "Diagnosa Awal": last.diagnosa_awal || '',
            "Terapi Tahap 1 RS": last.terapi_tahap_1_rs || '',
            "Terapi Tahap 2 RS": last.terapi_tahap_2_rs || '',
            "Terapi Tahap 3 RS": last.terapi_tahap_3_rs || '',
            "Terapi Tahap 4 RS": last.terapi_tahap_4_rs || '',
            "Alat Nafas": last.alat_nafas || '',
            "Kondisi KRS": last.kondisi_krs || '',
            "Diagnosa Akhir": last.diagnosa_akhir || '',
            "PMK": last.pmk || '',
            "Minum": last.minum || '',
            "Imunisasi": last.imunisasi || '',
            "Nama Petugas RS": last.nama_petugas_rs || '',
            "Kontak Petugas RS": last.kontak_petugas_rs || '',
            "Tgl Kunjungan Bidan": formatForDateInput(last.tgl_kunjungan_bidan) || '',
            "Keadaan Umum": last.keadaan_umum || '',
            "Suhu": last.suhu || '',
            "Nadi": last.nadi || '',
            "Pernafasan": last.pernafasan || '',
            "BB Kunjungan": last.bb_kunjungan || '',
            "PB Kunjungan": last.pb_kunjungan || '',
            "Kemampuan Menyusu": last.kemampuan_menyusu || '',
            "Kemampuan Ibu Menyusui": last.kemampuan_ibu_menyusui || '',
            "Tanda Kegawatan": last.tanda_kegawatan || '',
            "Tindakan Kegawatan": last.tindakan_kegawatan || '',
            "Hasil": last.hasil || '',
            "Kontrol": last.kontrol || '',
            "Nama Bidan": last.nama_bidan || '',
            "Kontak Bidan": last.kontak_bidan || '',
            "Is Dirujuk Lanjutan": p.is_dirujuk ? 'TRUE' : 'FALSE',
            "Lokasi Rujukan Lanjutan": p.lokasi_rujukan_lanjutan || '',
            "Diagnosa Rujukan": p.diagnosa_rujukan || '',
            "Status Rujukan": p.status_rujukan || ''
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pasien");
    XLSX.writeFile(workbook, `Laporan_NEO_LINK_${new Date().getTime()}.xlsx`);
};

window.showAccountManager = function () {
    const roles = ['fktp', 'rsud', 'bidan', 'dinkes', 'superadmin', 'faskes_rujukan'];
    const roleLabels = {
        'fktp': 'FKTP',
        'rsud': 'RSUD Grati',
        'bidan': 'Bidan Desa',
        'dinkes': 'Pengawas (Dinkes)',
        'superadmin': 'Superadmin',
        'faskes_rujukan': 'RS Rujukan Lanjutan Tipe A / B'
    };

    let rowsHtml = roles.map(r => {
        const set = state.settings.find(s => s.role === r) || { requires_password: false, password: '' };
        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>${roleLabels[r]}</strong><input type="hidden" class="set-role" value="${r}"></td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align:center;">
                    <select class="form-select set-req" onchange="document.getElementById('pwd-${r}').disabled = (this.value === 'TIDAK')" style="width: auto;">
                        <option value="YA" ${set.requires_password ? 'selected' : ''}>YA</option>
                        <option value="TIDAK" ${!set.requires_password ? 'selected' : ''}>TIDAK</option>
                    </select>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                    <input type="text" class="form-input set-pwd" id="pwd-${r}" value="${set.password}" ${!set.requires_password ? 'disabled' : ''} placeholder="Masukkan password">
                </td>
            </tr>
        `;
    }).join('');

    const modalHtml = `
        <div id="account-modal" class="modal-overlay fade-in" style="z-index: 1000;">
            <div class="modal-content scale-in" style="max-width: 600px; text-align: left; width: 90%;">
                <h3 class="modal-title" style="margin-bottom: 1rem;">⚙️ Manajemen Akun & Password</h3>
                <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                    Atur kewajiban password dan ubah kata sandi untuk masing-masing peran pengguna di sini.
                </p>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8fafc; text-align: left;">
                                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Peran (Role)</th>
                                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; text-align:center;">Perlu Password?</th>
                                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Password</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
                <div class="modal-actions" style="margin-top: 1.5rem; justify-content: flex-end;">
                    <button class="btn-cancel" onclick="document.getElementById('account-modal').remove()">Batal</button>
                    <button class="btn-primary" onclick="saveAccountSettings()">Simpan Pengaturan</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.saveAccountSettings = async function () {
    const modal = document.getElementById('account-modal');
    const roleInputs = modal.querySelectorAll('.set-role');
    const reqInputs = modal.querySelectorAll('.set-req');
    const pwdInputs = modal.querySelectorAll('.set-pwd');

    let newSettings = [];
    for (let i = 0; i < roleInputs.length; i++) {
        const role = roleInputs[i].value;
        const req = reqInputs[i].value;
        const pwd = pwdInputs[i].value.trim();

        if (req === 'YA' && !pwd) {
            showAlertModal("⚠️", "Input Tidak Valid", `Password untuk ${role} tidak boleh kosong jika diwajibkan!`);
            return;
        }

        newSettings.push([role, req, req === 'YA' ? pwd : '']);
    }

    const btn = modal.querySelector('.btn-primary');
    btn.textContent = "Menyimpan...";
    btn.disabled = true;

    try {
        const response = await fetch(scriptURL, {
            method: 'POST',
            body: JSON.stringify({ action: 'update_settings', settings: newSettings })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showAlertModal("✅", "Berhasil", "Pengaturan akun berhasil disimpan.", async () => {
                document.getElementById('account-modal').remove();
                await loadData();
            });
        } else {
            showAlertModal("❌", "Gagal", "Gagal menyimpan: " + result.message);
            btn.textContent = "Simpan Pengaturan";
            btn.disabled = false;
        }
    } catch (e) {
        showAlertModal("📡", "Gangguan Jaringan", "Terjadi kesalahan jaringan.");
        btn.textContent = "Simpan Pengaturan";
        btn.disabled = false;
    }
};

// --- DASHBOARD FUNCTIONS ---
function renderDashboard() {
    return `
        <div class="fade-in dashboard-container">
            <div class="dashboard-toolbar" style="display: flex; gap: 1rem; align-items: center; margin-bottom: 2rem; background: white; padding: 1rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); flex-wrap: wrap;">
                <span style="font-weight: 600; font-size: 1.1rem; color: var(--text-main);">Filter Statistik:</span>
                <select class="form-select" style="width: auto;" onchange="updateState({dashboardMonth: this.value})">
                    <option value="all" ${state.dashboardMonth === 'all' ? 'selected' : ''}>Semua Bulan</option>
                    <option value="0" ${state.dashboardMonth == '0' ? 'selected' : ''}>Januari</option>
                    <option value="1" ${state.dashboardMonth == '1' ? 'selected' : ''}>Februari</option>
                    <option value="2" ${state.dashboardMonth == '2' ? 'selected' : ''}>Maret</option>
                    <option value="3" ${state.dashboardMonth == '3' ? 'selected' : ''}>April</option>
                    <option value="4" ${state.dashboardMonth == '4' ? 'selected' : ''}>Mei</option>
                    <option value="5" ${state.dashboardMonth == '5' ? 'selected' : ''}>Juni</option>
                    <option value="6" ${state.dashboardMonth == '6' ? 'selected' : ''}>Juli</option>
                    <option value="7" ${state.dashboardMonth == '7' ? 'selected' : ''}>Agustus</option>
                    <option value="8" ${state.dashboardMonth == '8' ? 'selected' : ''}>September</option>
                    <option value="9" ${state.dashboardMonth == '9' ? 'selected' : ''}>Oktober</option>
                    <option value="10" ${state.dashboardMonth == '10' ? 'selected' : ''}>November</option>
                    <option value="11" ${state.dashboardMonth == '11' ? 'selected' : ''}>Desember</option>
                </select>
                <select class="form-select" style="width: auto;" onchange="updateState({dashboardYear: this.value})">
                    ${[0, 1, 2, 3, 4].map(offset => {
        const yr = new Date().getFullYear() - offset;
        return '<option value="' + yr + '" ' + (state.dashboardYear == yr ? 'selected' : '') + '>' + yr + '</option>';
    }).join('')}
                </select>
                <div style="margin-left: auto; font-size: 1.2rem; font-weight: bold; color: #1e3a8a; background: #eff6ff; padding: 0.5rem 1rem; border-radius: 8px;">
                    Total Pasien: <span id="dash-total" style="font-size: 1.5rem; color: #3b82f6;">0</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h3 style="text-align: center; margin-bottom: 1rem; color: var(--text-main);">Jenis Kelamin</h3>
                    <div style="position: relative; height: 250px;"><canvas id="chart-jk"></canvas></div>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h3 style="text-align: center; margin-bottom: 1rem; color: var(--text-main);">Cara Lahir</h3>
                    <div style="position: relative; height: 250px;"><canvas id="chart-lahir"></canvas></div>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h3 style="text-align: center; margin-bottom: 1rem; color: var(--text-main);">Pasang Alat Nafas (RSUD)</h3>
                    <div style="position: relative; height: 250px;"><canvas id="chart-alat"></canvas></div>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h3 style="text-align: center; margin-bottom: 1rem; color: var(--text-main);">Kondisi Keluar RS (KRS)</h3>
                    <div style="position: relative; height: 250px;"><canvas id="chart-krs"></canvas></div>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h3 style="text-align: center; margin-bottom: 1rem; color: var(--text-main);">Pasien Dirujuk Lanjutan</h3>
                    <div style="position: relative; height: 250px;"><canvas id="chart-rujukan"></canvas></div>
                </div>
            </div>
        </div>
    `;
}

let dashCharts = {};
function initDashboardCharts() {
    if (typeof Chart === 'undefined') {
        setTimeout(initDashboardCharts, 200);
        return;
    }

    // Filter patients
    let patients = state.patients;
    if (state.dashboardYear) {
        patients = patients.filter(p => {
            const refDateStr = p.tgl_lahir || p.latest_krs;
            if (!refDateStr) return false;
            const d = new Date(refDateStr);
            if (isNaN(d.getTime())) return false;

            if (d.getFullYear() != state.dashboardYear) return false;
            if (state.dashboardMonth !== 'all' && d.getMonth() != state.dashboardMonth) return false;

            return true;
        });
    }

    const totalEl = document.getElementById('dash-total');
    if (totalEl) totalEl.textContent = patients.length;

    // Aggregate Data
    let jkCount = { 'Laki-laki': 0, 'Perempuan': 0, 'Ambiguous': 0 };
    let lahirCount = {};
    let alatCount = { 'T-Peace': 0, 'O2 Nasal': 0, 'CPAP/NIV': 0, 'Venti': 0, 'Nihil': 0 };
    let krsCount = {};
    let rujukCount = { 'Ya': 0, 'Tidak': 0 };

    patients.forEach(p => {
        // JK
        const last = p.history[p.history.length - 1];
        if (last.jenis_kelamin && last.jenis_kelamin.includes('L')) jkCount['Laki-laki']++;
        else if (last.jenis_kelamin && last.jenis_kelamin.includes('P')) jkCount['Perempuan']++;
        else if (last.jenis_kelamin) jkCount['Ambiguous']++;

        // Cara Lahir
        const lahir = last.cara_lahir || 'Tidak Diketahui';
        lahirCount[lahir] = (lahirCount[lahir] || 0) + 1;

        // Alat (Check if any history had alat)
        let hasAlat = false;
        p.history.forEach(h => {
            if (h.alat_tpeace) { alatCount['T-Peace']++; hasAlat = true; }
            if (h.alat_o2nasal) { alatCount['O2 Nasal']++; hasAlat = true; }
            if (h.alat_cpap) { alatCount['CPAP/NIV']++; hasAlat = true; }
            if (h.alat_venti) { alatCount['Venti']++; hasAlat = true; }
        });
        if (!hasAlat) alatCount['Nihil']++;

        // KRS
        const krs = last.kondisi_krs || 'Belum KRS';
        let groupKrs = 'Lainnya';
        if (krs.includes('HIDUP')) groupKrs = 'HIDUP';
        else if (krs.includes('MENINGGAL')) groupKrs = 'MENINGGAL';
        else groupKrs = krs;
        krsCount[groupKrs] = (krsCount[groupKrs] || 0) + 1;

        // Rujukan
        if (p.is_dirujuk) rujukCount['Ya']++;
        else rujukCount['Tidak']++;
    });

    // Helper to draw/update charts
    const createOrUpdate = (id, type, labels, data, colors) => {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (dashCharts[id]) {
            dashCharts[id].destroy();
        }
        dashCharts[id] = new Chart(ctx, {
                type: type,
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: type === 'pie' || type === 'doughnut' ? 'right' : 'bottom' } },
                    scales: (type === 'bar') ? { y: { beginAtZero: true, ticks: { stepSize: 1 } } } : {}
                }
            });
    };

    createOrUpdate('chart-jk', 'doughnut', Object.keys(jkCount), Object.values(jkCount), ['#3b82f6', '#ec4899', '#f59e0b']);
    createOrUpdate('chart-lahir', 'bar', Object.keys(lahirCount), Object.values(lahirCount), ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']);
    createOrUpdate('chart-alat', 'bar', Object.keys(alatCount), Object.values(alatCount), ['#6366f1', '#06b6d4', '#14b8a6', '#f43f5e', '#94a3b8']);
    createOrUpdate('chart-krs', 'pie', Object.keys(krsCount), Object.values(krsCount), ['#10b981', '#ef4444', '#f59e0b', '#64748b']);
    createOrUpdate('chart-rujukan', 'doughnut', Object.keys(rujukCount), Object.values(rujukCount), ['#ef4444', '#10b981']);
}

window.setPatientStatus = function(rmNo, status) {
    showConfirmModal(
        "🔄",
        "Ubah Status Pasien",
        `Apakah Anda yakin ingin mengatur status akhir pasien ini menjadi "<strong>${status}</strong>"?`,
        "Ya, Ubah Status",
        "btn-primary-modal",
        async () => {
            try {
                const response = await fetch(scriptURL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'set_status',
                        no: rmNo,
                        status_akhir_superadmin: status
                    })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    showAlertModal("✅", "Berhasil", "Status pasien berhasil diupdate!", async () => {
                        await loadData();
                    });
                } else {
                    showAlertModal("❌", "Gagal", "Gagal mengupdate status: " + result.message);
                }
            } catch (e) {
                showAlertModal("📡", "Gangguan Jaringan", "Terjadi kesalahan jaringan saat mencoba menghubungi server.");
            }
        }
    );
};

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

// Prevent accidental refresh or close when filling out form
window.addEventListener('beforeunload', function (e) {
    if (state.view === 'form' && !state.isSubmitting) {
        e.preventDefault();
        e.returnValue = ''; // Standard way to show prompt
    }
});

// Handle Native Back Button (Hardware Back) di HP
window.addEventListener('popstate', function (event) {
    if (state.view === 'form' && !state.isSubmitting) {
        const confirmMsg = "Anda sedang mengisi data yang belum tersimpan. Yakin ingin membatalkan input dan kembali?";
        if (!confirm(confirmMsg)) {
            // Membatalkan tombol back dengan menekan state form kembali
            history.pushState({ view: 'form', selectedRm: state.selectedRm }, "");
            return;
        }
    }
    
    if (event.state && event.state.view) {
        updateState({ view: event.state.view, selectedRm: event.state.selectedRm || null }, false);
    } else {
        // Fallback jika state hilang tapi tidak di login
        if (state.role && state.view !== 'login') {
            updateState({ view: 'list' }, false);
        }
    }
});

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    startClock();
});
