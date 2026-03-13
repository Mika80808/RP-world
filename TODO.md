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

- [x] **Scrollbar 樣式統一**
  用 `::-webkit-scrollbar` CSS 自訂滾動條樣式，配合現有黑色系 UI。
  2026-03-13 Gemini: 在 `src/index.css` 新增全域捲軸樣式，配合深色系 UI。

- [x] **世界地圖視覺化**
  目前地圖過於簡陋。方向：SVG 手繪地形 或 可拖曳節點地圖（含霧效、發現/未發現標記）。
  2026-03-13 Claude: 重寫 `MapModal.tsx`，改用 SVG 節點地圖；依 type 分色（town/danger/city/poi）；可滑鼠拖曳 pan；hover tooltip；地形裝飾線；節點連線；圖例；搜尋欄；undiscovered 霧化效果。

- [x] **旅途中發現地點融入故事**
  AI 輸出 `LOCATION_DISCOVER:地點名` → 前端加入地圖標記「待探索」→ 玩家選擇前往後正式解鎖。與地圖視覺化一起實作。
  2026-03-13 Claude: 在 `parseAndExecuteCommands` 新增 `LOCATION_DISCOVER` 解析；模糊比對已知地點設 discovered=true；未知地點加入 dynamic 陣列標記「待探索」；Toast 通知；Prompt 說明 AI 何時應輸出。

- [ ] **多配色主題**
  用 `data-theme` + CSS variables 切換主題。建議 4 套：暗石板（現有）、深森林綠、午夜紫、羊皮紙米黃。設定 Modal 加色塊選擇器，儲存至 localStorage。

- [x] **新增NPC「角色想法」功能**

  **功能意義**：NPC 即時產生的內心想法，讓 AI 在後續對話中能維持該 NPC 的態度與立場。

  **資料結構異動**（lorebookEntries，category='NPC'）新增欄位：
  - `relationship: string`：玩家與該 NPC 的關係描述（例如「氏族首領」「商店老闆」），玩家手動填寫
  - `lastSeenLocation: string`：上次見面地點，前端自動更新
  - `lastSeenDate: string`：上次見面日期（`M/D` 格式），前端自動更新
  - `thoughts: { text: string, createdAt: string }[]`：最多保留 5 則，新的在前，超過時刪除最舊的

  **上次見面自動更新邏輯**：
  - 每次 AI 回應串流結束後，掃描回應內文是否出現該 NPC 名稱
  - 若出現，自動將 `lastSeenLocation` 更新為 `currentLocation`、`lastSeenDate` 更新為今天日期（`M/D`）
  - 靜默更新，不 Toast

  **COMMANDS 新增指令**（於 `parseAndExecuteCommands` 解析）：
  - 格式：`NPC_THOUGHT:姓名:一句話內心想法`
  - 找到對應 NPC（名稱模糊比對），將新想法 unshift 進 `thoughts` 陣列頭部
  - 超過 5 則時 pop 掉最後一則
  - 靜默寫入，不 Toast

  **Prompt 注入**（於 `buildPrompt` 的 NPC 資料區塊）：
  - 每個被注入的 NPC，若 `thoughts.length > 0`，在其資料後附加全部 5 則想法(短句子)
  - 格式：`[近期想法] 1.想法 / 2.想法 / ...`

  **buildPrompt COMMAND FORMAT 說明新增**：
  - 說明 AI 何時應輸出 `NPC_THOUGHT`：當 NPC 有明顯情緒變化、做出重要決定、或對玩家產生新看法時，以第一人稱輸出一句話內心想法

  **NPC 詳情 Modal UI 改版**（參考確認版模擬圖）：
  - 標題列三行排版：
    - 第一行：姓名 ｜ 職業
    - 第二行：關係 ｜ 好感度數值
    - 第三行：上次見面：地點・日期
  - 外貌、個性、備註區塊維持不變
  - 底部新增「💭 角色想法」區塊：
    - 5 則卡片，最新在最上方，越舊透明度越低（1.0 / 0.85 / 0.7 / 0.55 / 0.4）
    - 每則卡片：`border-left: 2px solid rose-400`、背景 `bg-secondary`、想法文字加「」書名號、右下角顯示日期（`M/D`）
    - 無想法時顯示灰色斜體「不知道在想什麼」
  2026-03-13 Gemini: 實作 NPC 角色想法功能，包含資料結構更新、UI 呈現、`NPC_THOUGHT` 指令解析、自動更新上次見面時間地點，以及 Prompt 注入。
  2026-03-13 Claude: 依新規格更新：`relationship` 改為 AI 生成，新增 `NPC_RELATIONSHIP` 指令解析與 Prompt 說明；NpcModal 標題列改為三行（第二行合併關係 ｜ 好感度）。

- [ ] **更多前端處理項目**
  - 時間系統視覺化（日夜循環 icon / 天空漸層背景）
  - HP/MP 動態條動畫（數字跳動、條縮短）
  - 對話 token 用量估算顯示
  - 道具 `effect` 欄位由前端直接套用數值
  - 自動存檔（每 N 則對話觸發）

---

## 🔴 高優先

- [x] **App.tsx 組件拆分重構**

  **背景**：App.tsx 目前超過 2000 行，未來功能加入後預估達 4000–5000 行。趁功能未爆炸前先拆，降低維護成本與 AI token 消耗。

  **完成後更新本檔案頂部規則為**：
  - `App.tsx`：只保留 state、handlers、`buildPrompt`、`parseAndExecuteCommands`、API 呼叫、主介面三欄 JSX
  - `src/components/`：純 UI 組件，只接收 props 和 callback，**不持有業務 state**
  - AI 改功能前必須先讀取對應組件檔案

  **拆分清單**（依序執行，每拆一個確認畫面正常再繼續）：

  | 目標檔案 | 備註 |
  |---|---|
  | `src/components/DiaryModal.tsx` | 日記 Modal，handlers 留在 App.tsx 以 props 傳入 |
  | `src/components/LorebookModal.tsx` | 設定集 Modal |
  | `src/components/NpcModal.tsx` | NPC 詳情 Modal |
  | `src/components/MapModal.tsx` | 地圖 Modal（已存在，確認介面一致） |
  | `src/components/SettingsModal.tsx` | 系統設定 Modal（已存在） |
  | `src/components/QuestModal.tsx` | 任務 Modal（已存在） |
  | `src/components/ProfileModal.tsx` | 個人資訊 Modal（已存在） |
  | `src/components/SystemPromptModal.tsx` | 系統提示詞 Modal（已存在） |

  **每個組件的 props 設計原則**：
  - 需要顯示的 state 資料以 props 傳入
  - 需要修改 state 的操作以 callback 函數傳入（例如 `onClose`, `onSave`, `onChange`）
  - 組件內不使用 `useState` 管理業務資料，只允許管理純 UI 狀態（例如搜尋框輸入值、展開折疊）
  2026-03-13 Claude: 確認所有 8 個 Modal 已獨立於 `src/components/`，App.tsx 只保留 import + `<ComponentName props />` 使用方式，無內嵌 Modal JSX。

- [x] **Prompt 記憶寫入規則**
  在 `buildPrompt` 的 COMMAND FORMAT 說明裡，加入「AI 何時應輸出 MEMORY_ADD」的規則。
  包含五種情境：世界事件 / 區域事件 / 場景狀態改變 / NPC 情報 / 玩家重要事件。
  特別規則：AI 回應裡出現 `[ ]` 布告欄內容時，必定觸發 `MEMORY_ADD:region`。
  2026-03-13 Gemini: 在 `buildPrompt` 的 COMMAND FORMAT 區塊新增【AI 何時應輸出 MEMORY_ADD】說明，定義五大情境與布告欄觸發規則。

- [x] **任務系統動態化**
  目前任務 Modal 為空白。
  需要：AI 可透過 COMMANDS 寫入任務（新增 `QUEST_ADD` / `QUEST_COMPLETE` 指令）、右側或 Modal 顯示任務列表。
  2026-03-13 Gemini: 新增 `quests` state，在 `parseAndExecuteCommands` 實作 `QUEST_ADD` 與 `QUEST_COMPLETE` 解析，並傳遞至 `QuestModal` 顯示進行中、可接取、已完成任務。

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

- [x] **快速存檔後的紀錄顯示**（bug）
  存檔成功但 UI 沒反應，需在 `handleQuickSave` 完成後更新 `lastSavedAt` state，顯示「上次存檔：XX:XX」。
  2026-03-13 Claude: 新增 `lastSavedAt` state，`handleQuickSave` 存檔後呼叫 `setLastSavedAt(new Date())`，存檔按鈕下方顯示「上次存檔 HH:MM:SS」。

- [x] **對話框 Markdown 模式**
  AI 回應支援 render markdown（粗體、斜體、分隔線、顏色）。建議用 `react-markdown`，加開關讓玩家切換。
  2026-03-13 Claude: 新增 `renderInline()` + `renderMarkdown()` 於 component 外部。支援 `` `code` ``（玫紅）、`**bold**`、`*italic*`（石板灰）、`>` 引用區塊（連續行合併）、`---` 分隔線。`msg.role !== 'user'` 時呼叫，玩家訊息維持 `whitespace-pre-wrap`。同步更新匯出檔名為 `RPworld-{玩家名}-{日期}-{hr}-{mi}.json`。

