# TODO.md — 待開發任務

> AI 開始工作前請先讀這個檔案，確認當前優先任務。
>
> **完成任務後的規則：**
> 1. 將 `[ ]` 改為 `[x]`
> 2. 在項目下方補一行完成註記，格式：
>    `YYYY-MM-DD [AI名稱]: 簡述改了什麼函數/檔案/區塊`
> 3. 同步更新 CHANGELOG.md 對應版本區塊
> 4. 當 [x] 項目累積過多時，由 User 定期清空

---

## 💬 待討論／待規劃

- [x] **快速存檔後的紀錄顯示**（bug）
  存檔成功但 UI 沒反應，需在 `handleQuickSave` 完成後更新 `lastSavedAt` state，顯示「上次存檔：XX:XX」。
  2026-03-13 Claude: 新增 `lastSavedAt` state，`handleQuickSave` 存檔後呼叫 `setLastSavedAt(new Date())`，存檔按鈕下方顯示「上次存檔 HH:MM:SS」。

- [x] **對話框 Markdown 模式**
  AI 回應支援 render markdown（粗體、斜體、分隔線、顏色）。建議用 `react-markdown`，加開關讓玩家切換。
  2026-03-13 Claude: 新增 `renderInline()` + `renderMarkdown()` 於 component 外部。支援 `` `code` ``（玫紅）、`**bold**`、`*italic*`（石板灰）、`>` 引用區塊（連續行合併）、`---` 分隔線。`msg.role !== 'user'` 時呼叫，玩家訊息維持 `whitespace-pre-wrap`。同步更新匯出檔名為 `RPworld-{玩家名}-{日期}-{hr}-{mi}.json`。

- [ ] **Scrollbar 樣式統一**
  用 `::-webkit-scrollbar` CSS 自訂滾動條樣式，配合現有石板/棕色系 UI。

- [ ] **世界地圖視覺化**
  目前地圖過於簡陋。方向：SVG 手繪地形 或 可拖曳節點地圖（含霧效、發現/未發現標記）。

- [ ] **旅途中發現地點融入故事**
  AI 輸出 `LOCATION_DISCOVER:地點名` → 前端加入地圖標記「待探索」→ 玩家選擇前往後正式解鎖。與地圖視覺化一起實作。

- [ ] **多配色主題**
  用 `data-theme` + CSS variables 切換主題。建議 4 套：暗石板（現有）、深森林綠、午夜紫、羊皮紙米黃。設定 Modal 加色塊選擇器，儲存至 localStorage。

- [ ] **NPC「角色想法」欄位**
  每個 NPC 新增 `thoughts: string[]`（保留最近 5 則）。AI 透過 `NPC_THOUGHT:姓名:一句話` 寫入。Prompt 只注入最近 2–3 則。NPC Modal 顯示想法時間軸。

- [ ] **更多前端處理項目**
  - 時間系統視覺化（日夜循環 icon / 天空漸層背景）
  - HP/MP 動態條動畫（數字跳動、條縮短）
  - 對話 token 用量估算顯示
  - 道具 `effect` 欄位由前端直接套用數值
  - 自動存檔（每 N 則對話觸發）

---

## 🔴 高優先

- [ ] **Prompt 記憶寫入規則**
  在 `buildPrompt` 的 COMMAND FORMAT 說明裡，加入「AI 何時應輸出 MEMORY_ADD」的規則。
  包含五種情境：世界事件 / 區域事件 / 場景狀態改變 / NPC 情報 / 玩家重要事件。
  特別規則：AI 回應裡出現 `[ ]` 布告欄內容時，必定觸發 `MEMORY_ADD:region`。

- [ ] **任務系統動態化**
  目前任務 Modal 為空白。
  需要：AI 可透過 COMMANDS 寫入任務（新增 `QUEST_ADD` / `QUEST_COMPLETE` 指令）、右側或 Modal 顯示任務列表。

---

## 🟡 中優先

- [ ] **NPC 出沒設定**
  lorebookEntries 的 NPC 類加入：`territory: string[]`（活動地點）、`appearChance: number`（出現機率 0~100）、`isLocationBound: boolean`（是否限定地點）。

- [ ] **NPC 兩階段注入**
  第一階段：進入場景時注入輕量名單（只有名字 + 職業）。
  AI 輸出 `[出場:姓名,姓名]` 標記決定今天誰在場。
  第二階段：偵測到出場標記後，注入完整 NPC 資料 + 相關記憶。

---

## 🟢 之後（低優先）

- [ ] **對話摘要壓縮**
  超過 N 輪後，舊對話壓縮成摘要節省 token。
  建議：保留最近 20 則原文，更早的壓縮成 200 字摘要。

- [ ] **Firebase 雲端儲存**
  取代 localStorage，支援跨裝置同步。

- [ ] **向量語意搜尋記憶**
  進階記憶檢索，不依賴關鍵字，改用語意相似度判斷是否注入。

---

## ✅ 已完成

- [x] **介面與提示詞優化**
  2026-03-12 Gemini: 增加編輯訊息的文字框高度、限制快捷選項在 10 字以內、對話視窗底部毛玻璃效果改為往上淡出、修改初始訊息（ID 1）開場白。

- [x] **個人資訊與數值系統調整**
  2026-03-12 Gemini: 個人資訊的職業預設為「異鄉人」，補充各欄位提示文字，預設 MP、金錢為 0，並移除 HP / MP 的上限設定（`maxHp` / `maxMp`）。

- [x] **快捷選項與重新生成功能修復**
  2026-03-12 Gemini: 修復快捷選項點擊無效的問題，並將其改為動態生成（AI 透過 `<<OPTIONS>>` 輸出）。實作 `handleRegenerate` 函數以支援 AI 回覆的重新生成功能。修復 AI 輸出 `</OPTIONS>>` 或忘記閉合標籤導致解析失敗的問題，並過濾掉選項前面的數字編號。

- [x] **日記系統升級（水晶球日記 + 融合日記）**
  2026-03-12 Claude: 新增 `handleGenerateDiary()` / `handleMergeDiary()`，新增 state `isDiaryMergeMode` / `diaryMergeSelection` / `isDiaryGenerating` / `expandedMergedIds`。日記 Modal 按鈕區重構為三個 icon 按鈕。DiaryEntry 新增 `source` / `mergedFrom` / `isMerged` 欄位。

- [x] **前端 COMMANDS 解析器**
  2026-03-12 Claude: 實作於 `parseAndExecuteCommands()`，支援 HP/MP/金幣/好感度/位置/時間/道具。串流結束後執行，Toast 間隔 600ms。

- [x] **日記關鍵字觸發系統**
  2026-03-12 Claude: 新增 `keywords[]` 欄位，`scanKeywords()` 函數掃最近 5 則。UI 在日記 Modal 編輯區塊底部。

- [x] **統一記憶資料結構（world/region/scene/npc 四層）**
  2026-03-12 Claude: 移除 `worldMemory` / `factionMemory` / `locationMemory`，改為 `memories[]`。新增 `isMemoryTriggered()` / `tickMemoryCounters()`。舊存檔自動 migrate。

- [x] **MEMORY_ADD 指令升級**
  2026-03-12 Claude: 支援完整 tags（locations/npcs/factions/keywords）+ sticky + expires。解析邏輯在 `parseAndExecuteCommands()` 的 memAddMatch 區塊。

- [x] **Lorebook secondaryKeys + AND 邏輯 + insertionOrder**
  2026-03-12 Claude: 新增 `lorebookHitsKeywords()` 函數，`selective` 欄位控制 AND/OR。UI 在 Lorebook Modal 編輯區塊底部，檢視模式顯示標籤。

- [x] **右側面板四層記憶顯示**
  2026-03-12 Claude: 依 type 分組顯示 🌍/🗺️/🏠/👤，只顯示當前地點相關記憶。

- [x] **系統設定 Gemini API Key 輸入欄**
  2026-03-12 Claude: 加在系統設定 Modal 頂部，password 類型，儲存至 `localStorage('gemini_api_key')`。API 呼叫優先使用此 Key。

- [x] **GitHub repo + sync.ps1**
  2026-03-12 Claude: `sync.ps1` 放 repo 根目錄，自動抓 Downloads 最新 zip 並 push。
