# CHANGELOG.md — 開發日誌

> 純歷史紀錄，對開發者友好。待做任務請見 TODO.md。
> 每次 AI 改完功能，請在對應版本區塊補上一條記錄。

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
