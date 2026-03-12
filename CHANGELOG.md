# 開發日誌 (Development Log)

這份文件用於記錄專案的更新內容、架構調整與已知問題。
(此文件僅供開發者檢視，不會顯示於前端 UI)

---

## [Unreleased] — 待開發項目

### 高優先
- [ ] Prompt 記憶寫入規則（告訴 AI 何時應輸出 `MEMORY_ADD`，包含 `[ ]` 布告欄自動觸發邏輯）
- [ ] 任務系統動態化（目前 Modal 為空白，需接 AI 動態寫入）

### 中優先
- [ ] NPC 出沒設定（`territory[]`、`schedule`、`appearChance`、`isLocationBound`）
- [ ] NPC 兩階段注入（第一階段：輕量名單；第二階段：完整資料 + 記憶）

### 之後
- [ ] 對話摘要壓縮（超過 N 輪後，舊對話壓縮成摘要節省 token）
- [ ] Firebase 雲端儲存（取代 localStorage）
- [ ] 向量語意搜尋記憶（進階記憶檢索）

---

## [2026-03-12] — v4（當前版本）

### 統一記憶資料結構升級（重大架構變更）
- **移除**舊的三個分散記憶陣列：`worldMemory`、`factionMemory`、`locationMemory`
- **新增** 統一 `memories[]` 陣列，每條記憶包含完整欄位：
  ```typescript
  {
    id, type, importance, content,
    tags: { locations, npcs, factions, keywords },
    trigger: { scanDepth, probability, sticky, cooldown },
    isActive, source, createdAt, expiresAt?
  }
  ```
- **記憶分四層**：`world`（世界）/ `region`（區域）/ `scene`（場景）/ `npc`（NPC）
- **舊存檔自動 migrate**：讀入舊格式時自動轉換，不會破壞現有進度
- **新增** `stickyCounters` 與 `cooldownCounters`，每次 AI 回應後自動倒數

### MEMORY_ADD 指令升級
- 舊格式：`MEMORY_ADD:type:content:tag`
- 新格式：`MEMORY_ADD:region:normal:內容:locations=迷霧森林:factions=黑牙氏族:keywords=大火:sticky=3`
- 支援完整 tags（`locations` / `npcs` / `factions` / `keywords`）
- 支援 `sticky`（觸發後持續 N 則）、`expires`（臨時記憶過期時間）
- `scene` / `region` 類型若未指定 `locations`，自動使用當前地點
- 寫入時彈出分層 Toast 提示

### 右側面板升級
- 記憶顯示改為四層分組：🌍 世界 / 🗺️ 區域 / 🏠 場景 / 👤 NPC
- 只顯示與當前地點相關的區域/場景記憶
- AI 自動寫入的條目標註「（AI）」
- `critical` 等級世界記憶顯示 ★

### Lorebook 升級（secondary_keys + insertion_order）
- **新增欄位**：`keywords`（主關鍵字）、`secondaryKeys`（次要關鍵字）、`selective`（AND 邏輯開關）、`insertionOrder`（注入順序，預設 100）
- **觸發邏輯**：
  - `selective = false`（預設）：主關鍵字 OR，任一命中即觸發
  - `selective = true`：主關鍵字 AND 次要關鍵字，兩組都要命中
- **排序**：多個條目同時觸發時，依 `insertionOrder` 數字小到大排列
- **掃描範圍**：最近 5 則對話 + 當前玩家輸入
- **編輯 UI**：新增主關鍵字（藍色標籤）、AND 開關 + 次要關鍵字（橘色標籤）、注入順序輸入
- **檢視 UI**：條目下方顯示標籤，`#N` 顯示非預設的 insertionOrder

### 系統設定 — Gemini API Key 輸入
- 新增 API Key 輸入欄（password 類型，不明文顯示）
- 即時儲存至 `localStorage`，重新整理後保留
- 已設定時顯示綠色 ✓
- 附 Google AI Studio 連結
- 若未設定 Key 且無環境變數，送出訊息時顯示提示 Toast

### 日記系統升級（關鍵字觸發）
- 新增 `keywords: string[]` 欄位
- 邏輯：`isActive=false` → 不注入；`isActive=true + keywords 空` → 永遠注入；`isActive=true + keywords 有值` → 掃最近 5 則才注入
- 編輯模式新增關鍵字輸入區塊
- 檢視模式標籤顯示觸發狀態（藍色 = 已觸發，灰色 = 未觸發）

### 開發環境
- 建立 GitHub repo：`https://github.com/Mika80808/RP-world`
- 建立 `sync.ps1`（Windows PowerShell）：自動解壓縮 zip 並 push 到 GitHub
- 確認 Claude Code 桌面版可讀取 GitHub repo，未來改動可直接透過 Claude Code 操作本地檔案

---

## [2026-03-12] — v3

### 前端 COMMANDS 解析器
- AI 回應格式：`<<COMMANDS>>...<</COMMANDS>>`，前端解析執行，不顯示給玩家
- 支援指令：
  - `HP:±N` / `MP:±N` → 增減數值（下限 0，無上限，支援升級成長）
  - `GOLD:±N` → 增減金幣
  - `AFFINITY:角色名:±N` → 更新 NPC 好感度（-100～100）
  - `LOCATION:地點名` → 移動玩家位置
  - `TIME:+Nh` / `TIME:+Nm` → 推進遊戲時間（支援跨天）
  - `ITEM_ADD:名:數量:說明` → 新增背包道具
  - `ITEM_REMOVE:名:數量` → 移除背包道具
  - `MEMORY_ADD:類型:內容:標籤` → 自動寫入記憶庫（v3 舊格式）
- 串流結束後解析，數值變化依序彈出 Toast（間隔 600ms）

### buildPrompt 場景條件注入
- Lorebook 只注入當前地點相關條目
- 對話記錄只送最近 20 則（滑動窗口）
- Prompt 結構：系統設定 → 玩家狀態 → 記憶層 → 場景 Lorebook → 釘選 NPC → 日記 → 近期對話 → COMMAND FORMAT

### 新增 scanKeywords 函數
- 掃最近 5 則對話，不分大小寫
- 支援額外文字輸入（含玩家當前輸入）

---

## [2026-03-12] — v1 / v2（初始版本）

### 核心功能
- 完整三欄遊戲介面（左欄狀態 / 中欄對話 / 右欄記憶）
- 任務日誌 Modal / 個人資訊 Modal（可編輯）/ 系統底層設定 Modal
- 日記系統（勾選啟用 / 雙擊編輯）
- 設定集 Lorebook（地點 / NPC / 分類 / 搜尋 / 雙擊編輯）
- NPC 詳情 Modal（好感度 / 記憶庫 / 釘選 / 加入設定集）
- 世界地圖 + 旅行時間計算
- 存檔 / 匯出 / 匯入 / 重置
- 訊息泡泡（複製 / 編輯 / 刪除 / 重新生成）
- 道具 & 消耗品管理
- 狀態列（日期 / 天氣 / 時間 / HP / MP / 金幣）
- 月份雅稱系統（12 個月各有名稱與節日）
- 世界觀資料（NPC 30+ 筆 / 地點 14+ 筆）
- AI 串接：Google Gemini 2.0 Flash

### 架構設計決策
- HP / MP 無上限（支援升級後成長感）
- 資料儲存：localStorage（未來規劃 Firebase）
- 技術棧：React + TypeScript + Vite
