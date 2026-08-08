# Design Context — Sentiment Inside Out

> 本檔在觸碰 `frontend/` 下的檔案時才載入。做 backend/crawler 工作時不佔 context。
> 2026-07-26 從 `stock-analysis-project/CLAUDE.md` 移來(原本每個 session 無條件載入)。

## Users

This product is primarily for long-term investors, with a secondary audience of active traders.
The product may also expand into content-driven experiences in the future, so the system should support both tool-like workflows and editorial presentation.

Core jobs to be done:
- understand broad market sentiment quickly
- inspect individual stocks with context
- decide whether to go deeper through premium analysis features
- build confidence in interpreting market psychology, not just price movement

## Brand Personality

Current brand expression reads as:
- analytical
- premium
- technologically current

Desired emotional outcome:
- rational and trustworthy first
- modern and innovative second
- clear sense of market command and situational awareness throughout

Reference direction:
- Apple
- Stripe
- eToro

Shared qualities to preserve:
- modern product thinking
- clean, high-confidence visual systems
- financial technology polish without looking like legacy enterprise software

## Aesthetic Direction

The site currently favors:
- light mode first
- high-clarity cards and panels
- glassy or elevated dialogs
- blue-to-indigo brand gradients for primary actions
- soft shadows, rounded surfaces, and large hero imagery

Anti-drift guidance for future work:
- do not look like a broker back office or legacy trading terminal
- do not regress into dashboard-gray enterprise UI
- do not introduce random multi-brand palettes without semantic meaning
- do not make primary investment workflows feel playful before they feel trustworthy
- do not use dated investment-platform tropes such as dense tables, harsh dividers, or visually noisy KPI walls

## Design Principles

1. Lead with decision clarity. Important numbers, states, and actions should read immediately without requiring visual decoding.
2. Keep premium moments coherent. Upgrade, payment, and gated-feature surfaces should feel like one system, not isolated campaigns.
3. Reuse foundations before inventing variants. Buttons, badges, dialogs, and surfaces should extend shared primitives instead of reappearing as local one-offs.
4. Express financial technology, not legacy finance. Interfaces should feel current, precise, and intentional, with restrained polish rather than institutional heaviness.
5. Use contrast with restraint. Depth should come from spacing, surface layering, and typography before adding more color.
6. Optimize for calm confidence. Even when the data is urgent, the interface should remain controlled and legible.
7. Design for future content. Research articles, explainers, and insight pieces should be able to live inside the same visual system without feeling bolted on.
