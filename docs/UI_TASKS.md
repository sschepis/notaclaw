# UI Implementation Tasks

This document outlines the specific tasks required to bring the "Resonant Terminal" UI from its current mock state to a fully functional interface connected to the AlephNet backend.

## 1. IPC & State Management (Foundation)
- [ ] **Implement IPC Bridge in Main Process**: Ensure `preload/index.ts` exposes `sendMessage`, `onMessage`, `approveTool`, etc., and `main/index.ts` handles them.
- [ ] **Create Zustand Store**: Create `client/src/renderer/store/useAppStore.ts` to manage:
    - `messages`: Array of chat messages.
    - `agentState`: Current SRIA state (Perceiving/Deciding/Acting).
    - `wallet`: Balance and staked amount.
    - `network`: Peer count and connection status.
- [ ] **Connect Store to IPC**: Add middleware or a listener in `App.tsx` to update the Zustand store when IPC events (`onMessage`, `onStateChange`) are received.

## 2. Chat Interface
- [ ] **Wire InputDeck**:
    - Update `InputDeck.tsx` to call `window.electronAPI.sendMessage` on submit.
    - Include `mode` (Chat/Task/Proposal) and `resonance` (slider value) in the message payload.
    - **Visual Enhancement**: Replace `Dropdown` with `<Button.Group>` for mode selection. Style the `<RangeSlider>` for better integration.
- [ ] **Wire ChatView**:
    - Replace `MOCK_MESSAGES` with `useAppStore(state => state.messages)`.
    - Ensure new messages automatically scroll into view.
    - **Visual Enhancement**: Refine `MessageBubble` to use `<Avatar>` for senders and `<Card>`-like styling.
- [ ] **Implement Message Types**:
    - Ensure the backend sends `type` (perceptual, cognitive, etc.) so `MessageBubble` colors render correctly.

## 3. Inspector & Visualization
- [ ] **Implement Real SMF Chart**:
    - Install `recharts`.
    - Replace the placeholder in `Inspector.tsx` with a `<RadarChart>` component.
    - Feed it real 16-dimensional data from the store (mapped to 4-5 key axes for readability if needed).
    - **Visual Enhancement**: Use `<Tabs.Group>` to organize Inspector into "Visuals", "Economics", and "Logs".
- [ ] **Wire Wallet UI**:
    - Connect the "Balance" and "Staked" values in `Inspector.tsx` to the store.
    - Add a "Stake" button that triggers a modal for `window.electronAPI.stakeTokens`.
    - **Visual Enhancement**: Use `<Card>` with large typography for balance display.
- [ ] **Implement Tool Logs**:
    - Create a log stream in the store.
    - Display real tool execution logs (e.g., "Agent calling `readFile`...") in the Inspector.
    - **Visual Enhancement**: Use Flowbite `<Timeline>` component for the log stream.

## 4. Sidebar & Context
- [ ] **Dynamic Agent List**:
    - Fetch active agents from the backend.
    - Show their real status (Idle/Busy) in `Sidebar.tsx`.
    - **Visual Enhancement**: Refactor `Sidebar.tsx` to use Flowbite's `<Sidebar>` component structure. Use `<Avatar>` with status indicators.
- [ ] **Dynamic History**:
    - Load conversation history from Gun.js (via Main process) instead of static items.
    - Allow clicking a history item to load that conversation context.
    - **Visual Enhancement**: Use `<Sidebar.Item>` for history entries.

## 5. Agent HUD (New Component)
- [ ] **Create `AgentHUD.tsx`**:
    - A floating or fixed component that visualizes the SRIA loop.
    - **Visuals**:
        - "Pulse" animation for heartbeat.
        - Text indicating current phase: "Perceiving...", "Minimizing Free Energy...", "Acting".
    - **Data**: Connect to `agentState` in store.

## 6. Polish & UX
- [ ] **Resonance Feedback**:
    - When moving the "Resonance Intent" slider in `InputDeck`, subtly change the border color of the input area to match the target axis (e.g., Blue for Perceptual, Violet for Cognitive).
- [ ] **Connection Status**:
    - Wire the "Network Status" button in `NavRail` to show a tooltip with real peer count and gateway latency.
    - **Visual Enhancement**: Refactor `NavRail.tsx` to use standard `<Button>` components for icons and `<Avatar>` for the user profile.
