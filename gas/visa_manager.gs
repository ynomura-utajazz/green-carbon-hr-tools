// =============================================================
// visa_manager.gs  ―  Green Carbon HR Tools バックエンド
// Google Apps Script  /  スプレッドシート連携
// =============================================================
// デプロイ: ウェブアプリとして公開（全員がアクセス可能）
// =============================================================

var SS_ID    = "";  // 空のままでよい（スクリプトに紐付いたSSを使用）
var SHEET_EMPLOYEES  = "社員マスタ";
var SHEET_DOCS       = "書類ステータス";
var SHEET_MEMOS      = "メモ";
var SHEET_VISAS      = "在留情報";

var VISA_COLS = [
  "id","name","nameKana","nationality","dept","title",
  "dob","joinDate","email","visaType","cardNo","expiry",
  "period","restriction","status","hrPic","history","updatedAt"
];

// ── エントリポイント ──────────────────────────────────────────────

function doGet(e) {
  var params = e.parameter || {};
  var action = params.action || "";

  // freee OAuth2 コールバック
  if (params.code && params.state) {
    return handleFreeeCallback(params);
  }

  // freee 認証リダイレクト
  if (action === "freeeAuth") {
    try {
      var authUrl = getFreeeAuthUrl();
      return HtmlService.createHtmlOutput(
        '<html><head><meta http-equiv="refresh" content="0;url=' + authUrl + '"></head>' +
        '<body>freee認証ページへリダイレクト中...' +
        '<br><a href="' + authUrl + '">クリックして続行</a></body></html>'
      );
    } catch(err) {
      return HtmlService.createHtmlOutput("<h2>エラー</h2><p>" + err.message + "</p>");
    }
  }

  // データ取得 API
  try {
    switch(action) {
      case "ping":        return respond({ok: true, ts: new Date().toISOString()});
      case "getAll":      return respond(getAll());
      case "getVisaRecords":   return respond(getVisaRecords(params.empId));
      case "getDocStatuses":   return respond(getDocStatuses(params.empId));
      case "getAllDocStatuses": return respond(getAllDocStatuses());
      case "getMemos":    return respond(getMemos(params.empId));
      case "getAllMemos":  return respond(getAllMemos());
      case "freeeStatus": return respond(getFreeeStatus());
      case "freeeSync":   return respond(syncFromFreee());
      default:            return respond({error: "unknown action: " + action});
    }
  } catch(err) {
    return respond({error: err.message});
  }
}

function doPost(e) {
  var body   = {};
  var action = "";
  try {
    body   = JSON.parse(e.postData.contents);
    action = body.action || "";
  } catch(err) {
    return respond({error: "JSON parse error: " + err.message});
  }

  try {
    switch(action) {
      case "saveEmployee":     return respond(saveEmployee(body.employee));
      case "deleteEmployee":   return respond(deleteEmployee(body.empId));
      case "saveAllEmployees": return respond(saveAllEmployees(body.employees));
      case "saveDocStatus":    return respond(saveDocStatus(body.empId, body.docKey, body.status));
      case "saveMemo":         return respond(saveMemo(body.empId, body.memo));
      case "saveVisaRecord":   return respond(saveVisaRecord(body.record));
      default:                 return respond({error: "unknown action: " + action});
    }
  } catch(err) {
    return respond({error: err.message});
  }
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── getAll: 初回ロード用一括取得 ─────────────────────────────────

function getAll() {
  var employees  = getEmployees();
  var docStatuses = {};
  var memos       = {};

  var docSheet  = getOrCreateSheet(SHEET_DOCS,  ["empId","docKey","status","updatedAt"]);
  var memoSheet = getOrCreateSheet(SHEET_MEMOS, ["empId","memo","updatedAt"]);

  sheetToObjects(docSheet).forEach(function(r) {
    if (!docStatuses[r.empId]) docStatuses[r.empId] = {};
    docStatuses[r.empId][r.docKey] = r.status;
  });

  sheetToObjects(memoSheet).forEach(function(r) {
    memos[r.empId] = r.memo;
  });

  return {
    employees:   employees,
    docStatuses: docStatuses,
    memos:       memos,
    statuses:    summarizeStatuses(employees)
  };
}

function summarizeStatuses(employees) {
  var counts = {valid:0, warning:0, expired:0, total: employees.length};
  employees.forEach(function(emp) {
    if (emp.status === "期限切れ") counts.expired++;
    else if (emp.status === "要更新") counts.warning++;
    else if (emp.status === "有効")   counts.valid++;
  });
  return counts;
}

// ── 社員 CRUD ───────────────────────────────────────────────────

function getEmployees() {
  var sheet = getOrCreateSheet(SHEET_EMPLOYEES, VISA_COLS);
  return sheetToObjects(sheet);
}

function getVisaRecords(empId) {
  var sheet = getOrCreateSheet(SHEET_EMPLOYEES, VISA_COLS);
  var all   = sheetToObjects(sheet);
  if (empId) return all.filter(function(r) { return r.id === empId; });
  return all;
}

function saveEmployee(emp) {
  if (!emp || !emp.id) throw new Error("社員 ID が必要です");
  var sheet = getOrCreateSheet(SHEET_EMPLOYEES, VISA_COLS);
  var data  = sheetToObjects(sheet);
  var idx   = data.findIndex(function(r) { return r.id === emp.id; });

  emp.updatedAt = new Date().toISOString().slice(0, 10);
  if (typeof emp.history !== "string") emp.history = JSON.stringify(emp.history || []);

  if (idx >= 0) {
    // 更新
    var row = buildRow(emp);
    var range = sheet.getRange(idx + 2, 1, 1, row.length);
    range.setValues([row]);
  } else {
    // 新規
    sheet.appendRow(buildRow(emp));
  }
  return {ok: true};
}

function deleteEmployee(empId) {
  if (!empId) throw new Error("社員 ID が必要です");
  var sheet = getOrCreateSheet(SHEET_EMPLOYEES, VISA_COLS);
  var data  = sheetToObjects(sheet);
  var idx   = data.findIndex(function(r) { return r.id === empId; });
  if (idx < 0) return {ok: false, error: "not found"};
  sheet.deleteRow(idx + 2);
  return {ok: true};
}

function saveAllEmployees(employees) {
  if (!employees || !Array.isArray(employees)) throw new Error("employees 配列が必要です");
  var sheet = getOrCreateSheet(SHEET_EMPLOYEES, VISA_COLS);

  // ヘッダー行以外をクリア
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);

  if (employees.length === 0) return {ok: true, count: 0};

  var rows = employees.map(function(emp) {
    if (typeof emp.history !== "string") emp.history = JSON.stringify(emp.history || []);
    emp.updatedAt = emp.updatedAt || new Date().toISOString().slice(0, 10);
    return buildRow(emp);
  });

  sheet.getRange(2, 1, rows.length, VISA_COLS.length).setValues(rows);
  return {ok: true, count: rows.length};
}

function buildRow(emp) {
  return VISA_COLS.map(function(col) {
    var v = emp[col];
    if (v === undefined || v === null) return "";
    return v;
  });
}

// ── 書類ステータス ────────────────────────────────────────────────

function getAllDocStatuses() {
  var sheet = getOrCreateSheet(SHEET_DOCS, ["empId","docKey","status","updatedAt"]);
  var result = {};
  sheetToObjects(sheet).forEach(function(r) {
    if (!result[r.empId]) result[r.empId] = {};
    result[r.empId][r.docKey] = r.status;
  });
  return result;
}

function getDocStatuses(empId) {
  var all = getAllDocStatuses();
  return empId ? (all[empId] || {}) : all;
}

function saveDocStatus(empId, docKey, status) {
  if (!empId || !docKey) throw new Error("empId と docKey が必要です");
  var sheet = getOrCreateSheet(SHEET_DOCS, ["empId","docKey","status","updatedAt"]);
  var data  = sheetToObjects(sheet);
  var idx   = data.findIndex(function(r) { return r.empId === empId && r.docKey === docKey; });
  var row   = [empId, docKey, status, new Date().toISOString().slice(0, 10)];

  if (idx >= 0) {
    sheet.getRange(idx + 2, 1, 1, 4).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return {ok: true};
}

// ── メモ ─────────────────────────────────────────────────────────

function getAllMemos() {
  var sheet = getOrCreateSheet(SHEET_MEMOS, ["empId","memo","updatedAt"]);
  var result = {};
  sheetToObjects(sheet).forEach(function(r) { result[r.empId] = r.memo; });
  return result;
}

function getMemos(empId) {
  var all = getAllMemos();
  return empId ? (all[empId] || "") : all;
}

function saveMemo(empId, memo) {
  if (!empId) throw new Error("empId が必要です");
  var sheet = getOrCreateSheet(SHEET_MEMOS, ["empId","memo","updatedAt"]);
  var data  = sheetToObjects(sheet);
  var idx   = data.findIndex(function(r) { return r.empId === empId; });
  var row   = [empId, memo || "", new Date().toISOString().slice(0, 10)];

  if (idx >= 0) {
    sheet.getRange(idx + 2, 1, 1, 3).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return {ok: true};
}

// ── ユーティリティ ────────────────────────────────────────────────

function getSpreadsheet() {
  if (SS_ID) return SpreadsheetApp.openById(SS_ID);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(name, headers) {
  var ss    = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    // ヘッダー行スタイル
    var hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setBackground("#1b4332");
    hRange.setFontColor("#ffffff");
    hRange.setFontWeight("bold");
  }
  return sheet;
}

function sheetToObjects(sheet) {
  var data    = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var v = row[i];
      // Date オブジェクトを YYYY-MM-DD 文字列に変換
      if (v instanceof Date) {
        v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      obj[h] = (v === null || v === undefined) ? "" : v;
    });
    return obj;
  });
}

// ── メニュー & 初期化 ─────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🛂 ビザ管理")
    .addItem("シートを初期化", "initSheets")
    .addItem("接続テスト", "pingTest")
    .addSeparator()
    .addItem("freee 認証 URL を表示", "showFreeeAuthUrl")
    .addItem("freee から今すぐ同期", "syncFromFreeeMenu")
    .addItem("freee 毎日自動同期 ON", "setupDailySync")
    .addItem("freee 毎日自動同期 OFF", "removeDailySync")
    .addToUi();
}

function initSheets() {
  getOrCreateSheet(SHEET_EMPLOYEES, VISA_COLS);
  getOrCreateSheet(SHEET_DOCS,  ["empId","docKey","status","updatedAt"]);
  getOrCreateSheet(SHEET_MEMOS, ["empId","memo","updatedAt"]);
  getOrCreateSheet(SHEET_VISAS, VISA_COLS);
  SpreadsheetApp.getUi().alert("シートを初期化しました");
}

function pingTest() {
  SpreadsheetApp.getUi().alert("GAS 接続 OK\n" + new Date().toLocaleString("ja-JP"));
}

function showFreeeAuthUrl() {
  var ui = SpreadsheetApp.getUi();
  try {
    var url = getFreeeAuthUrl();
    ui.alert("freee 認証 URL\n\n以下の URL をブラウザで開いてください:\n\n" + url);
  } catch(e) {
    ui.alert("エラー: " + e.message + "\n\nsetFreeeCredentials() を実行してください");
  }
}

function syncFromFreeeMenu() {
  var ui = SpreadsheetApp.getUi();
  try {
    var result = syncFromFreee();
    if (result.success) {
      ui.alert("同期完了\n\n外国籍社員: " + result.synced + " 名\n全社員: " + result.total + " 名\n同期時刻: " + result.syncTime);
    } else {
      ui.alert("同期エラー: " + result.error);
    }
  } catch(e) {
    ui.alert("エラー: " + e.message);
  }
}
