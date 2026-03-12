# AI Context & Architecture (CLAUDE.md)

## 1. Tech Stack & Environment
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **State Management**: React Hooks (useState, useEffect, useRef)
- **Storage**: `localStorage` (Future: Firebase)
- **AI Integration**: `@google/genai` (Gemini 2.0 Flash)

## 2. Core Data Structures
### 2.1 Memory System (`memories[]`)
Unified memory array replacing old separated arrays.
```typescript
type Memory = {
  id: string;
  type: 'world' | 'region' | 'scene' | 'npc';
  importance: 'normal' | 'high' | 'critical';
  content: string;
  tags: { locations?: string[]; npcs?: string[]; factions?: string[]; keywords?: string[] };
  trigger: { scanDepth?: number; probability?: number; sticky?: number; cooldown?: number };
  isActive: boolean;
  source: 'system' | 'ai' | 'player';
  createdAt: number;
  expiresAt?: number;
}
```
**Rule**: `scene` / `region` types automatically use the current location if `locations` tag is missing.

### 2.2 Lorebook (`lorebookEntries[]`)
```typescript
type LorebookEntry = {
  // ... standard fields ...
  keywords: string[];       // Primary keywords (OR logic by default)
  secondaryKeys?: string[]; // Secondary keywords
  selective?: boolean;      // If true: requires (Primary AND Secondary)
  insertionOrder?: number;  // Default 100. Lower number = injected first
}
```

## 3. Key Design Decisions
- **HP/MP**: No upper limit (supports RPG growth).
- **COMMANDS Parser**: AI outputs `<<COMMANDS>>...<</COMMANDS>>` which is parsed by frontend and NOT shown to the player.
  - Supported: `HP:±N`, `MP:±N`, `GOLD:±N`, `AFFINITY:name:±N`, `LOCATION:name`, `TIME:+Nh/m`, `ITEM_ADD:name:qty:desc`, `ITEM_REMOVE:name:qty`, `MEMORY_ADD:region:normal:content:tags...`
- **Prompt Injection Order**: System Settings -> Player Stats -> Memory Layers -> Scene Lorebook -> Pinned NPCs -> Diary -> Recent Chat -> COMMAND FORMAT.

## 4. Strict Rules (Do NOT Break)
- **Never** modify `package.json` scripts unless explicitly requested. The dev server must run on `0.0.0.0:3000`.
- **Never** use mock data for API keys.
- **State Updates**: Always use functional state updates `setStats(prev => ...)` in `useEffect` to prevent infinite re-renders.
