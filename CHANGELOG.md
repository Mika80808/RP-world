# CHANGELOG.md — 開發日誌

> 純歷史紀錄，對開發者友好。待做任務請見 TODO.md。
> 每次 AI 改完功能，請在對應版本區塊補上一條記錄。

---

## [2026-03-13] v7（當前版本）

### 本機開發環境建立
安裝 Node.js 與 GitHub CLI（`gh`），設定 `.claude/launch.json` 讓 Claude Code 可直接啟動 Vite dev server（port 3001）並即時預覽。

### 頁面自動載入存檔進度
所有遊戲 state（profile、messages、memories、currentLocation、timeState 等）改用 lazy initializer，啟動時直接從 `rpworld_save` 讀取，無需手動匯入，重整頁面即還原進度。

### timeState 納入存檔
快捷存檔、匯出存檔、匯入存檔一併處理遊戲時間（年月日時分天氣），避免重整後時間回到預設值。

### 匯出 / 匯入 Icon 交換
匯出存檔改用 ↓ Download icon，匯入存檔改用 ↑ Upload icon，語意更直覺。

### 匯出檔名加入玩家名稱
格式改為 `RPworld-{玩家名}-{日期}-{hr}-{mi}.json`，特殊字元自動替換為 `_`，方便辨識存檔歸屬。

### Markdown Parser（renderMarkdown）
新增 `renderMarkdown(text)` 與 `renderInline(text, keyPrefix)` 兩個函數，放在 component 外部。
處理順序：按 `\n` 切行 → 判斷行類型（`>` 引用、`---` 分隔線、一般段落）→ 行內語法替換（`` `code` ``、`**bold**`、`*italic*`）。
連續 `>` 行自動合併成同一引用區塊，正確呈現信件格式。
只有 `msg.role !== 'user'` 時才呼叫 renderMarkdown，玩家訊息維持 `whitespace-pre-wrap`。

---

## [2026-03-13] v6

### MaxTokens 輸出長度設定
在系統設定 Modal 新增 16K / 32K / 64K 三段切換按鈕，控制 Gemini API 的 `maxOutputTokens`。選擇儲存至 `localStorage('gemini_max_tokens')`，預設 32K。三個 API 呼叫（串流對話、水晶球日記、融合日記）均套用此設定。

### 清除 Lorebook 預設 NPC 資料
移除 `lorebookEntries` 初始陣列中全部 21 筆 NPC 資料（芬里爾至魔王，id 18–39）。地點 14 筆保留不動。新遊戲／重置後 NPC 設定集為空白，由玩家自行填入。

---

## [2026-03-12] v4（當前版本）

### 統一記憶資料結構（重大架構變更）
移除三個分散的記憶陣列（`worldMemory` / `factionMemory` / `locationMemory`），合併為統一的 `memories[]`。每條記憶有完整欄位：type、importance、content、tags、trigger、source、createdAt、expiresAt。舊存檔讀入時自動 migrate，不會破壞現有進度。

新增 `stickyCounters` 與 `cooldownCounters`，讓記憶可以在觸發後持續 N 則、冷卻 N 則後才能再觸發，仿 SillyTavern 的 sticky / cooldown 機制。

### MEMORY_ADD 指令升級
從簡單的 `MEMORY_ADD:type:content:tag` 升級為支援完整 tags 的格式。AI 現在可以精確指定地點、NPC、陣營、關鍵字，以及 sticky 持續則數和臨時記憶的過期時間。

### Lorebook 觸發升級
新增 `secondaryKeys`（次要關鍵字）和 `selective`（AND 邏輯開關）。開啟 AND 邏輯後，必須主關鍵字和次要關鍵字都命中才觸發，避免條目被無關對話誤觸發。新增 `insertionOrder` 控制多條目同時觸發時的注入順序。

### Gemini API Key 輸入
在系統設定 Modal 加入 API Key 輸入欄，儲存至 localStorage，不需要環境變數也能使用。

### 開發環境
建立 GitHub repo（`Mika80808/RP-world`）。建立 `sync.ps1` Windows 腳本，自動解壓縮 zip 並 push 到 GitHub。確認 Claude Code 桌面版可讀取 repo，未來可直接操作本地檔案。

---

## [2026-03-12] v3

### 前端 COMMANDS 解析器
AI 回應末尾的 `<<COMMANDS>>...<</COMMANDS>>` 區塊由前端攔截解析，不顯示給玩家。支援：HP / MP / 金幣增減、NPC 好感度更新、地點移動、時間推進、道具新增移除、記憶寫入。數值變化依序彈出 Toast 通知。

### buildPrompt 場景條件注入
Lorebook 改為只注入與當前地點相關的條目。對話記錄只送最近 20 則（滑動窗口）節省 token。

### 日記關鍵字觸發
日記條目新增 `keywords` 欄位。空陣列 = 永遠注入，有值 = 掃最近 5 則對話才注入。

---

## [2026-03-12] v1 / v2（初始版本）

### 核心功能建立
三欄遊戲介面、任務 Modal、個人資訊 Modal、系統設定 Modal、日記系統、Lorebook 設定集、NPC 詳情、世界地圖、存檔匯出匯入重置、訊息泡泡操作、道具管理、狀態列、月份雅稱系統。

AI 串接 Google Gemini 2.0 Flash，世界觀資料約 NPC 30+ 筆、地點 14+ 筆。

### 架構決策
HP / MP 無上限（支援升級成長感）。資料儲存用 localStorage。技術棧 React + TypeScript + Vite。

---

## [2026-03-12] v5

### 介面與提示詞優化
1. 增加了編輯訊息時的文字框高度（`min-h-[200px]`），方便編輯長篇內容。
2. 更新了給 AI 的 Prompt，限制快捷選項（`<<OPTIONS>>`）必須在 10 個字以內，且以簡單動作為主。
3. 修改了對話視窗底部的毛玻璃效果，使用 `mask-image` 實作往上淡出的漸層模糊效果。
4. 修改了初始訊息（ID 1），提供更具沉浸感的開場白。

### 個人資訊與數值系統調整
1. 個人資訊的職業預設為「異鄉人」。
2. 補充了個人資訊各欄位的提示文字（Placeholder），引導玩家填寫。
3. 預設 MP、金錢為 0。
4. 移除了 HP / MP 的上限設定（`maxHp` / `maxMp`），現在數值可以無上限成長，並同步更新了介面顯示與給 AI 的 Prompt。

### 快捷選項與重新生成功能修復
修復了快捷選項點擊無效的問題，並將其改為動態生成。AI 現在可以透過 `<<OPTIONS>>` 區塊輸出建議的行動選項，前端會解析並更新快捷選項按鈕。
同時實作了 `handleRegenerate` 函數，修復了 AI 回覆訊息旁的「重新生成」按鈕，點擊後會刪除該 AI 訊息及之後的所有訊息，並重新發送最後一次的玩家訊息。
修復了 AI 輸出 `</OPTIONS>>` 或忘記閉合標籤導致解析失敗的問題，並過濾掉選項前面的數字編號。

### 日記系統升級（水晶球日記 + 融合日記）

**UI 重構：** 日記 Modal 頂部由單一「新增日記條目」按鈕，改為三個並排 icon 按鈕：📝 新增日記 / 🔮 水晶球日記 / 💫 融合日記，各附小字說明。

**DiaryEntry 新增欄位：** `source`（`'manual' | 'ai_generated' | 'merged'`）、`mergedFrom?: number[]`（融合來源 id 陣列）、`isMerged?: boolean`（已被融合，退休標記）。

**🔮 水晶球日記：** 點擊後送獨立 API 請求（`gemini-2.0-flash`），掃最近 20 則對話，使用第二種 prompt 格式（含關鍵事件節點、詳細內容、故事路線等章節）生成日記。生成中顯示 loading，完成後 Toast 通知「🔮 水晶球日記已生成」，isActive 預設 false，玩家可自行勾選是否給 AI 讀。

**💫 融合日記：** 點擊進入融合模式，日記列表每條出現第二個勾選框（左下方，與 isActive 勾選框上下分離）。勾選 2 條以上後確認按鈕亮起。確認後送 API 將多條合併壓縮，新日記標題自動加 💫，isActive 預設 false。原始條目標記 `isMerged=true`，列表中淡化顯示並標記「已融合」。融合日記可點擊展開顯示來源條目（灰字）。底部有「取消」按鈕退出融合模式。
