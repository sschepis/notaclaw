# UI Enhancement Plan: Flowbite & Tailwind Integration

This plan outlines the steps to elevate the "Resonant Terminal" UI to a professional standard using `flowbite-react` components and advanced Tailwind CSS styling.

## Goals
1.  **Professional Polish**: Replace custom, ad-hoc styles with standardized Flowbite components.
2.  **Visual Consistency**: Unify colors, spacing, and typography across the application.
3.  **Enhanced Interactivity**: Use proper interactive states (hover, focus, active) provided by the library.
4.  **Maintainability**: Reduce custom CSS/utility bloat by relying on the component library.

## 1. Global Configuration
-   **Dark Mode**: Ensure the `Flowbite` theme provider is correctly wrapping the application (if needed) or that the `dark` class is properly applied to the root, leveraging Flowbite's built-in dark mode support.
-   **Typography**: Adopt `Inter` or a similar professional sans-serif font via Google Fonts or a local asset, configured in `tailwind.config.js`.

## 2. Component Refactoring

### A. Sidebar (`client/src/renderer/components/layout/Sidebar.tsx`)
**Current**: Custom `div` structure with manual borders and spacing.
**Target**: Use `flowbite-react`'s `<Sidebar>` component.
-   **Structure**:
    -   `<Sidebar>` container.
    -   `<Sidebar.Logo>` for "AlephNet".
    -   `<Sidebar.Items>` containing multiple `<Sidebar.ItemGroup>`.
-   **Sections**:
    -   **Active Agents**: Use `<Sidebar.Item>` with an `icon` prop (or custom render) using `<Avatar>` with status indicators (green/yellow dots).
    -   **Pinned Contexts**: Use `<Sidebar.Item>` or a custom styled item containing `<Badge>` components.
    -   **History**: Use `<Sidebar.Item>` for each history entry.

### B. Navigation Rail (`client/src/renderer/components/layout/NavRail.tsx`)
**Current**: Custom flex column.
**Target**: Retain custom layout (as it's a specific "rail" pattern) but enhance internals.
-   **Avatar**: Use `<Avatar rounded status="online" />` for the user profile.
-   **Tooltips**: Continue using `<Tooltip>` but ensure consistent placement and styling.
-   **Icons**: Wrap icons in standard `<Button color="gray" pill>` or similar to give them a consistent click target and hover effect.

### C. Chat Interface (`client/src/renderer/components/layout/ChatView.tsx` & `MessageBubble.tsx`)
**Current**: Custom bubbles with specific color coding.
**Target**: Refine the visual hierarchy.
-   **MessageBubble**:
    -   Keep the semantic color coding (it's a core feature).
    -   Add `<Avatar>` for the sender (User vs. Agent).
    -   Use `<Card>` internals or just refined Tailwind classes for a softer, more modern look (rounded corners, subtle shadows).
    -   Improve typography for the timestamp and message type labels.

### D. Input Deck (`client/src/renderer/components/ui/InputDeck.tsx`)
**Current**: Functional but basic.
**Target**: A "Command Center" feel.
-   **Mode Switcher**: Replace the `Dropdown` with a `<Button.Group>` or a segmented control using `<Button color="gray">`.
-   **Resonance Slider**: Style the `<RangeSlider>` to look more integrated, possibly with a custom label showing the value dynamically.
-   **Textarea**: Use `<Textarea>` with the `shadow` prop and ensure it focuses with the correct theme color (e.g., Purple/Blue gradient border).
-   **Submit**: Use a gradient `<Button>` (already there, but refine the gradient).

### E. Inspector (`client/src/renderer/components/layout/Inspector.tsx`)
**Current**: Placeholders and basic cards.
**Target**: A data-rich dashboard panel.
-   **Structure**: Use `<Card>` for distinct sections.
-   **Tabs**: Implement `<Tabs.Group style="underline">` to switch between "Visuals", "Economics", and "Logs" if space is tight.
-   **Visuals**:
    -   Implement the `Recharts` Radar Chart (Spider Chart) for the SMF field.
-   **Logs**:
    -   Use `<Timeline>` to show system logs vertically.
-   **Wallet**:
    -   Use `<Card>` with a layout that highlights the numbers (large font) and includes a "Stake" `<Button>`.

## 3. Implementation Steps

1.  **Setup**: Install `recharts` (already installed) and verify `flowbite-react` setup.
2.  **Refactor Sidebar**: Replace `Sidebar.tsx` content.
3.  **Refactor NavRail**: Update `NavRail.tsx` with Avatars and Buttons.
4.  **Refactor Inspector**: Implement Tabs, Timeline, and Recharts.
5.  **Refactor InputDeck**: Improve controls and layout.
6.  **Refactor Chat**: Polish message bubbles.

## 4. Visual Theme
-   **Colors**: Align with the "Resonant" theme:
    -   Primary: Violet/Purple (Cognitive)
    -   Secondary: Blue (Perceptual)
    -   Accent: Pink/Fuchsia (Resonance)
    -   Background: `gray-900` / `gray-950`
