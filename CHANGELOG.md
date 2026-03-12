# 開發日誌 (Development Log)

這份文件用於記錄專案的更新內容、架構調整與已知問題。
(此文件僅供開發者檢視，不會顯示於前端 UI)

## [Unreleased]
### Added
- 建立 `CHANGELOG.md` 作為開發日誌。
- 清除預設的任務、道具、消耗品與日記資料，使初始狀態更乾淨。

### Changed
- 調整了初始的系統提示詞 (System Prompt) 與開場白（學長在森林醒來的場景）。
- 調整了任務面板的 UI 狀態，當沒有任務時會顯示「目前沒有任務」。

### Fixed
- (無)

## [2026-03-12]
### Added
- 實作統一記憶系統架構：支援世界 (World)、區域 (Region)、場景 (Scene) 與 NPC 記憶分類。
- 實作前端指令解析器 (Command Parser)：支援 AI 透過 `<<COMMANDS>>` 區塊自動更新玩家數值 (HP, MP, GOLD)、好感度 (AFFINITY)、地點 (LOCATION)、時間 (TIME)、道具 (ITEM_ADD/REMOVE) 與記憶 (MEMORY_ADD)。
- 實作關鍵字觸發系統：記憶與日記條目支援關鍵字掃描，實現動態上下文注入。
- 強化 Lorebook 功能：支援 AND 邏輯 (Selective Keys) 與注入順序 (Insertion Order) 設定。
- 實作記憶冷卻與持續機制：支援 Sticky (持續觸發) 與 Cooldown (冷卻) 計數器。
- 支援舊存檔自動轉換至新記憶架構。

### Changed
- 專案初始化與基礎架構建立。
- 確立了動態記憶分類架構（永遠注入、場景觸發、NPC 觸發、手動啟用）。
- 調整了初始的系統提示詞 (System Prompt) 與開場白。
- 調整了任務面板的 UI 狀態。
