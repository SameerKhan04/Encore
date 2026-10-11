# ADR-002: Zustand for the game state machine

## Status
Accepted

## Date
2026-10-11

## Context
Gameplay is a finite set of modes (lobby, recording, pass device, challenge, resolve). State is local to one device, ephemeral per session, and must be easy to drive from UI and tests. Phase 1 already declares `zustand` as a dependency for this purpose.

## Decision
Use **Zustand** as the single client-side game state machine for the core loop. Screens subscribe to store slices; transition helpers enforce legal moves.

## Alternatives Considered

### React Context + useReducer
- Pros: No extra dependency
- Cons: More boilerplate for selectors; easier to over-render without care
- Rejected: Zustand is already chosen and fits a small machine cleanly

### Redux Toolkit
- Pros: Strong DevTools and patterns
- Cons: Heavier for a single local game flow
- Rejected: Unnecessary ceremony for v1

### XState
- Pros: Explicit statecharts, guards, visualization
- Cons: Steeper learning curve; larger API surface for a short loop
- Rejected: Can revisit if the machine grows many orthogonal regions

## Consequences
- Keep store logic framework-agnostic (pure transitions + side-effect helpers) so Jest can test without rendering every screen
- Do not put React Navigation objects inside the store; navigate in response to state or explicit UI actions
- Settings persistence (Phase 3) may use a separate store or module so the game machine stays session-scoped
