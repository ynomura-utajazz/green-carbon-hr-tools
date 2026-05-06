/**
 * Green Carbon HR Tools — Visa Manager GAS Backend
 * 
 * セットアップ手順:
 * 1. Google スプレッドシートを新規作成
 * 2. 拡張機能 → Apps Script を開く
 * 3. このコードを全て貼り付けて保存
 * 4. デプロイ → 新しいデプロイ → ウェブアプリ
 *    - 次のユーザーとして実行: 自分
 *    - アクセスできるユーザー: 全員
 * 5. デプロイURLをコピーして visa_manager.html の GAS_URL に設定
 */

// ==================== CORS & ROUTING ====================

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || '';
  const empId  = (e.parameter && e.parameter.empId)  || '';
  try {
    if (action === 'getAll')          return respond(getAll());
    if (action === 'getVisaRecords')  return respond(getVisaRecords());
    if (action === 'getDocStatuses')  return respond(getDocStatuses(empId));
    if (action === 'getAllDocStatuses') return respond(getAllDocStatuses());
    if (action === 'getMemos')        return respond(getMemos(empId));
    if (action === 'getAllMemos')     return respond(getAllMemos());
    if (action === 'ping')            return respond({ok: true, ts: new Date().toISOString()});
  } catch(err) {
    return respond({error: err.message});
  }
  return respond({error: 'Unknown GET action: ' + action});
}

function doPost(e) {
  const action = (e.parameter && e.parameter.action) || '';
  try {
    const body = JSON.parse(e.postData.contents);
    if (action === 'saveEmployee')     return respond(saveEmployee(body));
    if (action === 'deleteEmployee')   return respond(deleteEmployee(body.id));
    if (action === 'saveVisaRecord')   return respond(saveVisaRecord(body));
    if (action === 'saveAllEmployees') return respond(saveAllEmployees(body.employees));
    if (action === 'saveDocStatus')    return respond(saveDocStatus(body));
    if (action === 'saveMemo')         return respond(saveMemo(body));
  } catch(err) {
    return respond({error: err.message});
  }
  return respond({error: 'Unknown POST action: ' + action});
}

function respond(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ==================== HELPERS ====================

const VISA_COLS = [
  'id','name','nameKana','nationality','dept','title',
  'dob','joinDate','email','visaType','cardNo','expiry',
  'period','restriction','status','hrPic','history','updatedAt'
];

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    // ヘッダー行のスタイル設定
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1b4332')
      .setFontColor('white')
      .setFontWeight('bold');
  }
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0].map(h => String(h));
  return data.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const v = row[i];
        obj[h] = v instanceof Date
          ? Utilities.formatDate(v, 'Asia/Tokyo', 'yyyy-MM-dd')
          : (v === null || v === undefined ? '' : String(v));
      });
      return obj;
    })
    .filter(r => r.id && r.id !== '');
}

function formatDateField(v) {
  if (!v) return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Tokyo', 'yyyy-MM-dd');
  return String(v);
}

// ==================== getAll (一括取得 — 初期ロード用) ====================

function getAll() {
  const employees = getVisaRecords();
  const docStatuses = getAllDocStatuses();
  const memos = getAllMemos();
  const statuses = {};
  employees.forEach(e => { statuses[e.id] = e.status || 'pending'; });
  return { employees, docStatuses, memos, statuses };
}

// ==================== VISA RECORDS ====================

function getVisaRecords() {
  const sheet = getOrCreateSheet('VisaRecords', VISA_COLS);
  return sheetToObjects(sheet).map(r => {
    if (typeof r.history === 'string' && r.history) {
      try { r.history = JSON.parse(r.history); } catch(e) { r.history = []; }
    } else {
      r.history = r.history || [];
    }
    return r;
  });
}

function saveEmployee(emp) {
  const sheet = getOrCreateSheet('VisaRecords', VISA_COLS);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h));
  const idCol = headers.indexOf('id');

  emp.updatedAt = new Date().toISOString();
  const row = VISA_COLS.map(col => {
    if (col === 'history') return JSON.stringify(emp[col] || []);
    return emp[col] !== undefined ? emp[col] : '';
  });

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(emp.id)) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return {ok: true, action: 'updated'};
    }
  }
  sheet.appendRow(row);
  return {ok: true, action: 'created'};
}

function deleteEmployee(id) {
  const sheet = getOrCreateSheet('VisaRecords', VISA_COLS);
  const data  = sheet.getDataRange().getValues();
  const idCol = data[0].map(h => String(h)).indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return {ok: true};
    }
  }
  return {ok: false, error: 'Not found: ' + id};
}

function saveVisaRecord(body) {
  const sheet   = getOrCreateSheet('VisaRecords', VISA_COLS);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h));
  const idCol   = headers.indexOf('id');
  const stCol   = headers.indexOf('status');
  const upCol   = headers.indexOf('updatedAt');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(body.id)) {
      if (stCol >= 0) sheet.getRange(i + 1, stCol + 1).setValue(body.status);
      if (upCol >= 0) sheet.getRange(i + 1, upCol + 1).setValue(body.updatedAt || new Date().toISOString());
      return {ok: true};
    }
  }
  return {ok: false, error: 'Not found'};
}

function saveAllEmployees(employees) {
  if (!employees || !employees.length) return {ok: false, error: 'No data'};
  const sheet = getOrCreateSheet('VisaRecords', VISA_COLS);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);

  const rows = employees.map(emp => VISA_COLS.map(col => {
    if (col === 'history') return JSON.stringify(emp[col] || []);
    return emp[col] !== undefined ? emp[col] : '';
  }));
  sheet.getRange(2, 1, rows.length, VISA_COLS.length).setValues(rows);
  return {ok: true, count: rows.length};
}

// ==================== DOC STATUSES ====================

const DOC_COLS = ['empId','docId','status','updatedAt'];

function getAllDocStatuses() {
  const sheet = getOrCreateSheet('DocStatuses', DOC_COLS);
  const data  = sheetToObjects(sheet);
  // グループ化: { empId: { docId: status } }
  const result = {};
  data.forEach(r => {
    if (!result[r.empId]) result[r.empId] = {};
    result[r.empId][r.docId] = r.status;
  });
  return result;
}

function getDocStatuses(empId) {
  const all = getAllDocStatuses();
  return all[empId] || {};
}

function saveDocStatus(body) {
  const sheet   = getOrCreateSheet('DocStatuses', DOC_COLS);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h));
  const eCol    = headers.indexOf('empId');
  const dCol    = headers.indexOf('docId');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][eCol]) === String(body.empId) &&
        String(data[i][dCol]) === String(body.docId)) {
      sheet.getRange(i + 1, headers.indexOf('status') + 1).setValue(body.status);
      sheet.getRange(i + 1, headers.indexOf('updatedAt') + 1).setValue(body.updatedAt || new Date().toISOString());
      return {ok: true};
    }
  }
  sheet.appendRow([body.empId, body.docId, body.status, body.updatedAt || new Date().toISOString()]);
  return {ok: true};
}

// ==================== MEMOS ====================

const MEMO_COLS = ['empId','date','by','text','createdAt'];

function getAllMemos() {
  const sheet = getOrCreateSheet('Memos', MEMO_COLS);
  const data  = sheetToObjects(sheet);
  // グループ化: { empId: [{date,by,text},...] }
  const result = {};
  data.forEach(r => {
    if (!result[r.empId]) result[r.empId] = [];
    result[r.empId].push({date: r.date, by: r.by, text: r.text});
  });
  return result;
}

function getMemos(empId) {
  const all = getAllMemos();
  return all[empId] || [];
}

function saveMemo(body) {
  const sheet = getOrCreateSheet('Memos', MEMO_COLS);
  sheet.appendRow([
    body.empId,
    body.date || Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd'),
    body.by   || '',
    body.text || '',
    new Date().toISOString()
  ]);
  return {ok: true};
}

// ==================== 初回セットアップ用ユーティリティ ====================

/**
 * スプレッドシートのメニューに「ビザ管理」を追加
 * スクリプトを保存後、一度手動で実行してください
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🛂 ビザ管理')
    .addItem('シートを初期化', 'initSheets')
    .addItem('接続テスト', 'testConnection')
    .addToUi();
}

function initSheets() {
  getOrCreateSheet('VisaRecords',  VISA_COLS);
  getOrCreateSheet('DocStatuses',  DOC_COLS);
  getOrCreateSheet('Memos',        MEMO_COLS);
  SpreadsheetApp.getUi().alert('✅ シートを初期化しました。\n\nVisaRecords / DocStatuses / Memos の3シートが作成されました。');
}

function testConnection() {
  const result = getAll();
  const msg = '✅ 接続テスト成功\n\n'
    + '社員数: ' + result.employees.length + ' 名\n'
    + '書類ステータス件数: ' + Object.keys(result.docStatuses).length + ' 名分\n'
    + 'メモ件数: ' + Object.keys(result.memos).length + ' 名分';
  SpreadsheetApp.getUi().alert(msg);
}
