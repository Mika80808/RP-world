# 待辦清單 (TODO)

## 優先級定義
- **[P0] 阻礙開發的重大問題** (Blockers)
- **[P1] 核心功能開發** (Core Features)
- **[P2] 次要功能/優化** (Enhancements)
- **[P3] 未來規劃** (Backlog)

---

## [P1] Prompt 記憶寫入規則
**狀態**: 待處理
**目標**: 告訴 AI 何時應輸出 `MEMORY_ADD`，包含 `[ ]` 布告欄自動觸發邏輯。
**涉及檔案**: `src/services/geminiService.ts` (或負責組合 Prompt 的檔案)
**具體需求**:
- [ ] 在 System Prompt 中明確定義 `MEMORY_ADD` 的使用時機。
- [ ] 說明布告欄任務或重要事件發生時，必須使用 `MEMORY_ADD` 記錄。
- [ ] 確保 AI 了解新版 `MEMORY_ADD` 的格式：`MEMORY_ADD:region:normal:內容:locations=迷霧森林:factions=黑牙氏族:keywords=大火:sticky=3`。

## [P1] 任務系統動態化
**狀態**: 待處理
**目標**: 目前 Modal 為空白，需接 AI 動態寫入。
**涉及檔案**: `src/components/QuestModal.tsx` (假設名稱), `src/services/geminiService.ts`
**具體需求**:
- [ ] 定義任務的資料結構 (Quest Interface)。
- [ ] 新增 AI 指令 (例如 `QUEST_ADD`, `QUEST_UPDATE`, `QUEST_COMPLETE`)。
- [ ] 前端解析指令並更新任務狀態。
- [ ] 將任務狀態注入到 Prompt 中讓 AI 知道當前進度。

## [P2] NPC 出沒設定
**狀態**: 待處理
**目標**: 讓 NPC 根據時間/地點動態出現。
**涉及檔案**: `src/types.ts` (NPC Interface), `src/services/geminiService.ts`
**具體需求**:
- [ ] 在 NPC 資料結構中新增 `territory[]`, `schedule`, `appearChance`, `isLocationBound`。
- [ ] 在組合 Prompt 時，根據當前時間和地點過濾出可能出現的 NPC。

## [P2] NPC 兩階段注入
**狀態**: 待處理
**目標**: 節省 Token，先給名單，有互動才給完整資料。
**涉及檔案**: `src/services/geminiService.ts`
**具體需求**:
- [ ] 第一階段：Prompt 中只注入當前地點的 NPC 輕量名單 (名字 + 簡短描述)。
- [ ] 第二階段：當玩家對話提及該 NPC，或 AI 決定讓該 NPC 登場時，才注入完整資料與記憶。

## [P3] 對話摘要壓縮
**狀態**: 待處理
**目標**: 超過 N 輪後，舊對話壓縮成摘要節省 token。

## [P3] Firebase 雲端儲存
**狀態**: 待處理
**目標**: 取代 localStorage，實現跨裝置遊玩。

## [P3] 向量語意搜尋記憶
**狀態**: 待處理
**目標**: 進階記憶檢索，取代單純的關鍵字比對。
