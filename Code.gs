/**
 * Google Apps Script - MOMS-LINK
 * 
 * 1. Buka Google Sheet -> Extensions -> Apps Script
 * 2. Hapus semua kode bawaan (Code.gs) dan paste kode ini.
 * 3. Simpan dan klik "Deploy" -> "New Deployment"
 * 4. Pilih type "Web App".
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 5. Klik Deploy -> Authorize access.
 * 6. Salin "Web App URL" dan paste ke app.js di bagian scriptURL
 */

const SHEET_ID = '1VVZMK7w0rxot0oDorTGH5n1IpXtsUYt5jY3ALrWWJm8'; // ID Spreadsheet Anda
const FOLDER_ID = '1we_6zERMwwARcSBrocew7wpnye7kbbMr'; // ID Folder Drive untuk Foto Bayi

/**
 * JALANKAN FUNGSI INI SEKALI SAJA UNTUK MEMBUAT HEADER OTOMATIS
 * Caranya: Pilih fungsi 'setupHeader' di menu dropdown atas (sebelah tombol Run/Jalankan), lalu klik tombol Run.
 */
function setupHeader() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  const headers = [
    "ID Unik", "No. Urut / RM", "Nama Pasien Bayi", "Tanggal Lahir", "No. Register", 
    "Jenis Kelamin", "Tgl Kunjungan RS", "Umur Bayi", "Kelainan Kongenital", 
    "Umur Kehamilan (Minggu)", "Berat Badan Lahir (Gram)", "Hamil Ke-", "Jenis Kehamilan", 
    "Cara Lahir", "Indikasi Ibu", "Apgar Score", "Mendapat Resusitasi", "Status Rujukan Dari", 
    "Diagnosa Rujukan", "Terapi Infus", "Terapi Antibiotik", "Terapi Obat Kejang", 
    "Terapi Lainnya", "Diagnosa Awal (RSUD)", "Diagnosa Akhir (Ruang Rawat)", "Alat T-Peace", 
    "Alat O2 Nasal", "Alat CPAP/NIV", "Alat Venti", "Minum", "Imunisasi", "Cairan Parenteral", 
    "PMK (Metode Kanguru)", "Kondisi Bayi KRS", "Tanggal Kunjungan Bidan", 
    "Berat Badan (Gram)", "Panjang Badan (Cm)", "Keadaan Umum", 
    "Suhu (°C)", "Nadi (x/mnt)", "Pernafasan (x/mnt)", 
    "Kemampuan Bayi Menyusu", "Kemampuan Ibu Menyusui", "Pelaksanaan Metode Kanguru", 
    "Tanda Kegawatan Bayi", "Tindakan Kegawatan", "Hasil Pemantauan", 
    "Jadwal Kontrol Selanjutnya", "Foto RS 1", "Foto RS 2", "Foto Bidan 1", "Foto Bidan 2",
    "Nama Faskes Rujukan", "Nama Petugas RS", "Kontak Petugas RS", "Nama Bidan Pemantau", "Kontak Bidan",
    "Pasien Dirujuk Ke Luar", "Lokasi Rujukan Lanjutan", "Status Akhir (Superadmin)",
    "Kabupaten Bidan PJ", "Kecamatan Bidan PJ", "Desa Bidan PJ", "Nama Bidan PJ", "Kontak Bidan PJ",
    "Kabupaten Bidan Pemantau", "Kecamatan Bidan Pemantau", "Desa Bidan Pemantau",
    "Foto RS 3", "Foto RS 4", "Foto Bidan 3", "Foto Bidan 4"
  ];
  
  // Tulis header ke baris pertama (A1:AZ1)
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Percantik header (Bekukan baris pertama, tebalkan huruf, beri warna latar)
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
       .setFontWeight("bold")
       .setBackground("#eff6ff")
       .setFontColor("#1e3a8a");
}

function setupSettings() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    sheet = ss.insertSheet('Settings');
    const headers = ["Role", "Membutuhkan Password?", "Password"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#eff6ff").setFontColor("#1e3a8a");
    
    // Default data
    const defaults = [
      ["fktp", "TIDAK", ""],
      ["rsud", "TIDAK", ""],
      ["bidan", "TIDAK", ""],
      ["dinkes", "YA", "neoGrati321"],
      ["faskes_rujukan", "TIDAK", ""],
      ["superadmin", "YA", "@Nox86"]
    ];
    sheet.getRange(2, 1, defaults.length, 3).setValues(defaults);
  }
}

function processPhoto(fotoData, fileName, fileType, patientNo) {
  if (!fotoData) return "";
  if (fotoData.startsWith('http')) return fotoData; // Already uploaded
  
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const decodedData = Utilities.base64Decode(fotoData);
    const blob = Utilities.newBlob(decodedData, fileType, patientNo + "_" + fileName);
    const file = folder.createFile(blob);
    
    // Kadang Google Workspace memblokir public sharing, jika gagal biarkan saja (ambil URL-nya)
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      console.log("Warning: Gagal setSharing (mungkin dibatasi Domain/Workspace). URL tetap disimpan.");
    }
    
    return file.getUrl();
  } catch (e) {
    console.error("Gagal upload foto:", e);
    return "";
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // Handle Settings Update
    if (data.action === "update_settings") {
      const settingsSheet = ss.getSheetByName('Settings');
      if (settingsSheet) {
        settingsSheet.getRange(2, 1, Math.max(1, settingsSheet.getLastRow()), 3).clearContent();
        settingsSheet.getRange(2, 1, data.settings.length, 3).setValues(data.settings);
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Pengaturan akun berhasil disimpan" })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    const sheet = ss.getSheets()[0];

    // Handle Delete Record
    if (data.action === "delete_record" && data.id) {
      const dataRange = sheet.getDataRange().getValues();
      for (let i = 1; i < dataRange.length; i++) {
        if (dataRange[i][0] == data.id) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data berhasil dihapus dari sistem." })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Data tidak ditemukan." })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "set_status" && data.no) {
      const dataRange = sheet.getDataRange().getValues();
      let updated = false;
      // Loop through all records and update status_akhir_superadmin for matching RM (no)
      for (let i = 1; i < dataRange.length; i++) {
        if (dataRange[i][1] == data.no) {
          sheet.getRange(i + 1, 60).setValue(data.status_akhir_superadmin || ""); // 60 is column BH (Status Akhir Superadmin)
          updated = true;
        }
      }
      if (updated) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Status berhasil diupdate." })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Data pasien tidak ditemukan." })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Proses Upload 4 Kemungkinan Foto
    const urlRs1 = processPhoto(data.foto_rs_1, data.foto_rs_1_name, data.foto_rs_1_type, data.no);
    const urlRs2 = processPhoto(data.foto_rs_2, data.foto_rs_2_name, data.foto_rs_2_type, data.no);
    const urlRs3 = processPhoto(data.foto_rs_3, data.foto_rs_3_name, data.foto_rs_3_type, data.no);
    const urlRs4 = processPhoto(data.foto_rs_4, data.foto_rs_4_name, data.foto_rs_4_type, data.no);
    const urlBidan1 = processPhoto(data.foto_bidan_1, data.foto_bidan_1_name, data.foto_bidan_1_type, data.no);
    const urlBidan2 = processPhoto(data.foto_bidan_2, data.foto_bidan_2_name, data.foto_bidan_2_type, data.no);
    const urlBidan3 = processPhoto(data.foto_bidan_3, data.foto_bidan_3_name, data.foto_bidan_3_type, data.no);
    const urlBidan4 = processPhoto(data.foto_bidan_4, data.foto_bidan_4_name, data.foto_bidan_4_type, data.no);

    // Susun Baris Data Sesuai Header
    const rowData = [
      data.id || new Date().getTime(), // A: ID Unik
      data.no || "", // B
      data.nama_pasien || "", // C
      data.tgl_lahir || "", // D
      data.no_register || "", // E
      data.jenis_kelamin || "", // F
      data.tgl_kunjungan_rs || "", // G
      data.umur_bayi || "", // H
      data.kelainan_kongenital || "", // I
      
      data.umur_kehamilan || "", // J
      data.bb_lahir || "", // K
      data.hamil_ke || "", // L
      data.jenis_kehamilan || "", // M
      data.cara_lahir || "", // N
      data.indikasi_ibu || "", // O
      data.apgar_score || "", // P
      data.mendapat_resusitasi || "", // Q
      
      data.status_rujukan || "", // R
      data.diagnosa_rujukan || "", // S
      data.terapi_infus === true ? "YA" : "TIDAK", // T
      data.terapi_antibiotik === true ? "YA" : "TIDAK", // U
      data.terapi_obat_kejang === true ? "YA" : "TIDAK", // V
      data.terapi_lain || "", // W
      
      data.diagnosa_awal || "", // X
      data.diagnosa_akhir || "", // Y
      data.alat_tpeace === true ? "YA" : "TIDAK", // Z
      data.alat_o2nasal === true ? "YA" : "TIDAK", // AA
      data.alat_cpap === true ? "YA" : "TIDAK", // AB
      data.alat_venti === true ? "YA" : "TIDAK", // AC
      data.minum || "", // AD
      data.imunisasi || "", // AE
      data.cairan_parenteral || "", // AF
      data.pmk || "", // AG
      data.kondisi_krs || "", // AH
      
      data.tgl_kunjungan_bidan || "", // AI
      data.bb_kunjungan || "", // AJ
      data.pb_kunjungan || "", // AK
      data.keadaan_umum || "", // AL
      data.suhu || "", // AM
      data.nadi || "", // AN
      data.pernafasan || "", // AO
      data.kemampuan_menyusu || "", // AP
      data.kemampuan_ibu_menyusui || "", // AQ
      data.pelaksanaan_pmk || "", // AR
      data.tanda_kegawatan || "", // AS
      data.tindakan_kegawatan || "", // AT
      data.hasil || "", // AU
      data.kontrol || "", // AV
      
      urlRs1, // AW
      urlRs2, // AX
      urlBidan1, // AY
      urlBidan2, // AZ
      data.nama_faskes_rujukan || "", // BA
      data.nama_petugas_rs || "", // BB
      data.kontak_petugas_rs || "", // BC
      data.nama_bidan || "", // BD
      data.kontak_bidan || "", // BE
      data.is_dirujuk === true ? "YA" : "TIDAK", // BF
      data.lokasi_rujukan_lanjutan || "", // BG
      data.status_akhir_superadmin || "", // BH
      data.kabupaten_bidan_pj || "Pasuruan", // BI
      data.kecamatan_bidan_pj || "", // BJ
      data.desa_bidan_pj || "", // BK
      data.nama_bidan_pj || "", // BL
      data.kontak_bidan_pj || "", // BM
      data.kabupaten_bidan || "Pasuruan", // BN: 65
      data.kecamatan_bidan || "", // BO: 66
      data.desa_bidan || "", // BP: 67
      urlRs3, // BQ: 68
      urlRs4, // BR: 69
      urlBidan3, // BS: 70
      urlBidan4 // BT: 71
    ];

    let isUpdate = false;
    if (data.id) {
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] == data.id) {
          sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
          isUpdate = true;
          break;
        }
      }
    }

    if (!isUpdate) {
      // Jika data baru atau tambah riwayat/kontrol
      sheet.appendRow(rowData);
    }

    // Kembalikan Response Sukses, include final image URLs so frontend can update its state
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: isUpdate ? "Data Berhasil Diupdate" : "Data Berhasil Disimpan",
      data: Object.assign(data, {
          foto_rs_1: urlRs1,
          foto_rs_2: urlRs2,
          foto_rs_3: urlRs3,
          foto_rs_4: urlRs4,
          foto_bidan_1: urlBidan1,
          foto_bidan_2: urlBidan2,
          foto_bidan_3: urlBidan3,
          foto_bidan_4: urlBidan4
      })
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function formatDateStr(val) {
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return val || "";
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheets()[0];
    const dataRange = sheet.getDataRange();
    
    // Ambil Settings
    let settingsData = [];
    const settingsSheet = ss.getSheetByName('Settings');
    if (settingsSheet) {
      const sValues = settingsSheet.getDataRange().getValues();
      for (let i = 1; i < sValues.length; i++) {
        settingsData.push({
          role: sValues[i][0],
          requires_password: sValues[i][1] === "YA",
          password: sValues[i][2]
        });
      }
    }
    const values = dataRange.getValues();
    
    if (values.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const result = [];
    
    for (let i = 1; i < values.length; i++) {
      result.push({
        id: values[i][0],
        no: values[i][1],
        nama_pasien: values[i][2],
        tgl_lahir: formatDateStr(values[i][3]),
        no_register: values[i][4],
        jenis_kelamin: values[i][5],
        tgl_kunjungan_rs: formatDateStr(values[i][6]),
        umur_bayi: values[i][7],
        kelainan_kongenital: values[i][8],
        
        umur_kehamilan: values[i][9],
        bb_lahir: values[i][10],
        hamil_ke: values[i][11],
        jenis_kehamilan: values[i][12],
        cara_lahir: values[i][13],
        indikasi_ibu: values[i][14],
        apgar_score: values[i][15],
        mendapat_resusitasi: values[i][16],
        
        status_rujukan: values[i][17],
        diagnosa_rujukan: values[i][18],
        terapi_infus: values[i][19] === "YA",
        terapi_antibiotik: values[i][20] === "YA",
        terapi_obat_kejang: values[i][21] === "YA",
        terapi_lain: values[i][22],
        
        diagnosa_awal: values[i][23],
        diagnosa_akhir: values[i][24],
        alat_tpeace: values[i][25] === "YA",
        alat_o2nasal: values[i][26] === "YA",
        alat_cpap: values[i][27] === "YA",
        alat_venti: values[i][28] === "YA",
        minum: values[i][29],
        imunisasi: values[i][30],
        cairan_parenteral: values[i][31],
        pmk: values[i][32],
        kondisi_krs: values[i][33],
        
        tgl_kunjungan_bidan: formatDateStr(values[i][34]),
        bb_kunjungan: values[i][35],
        pb_kunjungan: values[i][36],
        keadaan_umum: values[i][37],
        suhu: values[i][38],
        nadi: values[i][39],
        pernafasan: values[i][40],
        kemampuan_menyusu: values[i][41],
        kemampuan_ibu_menyusui: values[i][42],
        pelaksanaan_pmk: values[i][43],
        tanda_kegawatan: values[i][44],
        tindakan_kegawatan: values[i][45],
        hasil: values[i][46],
        kontrol: values[i][47],
        
        foto_rs_1: values[i][48] || "",
        foto_rs_2: values[i][49] || "",
        foto_bidan_1: values[i][50] || "",
        foto_bidan_2: values[i][51] || "",
        foto_rs_3: values[i][68] || "",
        foto_rs_4: values[i][69] || "",
        foto_bidan_3: values[i][70] || "",
        foto_bidan_4: values[i][71] || "",
        
        nama_faskes_rujukan: values[i][52] || "",
        nama_petugas_rs: values[i][53] || "",
        kontak_petugas_rs: values[i][54] || "",
        nama_bidan: values[i][55] || "",
        kontak_bidan: values[i][56] || "",
        is_dirujuk: values[i][57] === "YA",
        lokasi_rujukan_lanjutan: values[i][58] || "",
        status_akhir_superadmin: values[i][59] || "",
        kabupaten_bidan_pj: values[i][60] || "Pasuruan",
        kecamatan_bidan_pj: values[i][61] || "",
        desa_bidan_pj: values[i][62] || "",
        nama_bidan_pj: values[i][63] || "",
        kontak_bidan_pj: values[i][64] || "",
        kabupaten_bidan: values[i][65] || "Pasuruan",
        kecamatan_bidan: values[i][66] || "",
        desa_bidan: values[i][67] || ""
      });
    }
    
    // Sort descending by ID so newest is first
    result.sort((a, b) => b.id - a.id);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result, settings: settingsData }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handler untuk Preflight (CORS)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}
