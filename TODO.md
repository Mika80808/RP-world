# TODO.md — 待開發任務

> AI 開始工作前請先讀這個檔案，確認當前優先任務。
>
> **完成任務後的規則：**
> 1. 將 `[ ]` 改為 `[x]`
> 2. 在項目下方補一行完成註記，格式：
>    `YYYY-MM-DD [AI名稱]: 簡述改了什麼函數/檔案/區塊`
> 3. 同步更新 CHANGELOG.md 對應版本區塊
> 4. 當 [x] 項目累積過多時，由 User 定期清空
>
> **架構規則（重構完成後生效）：**
> - `App.tsx`：只保留 state、handlers、`buildPrompt`、`parseAndExecuteCommands`、API 呼叫、主介面三欄 JSX
> - `src/components/`：純 UI 組件，只接收 props 和 callback，不持有業務 state
> - AI 改功能前必須先讀取對應組件檔案

---

## 🔴 高優先

- [ ] **任務系統規格升級**

  **功能意義**：AI 可透過 COMMANDS 動態新增、完成任務，玩家在任務日誌中追蹤進度，期限到了自動失敗。

  **資料結構**（新增 `quests` state，陣列，存入 localStorage 存檔）：
  ```
  {
    id: number,           // 自動遞增
    title: string,        // 任務名稱（唯一識別，Prompt 注入與 QUEST_COMPLETE 比對依據）
    giver: string,        // 委託人 NPC 名稱
    description: string,  // 目標描述
    reward: {
      gold?: number,
      items?: string[]
    },
    deadline?: number,    // 遊戲內天數，null 表示無期限
    status: 'active' | 'completed' | 'failed',
    createdAt: string,    // 遊戲內日期 M/D
    completedAt?: string
  }
  ```

  **COMMANDS 新增 / 修正指令**（於 `parseAndExecuteCommands` 解析）：
  - `QUEST_ADD:任務名:委託人:目標描述:獎勵金幣:獎勵道具:期限天數`
    - 建立新任務，status='active'，自動開啟 QuestModal
    - Toast：「📋 新任務：XX」
    - 獎勵道具可為空，期限天數可為空（無期限）
  - `QUEST_COMPLETE:任務名`
    - 用任務名稱比對找到對應任務，status 改為 'completed'，目標描述前勾選框打勾
    - 自動發放獎勵：gold 加入 `profile.gold`，items 加入 `inventory`
    - Toast：「✅ 任務完成：XX，獲得 XX 銅」

  **期限自動失敗**：
  - 每次 `TIME_ADVANCE` 指令執行後，前端掃描所有 status='active' 的任務
  - 計算遊戲累計天數是否超過 `deadline`，超過則自動標記 status='failed'
  - Toast：「❌ 任務失敗：XX」

  **Prompt 注入**（於 `buildPrompt`）：
  - 注入所有 status='active' 的任務清單：
    ```
    [進行中任務]
    尋找失蹤的藥草（委託：烏爾夫，剩 3 天）
    送信給獵人公會（委託：芬里爾，無期限）
    ```
  - COMMAND FORMAT 說明補充：
    - `QUEST_ADD`：NPC 委託玩家任務、或布告欄出現可接取的任務時輸出
    - `QUEST_COMPLETE`：玩家向委託人回報、AI 判斷任務確實達成時輸出，使用與建立時完全相同的任務名稱

  **QuestModal UI**（`src/components/QuestModal.tsx`）：
  - 頂部三個狀態計數：進行中 / 已完成 / 失敗
  - 每張任務卡片顯示：任務名、委託人、目標描述（前方有勾選框，由前端控制）、獎勵（金幣＋道具）、接受日期
  - 進行中：綠色邊框，右上角顯示剩餘天數或「無期限」
  - 已完成：灰化＋刪除線＋綠色「✓ 完成」標籤＋完成日期
  - 失敗：灰化＋刪除線＋紅色「✗ 失敗」標籤＋「期限超過」

- [ ] **道具 effect 前端處理**

  **功能意義**：消耗品使用後由前端直接套用數值變化，不需要 AI 介入計算，減少 token 消耗並確保數值即時更新。

  **資料結構異動**（`consumables` 陣列每個項目）新增欄位：
  - `effect?: { hp?: number, mp?: number, gold?: number, status?: string }`
  - 數值正數為增加，負數為扣除
  - `status` 為狀態異常字串，例如 `'poisoned'`、`'blessed'`（目前前端顯示用，暫不做複雜邏輯）
  - effect 由 AI 透過 `ITEM_ADD` 指令建立消耗品時一併寫入，玩家不能修改

  **抽出共用函數 `applyItemEffect(itemName: string)`**（兩種觸發方式共用）：
  - 在 `consumables` 中找到對應道具
  - 套用 effect：`hp` 加入 `profile.hp`、`mp` 加入 `profile.mp`、`gold` 加入 `profile.gold`、`status` 寫入 `profile.status`
  - 數量 -1，歸零時從 `consumables` 移除
  - Toast：「🧪 使用 XX：HP +30」（依實際 effect 內容動態產生）

  **觸發方式一：道具欄點擊「使用」按鈕**：
  - 前端呼叫 `applyItemEffect(itemName)`
  - 同時送出訊息給 AI：「（玩家使用了 XX，效果已套用）」，讓 AI 接續描述場景反應

  **觸發方式二：AI 輸出 ITEM_USE 指令**：
  - 格式：`ITEM_USE:道具名`
  - 於 `parseAndExecuteCommands` 解析，呼叫 `applyItemEffect(itemName)`
  - 沉浸式玩家在對話中描述使用道具時，AI 自行判斷並輸出此指令

  **buildPrompt COMMAND FORMAT 說明補充**：
  - `ITEM_USE`：當玩家在對話中明確表示使用某消耗品時輸出，使用與道具欄完全相同的道具名稱

---

## 🟡 中優先

- [ ] **多配色主題**
  用 `data-theme` + CSS variables 切換主題。建議 4 套：暗石板（現有）、深森林綠、午夜紫、羊皮紙米黃。設定 Modal 加色塊選擇器，儲存至 localStorage。

- [ ] **更多前端處理項目**
  - 時間系統視覺化（日夜循環 icon / 天空漸層背景）
  - HP/MP 動態條動畫（數字跳動、條縮短）
  - 對話 token 用量估算顯示
  - 自動存檔（每 N 則對話觸發，使用 `useEffect` 監聽 `messages`，靜默存入 `rpworld_save`）

---

## 🟢 之後（低優先）

- [ ] **對話摘要壓縮**
  超過 N 輪後，舊對話壓縮成摘要節省 token。
  建議：保留最近 20 則原文，更早的壓縮成 200 字摘要。

- [ ] **Firebase 雲端儲存**
  取代 localStorage，支援跨裝置同步。（目前已決定暫緩）

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
  2026-03-13 Claude: 新增 `lastSavedAt` state，`handleQuickSave` 存檔後呼叫 `setLastSavedAt(new Date())`，存檔按鈕下方顯示「上次存檔 HH:MM:SS」。

- [x] **對話框 Markdown 渲染**
  2026-03-13 Claude: 新增 `renderInline()` + `renderMarkdown()` 於 component 外部。支援 `` `code` ``（玫紅）、`**bold**`、`*italic*`（石板灰）、`>` 引用區塊（連續行合併）、`---` 分隔線。`msg.role !== 'user'` 時呼叫，玩家訊息維持 `whitespace-pre-wrap`。引用區塊樣式：`border-l-2 border-stone-500 bg-stone-800/30`。

- [x] **Scrollbar 樣式統一**
  2026-03-13 Gemini: 在 `src/index.css` 新增全域捲軸樣式，配合深色系 UI。

- [x] **世界地圖視覺化**
  2026-03-13 Claude: 重寫 `MapModal.tsx`，改用 SVG 節點地圖；依 type 分色（town/danger/city/poi）；可滑鼠拖曳 pan；hover tooltip；地形裝飾線；節點連線；圖例；搜尋欄；undiscovered 霧化效果。

- [x] **旅途中發現地點融入故事**
  2026-03-13 Claude: 在 `parseAndExecuteCommands` 新增 `LOCATION_DISCOVER` 解析；模糊比對已知地點設 discovered=true；未知地點加入 dynamic 陣列標記「待探索」；Toast 通知；Prompt 說明 AI 何時應輸出。

- [x] **NPC「角色想法」功能**
  2026-03-13 Gemini: 實作 NPC 角色想法功能，包含資料結構更新、UI 呈現、`NPC_THOUGHT` 指令解析、自動更新上次見面時間地點，以及 Prompt 注入。
  2026-03-13 Claude: 依新規格更新：`relationship` 改為 AI 生成，新增 `NPC_RELATIONSHIP` 指令解析與 Prompt 說明；NpcModal 標題列改為三行（第二行合併關係 ｜ 好感度）。

- [x] **App.tsx 組件拆分重構**
  2026-03-13 Claude: 確認所有 8 個 Modal 已獨立於 `src/components/`，App.tsx 只保留 import + `<ComponentName props />` 使用方式，無內嵌 Modal JSX。

- [x] **Prompt 記憶寫入規則**
  2026-03-13 Gemini: 在 `buildPrompt` 的 COMMAND FORMAT 區塊新增【AI 何時應輸出 MEMORY_ADD】說明，定義五大情境與布告欄觸發規則。

- [x] **任務系統動態化（初版）**
  2026-03-13 Gemini: 新增 `quests` state，在 `parseAndExecuteCommands` 實作 `QUEST_ADD` 與 `QUEST_COMPLETE` 解析，並傳遞至 `QuestModal` 顯示進行中、可接取、已完成任務。

- [x] **NPC 出沒系統 + 兩階段注入**
  2026-03-13 Claude: LorebookModal.tsx 介面、App.tsx（state/parseAndExecuteCommands/buildPrompt/stream 後處理）。LorebookEntry 新增 `homeLocation`、`roamLocations`（滑動窗口最近 3 個）。COMMANDS 新增 `NPC_NEW`、`NPC_HOME`、`NPC_LOCATION`。Phase 1 注入候選名單（輕量，最多 5 個）；Phase 2 偵測 `[出場:姓名]` 後注入完整資料。
