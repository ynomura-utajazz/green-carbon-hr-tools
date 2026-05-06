// =============================================================
// freee_sync.gs  ―  freee人事労務 OAuth2 連携
// Green Carbon HR Tools  /  GAS backend
// =============================================================
// 使い方:
//   1. freee Developer Console でアプリを作成し、
//      リダイレクト URI を GAS のデプロイ URL に設定する
//   2. GAS エディタのコンソールで以下を実行:
//        setFreeeCredentials("your_client_id", "your_client_secret")
//   3. ブラウザで GAS URL + ?action=freeeAuth を開き OAuth 認証を完了する
//   4. visa_manager.html の「📡 freee同期」ボタンで社員データを同期する
// =============================================================

// ── 定数 ──────────────────────────────────────────────────────
var FREEE_AUTH_URL    = "https://accounts.secure.freee.co.jp/public_api/authorize";
var FREEE_TOKEN_URL   = "https://accounts.secure.freee.co.jp/public_api/token";
var FREEE_HR_BASE_URL = "https://api.freee.co.jp/hr/api/v1";

// ── 初期設定: GAS エディタのコンソールから実行 ─────────────────
function setFreeeCredentials(clientId, clientSecret) {
  var ps = PropertiesService.getScriptProperties();
  ps.setProperties({
    "FREEE_CLIENT_ID":     clientId,
    "FREEE_CLIENT_SECRET": clientSecret
  });
  Logger.log("freee 認証情報を保存しました");
}

// ── OAuth2 認可 URL 生成 ────────────────────────────────────────
function getFreeeAuthUrl() {
  var ps       = PropertiesService.getScriptProperties();
  var clientId = ps.getProperty("FREEE_CLIENT_ID");
  if (!clientId) throw new Error("FREEE_CLIENT_ID が設定されていません。setFreeeCredentials() を実行してください");

  var redirectUri = ScriptApp.getService().getUrl();
  var state       = Utilities.getUuid();
  ps.setProperty("FREEE_OAUTH_STATE", state);

  var url = FREEE_AUTH_URL
    + "?response_type=code"
    + "&client_id=" + encodeURIComponent(clientId)
    + "&redirect_uri=" + encodeURIComponent(redirectUri)
    + "&state=" + encodeURIComponent(state);

  return url;
}

// ── OAuth2 コールバック処理 (doGet から呼ばれる) ─────────────────
function handleFreeeCallback(params) {
  var ps    = PropertiesService.getScriptProperties();
  var state = ps.getProperty("FREEE_OAUTH_STATE");

  if (params.state !== state) {
    return HtmlService.createHtmlOutput("<h2>エラー: state 不一致</h2><p>もう一度認証を行ってください</p>");
  }

  try {
    var tokens = exchangeCodeForTokens(params.code);
    ps.setProperties({
      "FREEE_ACCESS_TOKEN":  tokens.access_token,
      "FREEE_REFRESH_TOKEN": tokens.refresh_token,
      "FREEE_TOKEN_EXPIRY":  String(Date.now() + tokens.expires_in * 1000),
      "FREEE_COMPANY_ID":    ""  // 次回 sync 時に自動取得
    });
    ps.deleteProperty("FREEE_OAUTH_STATE");

    return HtmlService.createHtmlOutput(
      "<html><body style='font-family:sans-serif;text-align:center;padding:60px'>" +
      "<h2 style='color:#2d6a4f'>✅ freee 認証が完了しました</h2>" +
      "<p>このタブを閉じて、ビザ管理ツールに戻ってください</p>" +
      "<script>setTimeout(()=>window.close(),3000)</script>" +
      "</body></html>"
    );
  } catch(e) {
    return HtmlService.createHtmlOutput("<h2>認証エラー</h2><p>" + e.message + "</p>");
  }
}

// ── 認可コード → トークン交換 ────────────────────────────────────
function exchangeCodeForTokens(code) {
  var ps           = PropertiesService.getScriptProperties();
  var clientId     = ps.getProperty("FREEE_CLIENT_ID");
  var clientSecret = ps.getProperty("FREEE_CLIENT_SECRET");
  var redirectUri  = ScriptApp.getService().getUrl();

  var res = UrlFetchApp.fetch(FREEE_TOKEN_URL, {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: {
      grant_type:    "authorization_code",
      code:          code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri
    },
    muteHttpExceptions: true
  });

  var json = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) {
    throw new Error("トークン取得失敗: " + (json.error_description || JSON.stringify(json)));
  }
  return json;
}

// ── アクセストークン取得 (期限切れなら自動リフレッシュ) ──────────
function getValidAccessToken() {
  var ps     = PropertiesService.getScriptProperties();
  var token  = ps.getProperty("FREEE_ACCESS_TOKEN");
  var expiry = parseInt(ps.getProperty("FREEE_TOKEN_EXPIRY") || "0", 10);

  if (!token) throw new Error("freee 未認証。?action=freeeAuth で認証してください");

  // 5分余裕を持ってリフレッシュ
  if (Date.now() > expiry - 5 * 60 * 1000) {
    token = refreshFreeeToken();
  }
  return token;
}

// ── トークンリフレッシュ ──────────────────────────────────────────
function refreshFreeeToken() {
  var ps           = PropertiesService.getScriptProperties();
  var clientId     = ps.getProperty("FREEE_CLIENT_ID");
  var clientSecret = ps.getProperty("FREEE_CLIENT_SECRET");
  var refreshToken = ps.getProperty("FREEE_REFRESH_TOKEN");

  if (!refreshToken) throw new Error("リフレッシュトークンがありません。再認証が必要です");

  var res = UrlFetchApp.fetch(FREEE_TOKEN_URL, {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: {
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret
    },
    muteHttpExceptions: true
  });

  var json = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) {
    throw new Error("トークンリフレッシュ失敗: " + (json.error_description || JSON.stringify(json)));
  }

  ps.setProperties({
    "FREEE_ACCESS_TOKEN":  json.access_token,
    "FREEE_REFRESH_TOKEN": json.refresh_token || refreshToken,
    "FREEE_TOKEN_EXPIRY":  String(Date.now() + json.expires_in * 1000)
  });

  return json.access_token;
}

// ── freee API リクエストヘルパー ─────────────────────────────────
function freeeGet(path, params) {
  var token = getValidAccessToken();
  var url   = FREEE_HR_BASE_URL + path;
  if (params) {
    var qs = Object.keys(params).map(function(k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
    }).join("&");
    url += "?" + qs;
  }

  var res = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code === 401) {
    // トークン失効 → リフレッシュしてリトライ
    token = refreshFreeeToken();
    res = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + token },
      muteHttpExceptions: true
    });
    code = res.getResponseCode();
  }

  if (code !== 200) {
    throw new Error("freee API エラー " + code + ": " + res.getContentText().substring(0, 200));
  }

  return JSON.parse(res.getContentText());
}

// ── 会社 ID 取得 ─────────────────────────────────────────────────
function getCompanyId() {
  var ps        = PropertiesService.getScriptProperties();
  var companyId = ps.getProperty("FREEE_COMPANY_ID");
  if (companyId) return parseInt(companyId, 10);

  var data  = freeeGet("/users/me");
  var companies = data.user && data.user.companies;
  if (!companies || companies.length === 0) throw new Error("freee に会社データがありません");

  // 最初の会社を使用 (複数会社の場合は要設定)
  companyId = companies[0].id;
  ps.setProperty("FREEE_COMPANY_ID", String(companyId));
  return companyId;
}

// ── 社員一覧取得 (ページネーション対応) ─────────────────────────
function fetchAllFreeeEmployees(companyId) {
  var allEmployees = [];
  var limit        = 100;
  var offset       = 0;

  while (true) {
    var data = freeeGet("/employees", {
      company_id: companyId,
      limit:      limit,
      offset:     offset
    });

    var employees = data.employees || [];
    allEmployees  = allEmployees.concat(employees);

    if (employees.length < limit) break;  // 最終ページ
    offset += limit;
    Utilities.sleep(300);  // API レート制限対策
  }

  return allEmployees;
}

// ── 国籍コード → 表示名マッピング ────────────────────────────────
var FREEE_NAT_MAP = {
  "JPN": "日本", "CHN": "中国", "KOR": "韓国", "VNM": "ベトナム",
  "PHL": "フィリピン", "IDN": "インドネシア", "THA": "タイ",
  "MMR": "ミャンマー", "BGD": "バングラデシュ", "NPL": "ネパール",
  "IND": "インド", "BRA": "ブラジル", "PER": "ペルー",
  "USA": "アメリカ", "GBR": "イギリス", "DEU": "ドイツ",
  "FRA": "フランス", "AUS": "オーストラリア", "CAN": "カナダ",
  "MYS": "マレーシア", "SGP": "シンガポール", "TWN": "台湾",
  "HKG": "香港", "PAK": "パキスタン", "LKA": "スリランカ",
  "KHM": "カンボジア", "LAO": "ラオス", "MNG": "モンゴル",
  "UZB": "ウズベキスタン", "KAZ": "カザフスタン"
};

// ── 在留資格コード → 表示名マッピング ────────────────────────────
var FREEE_VISA_MAP = {
  "ENGINEER_HUMANITIES_INTERNATIONAL_SERVICES": "技術・人文知識・国際業務",
  "SPECIFIED_SKILLED_WORKER_TYPE1":             "特定技能",
  "SPECIFIED_SKILLED_WORKER_TYPE2":             "特定技能2号",
  "TECHNICAL_INTERN_TRAINING_TYPE1":            "技能実習1号",
  "TECHNICAL_INTERN_TRAINING_TYPE2":            "技能実習2号",
  "TECHNICAL_INTERN_TRAINING_TYPE3":            "技能実習3号",
  "SKILLED_LABOR":                              "技能",
  "EDUCATION":                                  "教育",
  "PROFESSOR":                                  "教授",
  "RESEARCHER":                                 "研究",
  "MANAGEMENT_AND_ADMINISTRATION":              "経営・管理",
  "LEGAL_AND_ACCOUNTING_SERVICES":              "法律・会計業務",
  "MEDICAL_SERVICES":                           "医療",
  "SPECIALIST_IN_HUMANITIES":                   "人文知識・国際業務",
  "INTRA_COMPANY_TRANSFEREE":                   "企業内転勤",
  "ENTERTAINER":                                "興行",
  "DEPENDENT":                                  "家族滞在",
  "PERMANENT_RESIDENT":                         "永住者",
  "SPOUSE_OF_JAPANESE":                         "日本人の配偶者等",
  "LONG_TERM_RESIDENT":                         "定住者",
  "SPECIAL_PERMANENT_RESIDENT":                 "特別永住者"
};

// ── freee 社員オブジェクト → ビザ管理形式 ────────────────────────
function mapFreeeEmployee(e) {
  var emp = {};

  // 社員番号 → ID
  emp.id = "GC-" + String(e.num || e.employee_num || e.id || "0000").padStart(4, "0");

  // 氏名
  emp.name = (e.last_name || "") + (e.last_name && e.first_name ? "　" : "") + (e.first_name || "");
  if (!emp.name.trim()) emp.name = e.display_name || "";

  // 氏名カナ
  emp.nameKana = (e.last_name_kana || "") + " " + (e.first_name_kana || "");
  emp.nameKana = emp.nameKana.trim();

  // 部署
  emp.dept = (e.department && e.department.name) || e.department_name || "";

  // 役職
  emp.title = (e.job_title && e.job_title.name) || e.job_title_name || "";

  // メール
  emp.email = e.email || "";

  // 生年月日
  emp.dob = (e.birthday || "").replace(/\//g, "-");

  // 入社日
  emp.joinDate = (e.entry_date || "").replace(/\//g, "-");

  // 国籍
  var natCode = (e.nationality_code || e.nationality || "").toUpperCase();
  emp.nationality = FREEE_NAT_MAP[natCode] || e.nationality || "";

  // 在留カード情報
  var rc = e.residence_card || {};
  var visaCode = (rc.residence_status || rc.status_of_residence || "").toUpperCase();
  emp.visaType = FREEE_VISA_MAP[visaCode] || rc.residence_status || rc.status_of_residence || "";
  emp.cardNo   = rc.residence_card_number || rc.card_number || "";
  emp.expiry   = (rc.date_of_expiration || rc.expiry_date || "").replace(/\//g, "-");
  emp.period   = rc.period_of_stay || "";
  emp.restriction = rc.permission || rc.restriction || "";

  // ステータス: 期限切れチェック
  if (emp.expiry) {
    var expDate = new Date(emp.expiry);
    var today   = new Date();
    var diff    = (expDate - today) / (1000 * 60 * 60 * 24);
    if (diff < 0)   emp.status = "期限切れ";
    else if (diff < 90) emp.status = "要更新";
    else emp.status = "有効";
  } else {
    emp.status = "";
  }

  emp.hrPic     = "";
  emp.history   = [];
  emp.updatedAt = new Date().toISOString().slice(0, 10);

  return emp;
}

// ── freee から同期 (メイン処理) ──────────────────────────────────
function syncFromFreee() {
  try {
    var companyId    = getCompanyId();
    var freeeEmps    = fetchAllFreeeEmployees(companyId);
    var ps           = PropertiesService.getScriptProperties();

    // 外国籍のみフィルタ (国籍コードが JPN でないもの)
    var foreignEmps  = freeeEmps.filter(function(e) {
      var nat = (e.nationality_code || e.nationality || "").toUpperCase();
      return nat && nat !== "JPN" && nat !== "日本";
    });

    var mapped = foreignEmps.map(mapFreeeEmployee);

    // スプレッドシートに保存 (saveAllEmployees は visa_manager.gs に定義)
    saveAllEmployees(mapped);

    var syncTime = new Date().toISOString();
    ps.setProperty("FREEE_LAST_SYNC", syncTime);

    return {
      success:   true,
      synced:    mapped.length,
      total:     freeeEmps.length,
      foreign:   foreignEmps.length,
      syncTime:  syncTime
    };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ── 接続ステータス確認 ────────────────────────────────────────────
function getFreeeStatus() {
  var ps           = PropertiesService.getScriptProperties();
  var clientId     = ps.getProperty("FREEE_CLIENT_ID");
  var accessToken  = ps.getProperty("FREEE_ACCESS_TOKEN");
  var lastSync     = ps.getProperty("FREEE_LAST_SYNC");
  var expiry       = parseInt(ps.getProperty("FREEE_TOKEN_EXPIRY") || "0", 10);

  var configured   = !!clientId;
  var authenticated = !!accessToken;
  var tokenValid   = authenticated && Date.now() < expiry;

  return {
    configured:    configured,
    authenticated: authenticated,
    tokenValid:    tokenValid,
    lastSync:      lastSync || null,
    authUrl:       configured ? ScriptApp.getService().getUrl() + "?action=freeeAuth" : null
  };
}

// ── 毎日自動同期トリガー設定 ─────────────────────────────────────
function setupDailySync() {
  // 既存トリガーを削除
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "syncFromFreee") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 毎日 AM 3:00 に同期
  ScriptApp.newTrigger("syncFromFreee")
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();

  Logger.log("毎日 AM 3:00 の自動同期トリガーを設定しました");
}

// ── 自動同期停止 ─────────────────────────────────────────────────
function removeDailySync() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "syncFromFreee") {
      ScriptApp.deleteTrigger(t);
    }
  });
  Logger.log("自動同期トリガーを削除しました");
}
