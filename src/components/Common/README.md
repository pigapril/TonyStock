# Common UI Foundations

這一層是目前網站的共用設計基礎，優先放可跨功能重用的 UI primitives。

## Tokens

- `global-styles.css`: 品牌色、surface、state color、陰影、字體與圓角 token。
- `ui-recipes.css`: 低風險的共用 recipe，現在包含 `ui-surface-card`、`ui-page-shell`、`ui-section-*`、`ui-callout`、`ui-data-panel`，適合在高度客製化頁面上漸進式抽取。

## Components

- `Button/Button.js`: 主要 CTA、次要 CTA、outline、destructive 的共用按鈕。
- `Badge/Badge.js`: 通用 pill badge，供方案、狀態、提醒使用。
- `Dialog/Dialog.js`: 共用 modal shell，支援 `className`、`contentClassName`、`maxWidth`。

## Migration Notes

- `Subscription/shared/AppleButton.js` 現在是 `Common/Button` 的相容 wrapper。
- `Subscription/shared/PlanBadge.js` 現在是 `Common/Badge` 的相容 wrapper。
- 新的 modal 需求優先延伸 `Common/Dialog`，不要再各頁面自建 overlay。
- 頁面級改版優先先用 `ui-page-shell` / `ui-section-intro` / `ui-callout` 等 recipe 收斂節奏，再決定是否值得抽成 React 元件。
