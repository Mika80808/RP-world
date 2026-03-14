# CLAUDE.md — 專案上下文（AI 自動讀取）

> 這份文件供 Claude Code 自動讀取，請勿刪除或大幅修改結構。
> 詳細開發歷史請見 CHANGELOG.md，待做任務請見 TODO.md。

---

## ⚡ 每次執行任務的強制流程

### 開始前（必做）
1. 讀取 `TODO.md` — 確認當前優先任務與規格細節
2. 讀取 `CHANGELOG.md` — 了解最新版本狀態，避免重複或衝突

### 完成後（必做）
1. 將 `TODO.md` 對應項目從 `[ ]` 改為 `[x]`
2. 在項目下方補完成註記：`YYYY-MM-DD [Claude]: 簡述改了什麼函數/檔案/區塊`
3. 更新 `CHANGELOG.md` 對應版本區塊，補上本次變更記錄
4. **主動詢問使用者**：「是否將更新後的檔案上傳 GitHub？」
   - 若使用者確認，執行 `sync.ps1` 或等效的 git push 流程

### 未完成交接（Blockers）
若單次對話無法完成整個功能，在 `TODO.md` 該項目下方新增：
```
> ⚠️ 交接筆記：目前卡在 [函數/區塊]，下一步需要 [具體動作]
```

---

## 專案簡介

LLM 擔任 GM 的開放式世界文字冒險 RPG，玩家以自由文字輸入推進劇情。

---

## 技術棧

- **框架**：React 19 + TypeScript + Vite
- **樣式**：Tailwind CSS v4
- **AI**：Google Gemini 2.0 Flash（`@google/genai`）
- **儲存**：localStorage（未來規劃 Firebase）
- **主要檔案**：`src/App.tsx`（核心邏輯）、`src/components/`（UI 組件）

---

## 架構規則

- `App.tsx`：只保留 state、handlers、`buildPrompt`、`parseAndExecuteCommands`、API 呼叫、主介面三欄 JSX
- `src/components/`：純 UI 組件，只接收 props 和 callback，**不持有業務 state**
- **AI 改功能前必須先讀取對應組件檔案**，例如改 NpcModal 前先讀 `src/components/NpcModal.tsx`

---

## 核心資料結構

### memories[]（統一記憶陣列）
```typescript
interface MemoryEntry {
  id: string                          // `mem_${Date.now()}_${random}`
  type: 'world' | 'region' | 'scene' | 'npc'
  importance: 'critical' | 'normal' | 'flavor'
  content: string
  tags: {
    locations: string[]               // 地點名稱，用於觸發篩選
    npcs: string[]
    factions: string[]
    keywords: string[]
  }
  trigger: {
    scanDepth: number                 // 掃最近 N 則對話，預設 5
    probability: number               // 觸發機率 0~100，預設 100
    sticky: number                    // 觸發後持續 N 則，預設 0
    cooldown: number                  // 冷卻 N 則，預設 0
  }
  isActive: boolean
  source: 'manual' | 'ai_generated'
  createdAt: string                   // 遊戲內時間字串
  expiresAt?: string                  // 選填，臨時記憶
}
```

### lorebookEntries[]（設定集）
```typescript
interface LorebookEntry {
  id: number
  title: string
  category: '地點' | 'NPC' | '怪物' | '物品' | '歷史' | string
  content: string                     // 非 NPC 類使用
  // NPC 類專用欄位
  job?: string
  appearance?: string
  personality?: string
  other?: string
  relationship?: string               // 玩家與 NPC 的關係，AI 透過 NPC_RELATIONSHIP 寫入
  lastSeenLocation?: string           // 上次見面地點，前端自動更新
  lastSeenDate?: string               // 上次見面日期（M/D），前端自動更新
  thoughts?: { text: string, createdAt: string }[]  // 最多 5 則，新的在前
  homeLocation?: string               // 主場地點，NPC_HOME 寫入後不再改變
  roamLocations?: string[]            // 滑動窗口，最近 3 個非主場地點
  // 觸發控制
  isActive: boolean
  keywords: string[]                  // 主關鍵字（OR）
  selective: boolean                  // true = AND 邏輯
  secondaryKeys: string[]             // 次要關鍵字（selective=true 時使用）
  insertionOrder: number              // 數字越小越先注入，預設 100
}
```

### diaryEntries[]（日記）
```typescript
interface DiaryEntry {
  id: number
  text: string
  isActive: boolean
  keywords: string[]                  // 空陣列 = 永遠注入；有值 = 關鍵字觸發
  source?: 'manual' | 'ai_generated' | 'merged'
  mergedFrom?: number[]
  isMerged?: boolean
}
```

### quests[]（任務）
```typescript
interface Quest {
  id: number                          // 自動遞增
  title: string                       // 唯一識別，QUEST_COMPLETE 比對依據
  giver: string                       // 委託人 NPC 名稱
  description: string                 // 目標描述
  reward: {
    gold?: number
    items?: string[]
  }
  deadline?: number                   // 遊戲內天數，null 表示無期限
  status: 'active' | 'completed' | 'failed'
  createdAt: string                   // 遊戲內日期 M/D
  completedAt?: string
}
```

### consumables[]（消耗品）
```typescript
interface ConsumableItem {
  name: string
  quantity: number
  description?: string
  effect?: {
    hp?: number                       // 正數回復，負數扣除
    mp?: number
    gold?: number
    status?: string                   // 例如 'poisoned'、'blessed'
  }
}
```

---

## AI 回應格式約定

AI（Gemini）的回應會包含一個指令區塊，**前端攔截解析，不顯示給玩家**：

```
<<COMMANDS>>
HP:-10
MP:+5
GOLD:+100
AFFINITY:芬里爾:+5
LOCATION:月湖鎮
TIME:+2h
ITEM_ADD:草藥:1:回復 20 HP
ITEM_REMOVE:草藥:1
ITEM_USE:草藥
MEMORY_ADD:region:normal:迷霧森林昨日大火:locations=迷霧森林:factions=黑牙氏族:keywords=大火:sticky=3
MEMORY_ADD:scene:normal:酒館暫時關閉:locations=月湖鎮酒館:expires=明日
MEMORY_ADD:npc:normal:芬里爾透露停火協議內幕:npcs=芬里爾:keywords=停火,協議
MEMORY_ADD:world:critical:魔王宣戰:keywords=魔王,宣戰
NPC_NEW:塔維:人類:跑腿:褐色亂髮,眼神靈活:熱心但話多
NPC_HOME:塔維:月湖鎮
NPC_LOCATION:塔維:迷霧森林
NPC_THOUGHT:芬里爾:這個外鄉人比我想像的更難纏。
NPC_RELATIONSHIP:芬里爾:同盟關係，但尚未完全信任
QUEST_ADD:尋找失蹤的藥草:烏爾夫:前往迷霧森林北側取回月光草:50::3
QUEST_COMPLETE:尋找失蹤的藥草
<</COMMANDS>>
```

**MEMORY_ADD 完整格式：**
```
MEMORY_ADD:type:importance:content:locations=x,y:npcs=a:factions=b:keywords=c,d:sticky=N:expires=日期
```
- `scene` / `region` 若未指定 `locations`，自動使用當前地點
- 簡化格式也支援：`MEMORY_ADD:scene:內容`

**QUEST_ADD 格式：**
```
QUEST_ADD:任務名:委託人:目標描述:獎勵金幣:獎勵道具:期限天數
```
- 獎勵道具、期限天數可為空

**出場標記（對話內文，非 COMMANDS 區塊）：**
```
[出場:芬里爾,格雷厄姆]
```
- 前端偵測到後注入出場 NPC 完整資料，並從顯示文字中移除此標記

---

## 重要設計決策

| 決策 | 原因 |
|---|---|
| HP / MP 無上限 | 支援升級後成長感，不 clamp 到 maxHp/maxMp |
| 邏輯在 App.tsx，UI 在 components/ | 重構後的架構，AI 改功能前先讀對應檔案 |
| localStorage 儲存 | 先做 UI，Firebase 之後再加 |
| Gemini 2.0 Flash | 速度與成本平衡 |
| 記憶四層架構 | world / region / scene / npc，依影響範圍分層注入 |
| Lorebook 關鍵字觸發 | 仿 SillyTavern，支援 AND/OR 邏輯 |
| NPC 候選名單上限 5 個 | 避免 Prompt 過長，前端篩選，AI 從候選中決定出場 |
| 任務以名稱作為唯一識別 | 避免編號系統複雜化，AI 直接使用任務名稱 |
| 道具 effect 前端套用 | 減少 AI 計算負擔，數值即時準確 |

---

## ⚠️ 注意事項（踩過的坑）

1. **State 更新必須用 functional update**
   ```typescript
   // ✅ 正確
   setProfile(prev => ({ ...prev, hp: prev.hp - 10 }))
   // ❌ 錯誤（會有舊值風險）
   setProfile({ ...profile, hp: profile.hp - 10 })
   ```

2. **COMMANDS 解析在串流結束後才執行**，不要在串流中途觸發

3. **lorebookEntries 的 NPC 類**注入條件與其他類不同：需要釘選或在當前場景出場，才會進入 relevantLorebook

4. **memories 取代了舊的三個陣列**（`worldMemory` / `factionMemory` / `locationMemory`），不要重新加回去

5. **`package.json` 的 dev script 綁定 `0.0.0.0:3000`**，不要改動這個設定

6. **NPC_HOME 只寫入一次**：若 `homeLocation` 已有值，忽略後續的 `NPC_HOME` 指令

7. **roamLocations 滑動窗口**：最多保留 3 個，unshift 新地點，超過時 pop 最舊的

8. **renderMarkdown 只套用在 AI 訊息**：`msg.role !== 'user'` 時才呼叫，玩家訊息維持 `whitespace-pre-wrap`

---

## 關鍵函數索引

| 函數 | 說明 |
|---|---|
| `buildPrompt(userInput)` | 組裝送給 Gemini 的完整 prompt |
| `parseAndExecuteCommands(text)` | 解析並執行 COMMANDS 區塊 |
| `applyItemEffect(itemName)` | 套用消耗品 effect，數量 -1，歸零時移除 |
| `scanKeywords(keywords, depth, extra)` | 掃描最近 N 則對話是否包含關鍵字 |
| `isMemoryTriggered(mem, userInput)` | 判斷記憶是否應該注入（含 sticky/cooldown）|
| `tickMemoryCounters(triggeredIds)` | 每次 AI 回應後更新 sticky/cooldown 計數器 |
| `lorebookHitsKeywords(entry)` | 判斷 Lorebook 條目是否觸發（含 AND 邏輯）|
| `handleSendMessage()` | 主要的對話送出與 AI 串流邏輯 |
| `renderMarkdown(text)` | 將 AI 回應轉換為帶格式的 React 元素 |
| `renderInline(text, keyPrefix)` | 處理行內 markdown 語法（bold/italic/code）|
