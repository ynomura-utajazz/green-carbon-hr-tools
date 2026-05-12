"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Send, Settings2 } from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import { CATEGORY_LABELS, CATEGORY_ORDER, toolsByCategory } from "@/lib/tools";
import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS } from "@/lib/demo/employees";

const deptName = (id: string) =>
  DEMO_DEPARTMENTS.find((d) => d.id === id)?.name ?? id;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const grouped = toolsByCategory();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="ツール・社員・ドキュメントを検索..." />
      <CommandList>
        <CommandEmpty>該当する項目がありません</CommandEmpty>
        {CATEGORY_ORDER.map((cat) => {
          const tools = grouped.get(cat) ?? [];
          if (!tools.length) return null;
          return (
            <CommandGroup key={cat} heading={CATEGORY_LABELS[cat]}>
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <CommandItem
                    key={tool.id}
                    value={[tool.name, tool.description, ...tool.keywords].join(" ")}
                    onSelect={() => go(tool.href)}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{tool.name}</div>
                      <div className="text-xs text-muted-foreground">{tool.description}</div>
                    </div>
                    {tool.status === "beta" && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
                        beta
                      </span>
                    )}
                    {tool.status === "planned" && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        planned
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
        <CommandSeparator />
        <CommandGroup heading="社員（プロフィールを開く）">
          {DEMO_EMPLOYEES.filter((e) => e.status === "active").slice(0, 30).map((emp) => (
            <CommandItem
              key={emp.id}
              value={[emp.full_name, emp.full_name_kana, emp.display_name_en, emp.email, emp.job_title, deptName(emp.department_id)].filter(Boolean).join(" ")}
              onSelect={() => go(`/directory?q=${encodeURIComponent(emp.full_name)}`)}
            >
              <User className="size-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">{emp.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {emp.job_title} · {deptName(emp.department_id)}
                </div>
              </div>
              {emp.is_foreign_national && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {emp.nationality}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="クイックアクション">
          <CommandItem
            value="slack dm メッセージ 送信 quick"
            onSelect={() => {
              setOpen(false);
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent("gc:open-quick-dm"));
              }, 50);
            }}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">Slack で DM を送る</div>
              <div className="text-xs text-muted-foreground">
                受信者を選んでメッセージを送信
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="戦略採用 hiring strategy 人材計画 リコメンド ai"
            onSelect={() => go("/recruiting-strategy")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">戦略採用（AI）</div>
              <div className="text-xs text-muted-foreground">
                未来の組織に必要な人材を AI でリコメンド
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="面接 interview assistant ブリーフィング 質問 サジェスト ai"
            onSelect={() => go("/interview-assistant")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">AI 面接官アシスタント</div>
              <div className="text-xs text-muted-foreground">
                面接前ブリーフィング + 面接中の質問サジェスト
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="タレントプール talent pool crm アルムナイ 銀メダル 過去応募 再アクティベート"
            onSelect={() => go("/talent-pool")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">タレントプール CRM</div>
              <div className="text-xs text-muted-foreground">
                アルムナイ・銀メダル・カジュアル面談者の再アクティベート
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="面接官 calibration バイアス 偏り 評価 公平性"
            onSelect={() => go("/interview-calibration")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">面接官 Calibration</div>
              <div className="text-xs text-muted-foreground">
                複数面接官のスコア偏り分析
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="kpi ダッシュボード 採用 ピボット ヒートマップ 経路 ロール 時間"
            onSelect={() => go("/recruiting-kpi")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">採用 KPI ダッシュボード</div>
              <div className="text-xs text-muted-foreground">
                時間 × 経路 × ロールの 3 次元ピボット分析
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="careers 公開 採用ページ 応募フォーム ランディング"
            onSelect={() => { setOpen(false); window.open("/careers", "_blank"); }}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">公開採用ページ（外部）</div>
              <div className="text-xs text-muted-foreground">
                /careers — 候補者向けランディングを別タブで開く
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="オンボーディング ai 90日プラン バディ 新入社員"
            onSelect={() => go("/onboarding-ai")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">オンボーディング AI</div>
              <div className="text-xs text-muted-foreground">
                90 日プラン + バディ自動マッチ
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="採用予算 シミュレータ コスト cph 試算"
            onSelect={() => go("/recruiting-budget")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">採用予算シミュレータ</div>
              <div className="text-xs text-muted-foreground">
                経路 × ロール × CPH で 12 ヶ月予算試算
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="競合分析 ベンチマーク 他社 jd 比較 給与"
            onSelect={() => go("/competitor-analysis")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">競合分析</div>
              <div className="text-xs text-muted-foreground">
                他社 JD・給与・福利厚生のベンチマーク
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="採用 roi 投資対効果 retention 実績 予算 品質"
            onSelect={() => go("/recruiting-roi")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">採用予算 ROI 分析</div>
              <div className="text-xs text-muted-foreground">
                予算 vs 実績 + retention で経路の真の ROI
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="オファー ab テスト 受諾率 バリアント 統計"
            onSelect={() => go("/offer-ab")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">オファー A/B テスト</div>
              <div className="text-xs text-muted-foreground">
                バリアント並行配信 + 統計的有意性判定
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="esi nps 応募者体験 candidate experience フィードバック"
            onSelect={() => go("/admin/candidate-experience")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">応募者体験スコア（ESI/NPS）</div>
              <div className="text-xs text-muted-foreground">
                候補者からの NPS 集計・ステージ別分析
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="競合 jd 収集 パイプライン スクレイピング cron"
            onSelect={() => go("/admin/competitor-pipeline")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">競合 JD 収集パイプライン</div>
              <div className="text-xs text-muted-foreground">
                LinkedIn / Wantedly / Indeed の cron ジョブ監視
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="diversity inclusion d&i ダイバーシティ 国籍 拠点 格差"
            onSelect={() => go("/diversity")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">D&I 深掘り</div>
              <div className="text-xs text-muted-foreground">
                国籍・拠点・グレード・採用ファネルの格差検出
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="360 多面評価 blind spot peer feedback"
            onSelect={() => go("/three-sixty")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">360° 評価</div>
              <div className="text-xs text-muted-foreground">
                4 視点 + Self vs Others ギャップ分析
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="エンゲージメント 深掘り ドライバー 離脱 ステージ engagement"
            onSelect={() => go("/engagement-deep")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">エンゲージメント深掘り</div>
              <div className="text-xs text-muted-foreground">
                ステージ別 6 ドライバー × 退職理由クラスタ
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="報酬 グレード 制度 市場ベンチマーク salary band lag lead"
            onSelect={() => go("/comp-bands")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">報酬グレード制度</div>
              <div className="text-xs text-muted-foreground">
                自社 vs 市場 P25/50/75 で Lead/Match/Lag 判定
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="学習 スキル ラーニング パス udemy coursera 勉強会"
            onSelect={() => go("/learning")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">学習プラットフォーム</div>
              <div className="text-xs text-muted-foreground">
                スキルマトリクス × ラーニングパス × 社内勉強会
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="タレント レビュー 9-box サクセション 後継"
            onSelect={() => go("/talent-review")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">タレントレビュー & サクセション</div>
              <div className="text-xs text-muted-foreground">
                9-box × キーポジション × 後継候補
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="評価 calibration okr 360 散布図 象限"
            onSelect={() => go("/perf-calibration")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">評価キャリブレーション</div>
              <div className="text-xs text-muted-foreground">
                OKR × 360° の 4 象限分析
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="アドボカシー 発信 記事 登壇 advocacy"
            onSelect={() => go("/advocacy")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">社員アドボカシー</div>
              <div className="text-xs text-muted-foreground">
                外部発信トラッキング + 報奨ポイント
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="ai コーチング grow 対話 内省"
            onSelect={() => go("/coaching")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">AI コーチング</div>
              <div className="text-xs text-muted-foreground">
                GROW モデルベースの月次セッション
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="ウェルビーイング 睡眠 ストレス 運動 健康"
            onSelect={() => go("/wellbeing")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">ウェルビーイング</div>
              <div className="text-xs text-muted-foreground">
                睡眠・ストレス・運動の自己申告
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="議事録 アクション 抽出 タスク ai"
            onSelect={() => go("/action-extractor")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">AI 議事録 → アクション抽出</div>
              <div className="text-xs text-muted-foreground">
                議事録から誰が何をいつまでに → 各ツール分配
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="チーム 健康度 マネージャー 1画面"
            onSelect={() => go("/team-health")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">チーム健康度ダッシュボード</div>
              <div className="text-xs text-muted-foreground">
                マネージャー視点で自チームの全指標
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="キャリア パス career 過去 将来"
            onSelect={() => go("/career-path")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">キャリアパス</div>
              <div className="text-xs text-muted-foreground">
                過去ロール × 現職 × 将来オプション
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="hris 同期 bamboohr workday マスタ"
            onSelect={() => go("/admin/hris-sync")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">HRIS 双方向同期</div>
              <div className="text-xs text-muted-foreground">
                BambooHR / Workday との社員マスタ同期
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="採用広報 jd 求人票 wantedly linkedin twitter facebook"
            onSelect={() => go("/recruiting-branding")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">採用広報（JD 生成）</div>
              <div className="text-xs text-muted-foreground">
                AI で JD + 各チャネル投稿テキストを生成
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="母集団分析 ファネル cvr 経路 転換率 funnel pipeline"
            onSelect={() => go("/recruiting-funnel")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">母集団分析</div>
              <div className="text-xs text-muted-foreground">
                経路 × ステージ CVR マトリクス・月次トレンド
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="リファラル 紹介 referral 知人 サジェスト ai"
            onSelect={() => go("/recruiting-referral")}
          >
            <Send className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">リファラル強化</div>
              <div className="text-xs text-muted-foreground">
                社員ごとに「あなたが知ってそうな候補者」を AI サジェスト
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="連携 サービス 管理 設定 oauth slack google freee integration"
            onSelect={() => go("/admin/integrations")}
          >
            <Settings2 className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">連携サービス管理</div>
              <div className="text-xs text-muted-foreground">
                Slack / Google / freee の OAuth・Webhook 設定
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="ai usage copilot コスト 利用状況 トークン token cost"
            onSelect={() => go("/admin/ai-usage")}
          >
            <Settings2 className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">AI 利用状況</div>
              <div className="text-xs text-muted-foreground">
                Copilot のトークン消費・概算コスト・ユースケース別内訳
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="audit log 監査 ログ 履歴 操作"
            onSelect={() => go("/admin/audit-log")}
          >
            <Settings2 className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">監査ログ</div>
              <div className="text-xs text-muted-foreground">
                操作履歴・差分閲覧（HR 管理者のみ）
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="data lake dbt 統合 マート kpi sql warehouse"
            onSelect={() => go("/admin/data-lake")}
          >
            <Settings2 className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">データレイクハウス</div>
              <div className="text-xs text-muted-foreground">
                dbt モデル × Supabase で全 HR データを統合
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="ai agent agents エージェント claude computer use 自動化"
            onSelect={() => go("/admin/ai-agents")}
          >
            <Settings2 className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">AI エージェント</div>
              <div className="text-xs text-muted-foreground">
                Claude Computer Use で HR 業務を自動実行（承認フロー付き）
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="activity stream log v2 統合 タイムライン 監査 ai 操作"
            onSelect={() => go("/admin/activity-stream")}
          >
            <Settings2 className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">Activity Log v2</div>
              <div className="text-xs text-muted-foreground">
                audit + AI 利用 + ユーザー操作を 1 本のタイムラインに統合
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="role roles 権限 ロール 管理 hr admin manager"
            onSelect={() => go("/admin/roles")}
          >
            <Settings2 className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">権限管理</div>
              <div className="text-xs text-muted-foreground">
                HR 管理者・マネージャー等のロール付与・剥奪
              </div>
            </div>
          </CommandItem>
          <CommandItem
            value="department departments 部署 組織 部門 部 課 ツリー hierarchy"
            onSelect={() => go("/admin/departments")}
          >
            <Settings2 className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">部署管理</div>
              <div className="text-xs text-muted-foreground">
                組織ツリーの追加・編集・削除・親変更
              </div>
            </div>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="ヘルプ">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              // Dispatch ? key so the shortcuts dialog opens
              setTimeout(() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
              }, 50);
            }}
          >
            キーボードショートカットを表示
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
