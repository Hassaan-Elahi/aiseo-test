# Metropolis Arena Seating Map

A modern, accessible React + TypeScript interactive venue seating map with viewport culling for high-performance rendering of 15,000+ seat venues.

## Quick Start

```bash
pnpm install
pnpm dev                # Development server with HMR
pnpm typecheck         # Type checking
pnpm lint              # ESLint validation
pnpm test              # Unit/integration tests (vitest)
pnpm build             # Production build
```

## Features

### Core Features ✅
- **Seat Selection**: Up to 8 seats, persisted to localStorage
- **Keyboard Navigation**: Arrow keys + Enter/Space to select; Tab to focus seats
- **Zoom & Pan**: Mouse wheel to zoom (1x–8x), drag empty space to pan
- **Responsive Layout**: Adapts to arbitrary venue map dimensions
- **Accessibility**: Full WCAG 2.1 AA support with ARIA labels, focus management, status updates

### Optional Features ✅

#### 🔥 Price Heat Map
- Toggle heat-map coloring by price tier (Tier 1–4)
- Legend displays tier colors for available seats
- Disabled seat key shows reserved, held, and sold status with visual pattern
- Available seats only—disabled seats retain visual pattern overlay

#### 🌙 Dark Mode
- Toggle between light and dark themes
- Theme preference persists to localStorage
- System dark mode preference auto-detected on first visit
- All colors meet WCAG AA contrast ratios (3:1+)

#### 🪑 Find N Adjacent Seats
- Specify how many nearby seats to find (1–8)
- Uses Euclidean distance to locate nearest available seats
- Respects max-8 selection limit and excludes already-selected seats
- Helper status message confirms seats added or explains why none were found

## Venue Data

Three dataset options in `public/`:

| File | Seats | Layout | Use Case |
|------|-------|--------|----------|
| `venue.test.json` | 9 | 3 sections, small rows | Unit testing, rapid iteration |
| `venue.stadium.json` | 990 | 22 rows, expanding width, 4 price tiers | Realistic smaller venue, UX testing |
| `venue.stress.json` | 18,000 | 6×4 section grid, 150 rows total | Performance stress-testing, viewport culling validation |

Change which dataset loads by editing the `VENUE_DATA_SOURCE` constant in `src/App.tsx`.

## Architecture

### Modular Component & Hook Structure

App logic is split into reusable hooks and components:

**Hooks** (`src/hooks/`):
- `useTheme` — Dark mode toggle with localStorage persistence and document attribute updates
- `useFeatureToggles` — Heatmap toggle with localStorage
- `useVenueData` — Venue loading, error handling, initialization
- `usePanZoom` — Pan/zoom state, RAF-throttled event handlers, pointer capture
- `useSeatSelection` — Seat selection, focus management, keyboard navigation, localStorage persistence
- `useAdjacentSeatsHelper` — Find N adjacent seats using distance-based algorithm

**Components** (`src/components/`):
- `Topbar` — Header with zoom controls, feature toggles, adjacent-seats input
- `MapViewport` — SVG map container with viewport culling and gesture handlers
- `Sidebar` — Legend panels, seat details, selection summary, status messages
- `SeatCircle` — Memoized individual seat renderer
- `SeatDetails` — Focused seat information panel
- `SelectionSummary` — Live seat count and subtotal display

**Utilities** (`src/lib/`):
- `venue.ts` — Seat indexing, directional navigation, nearest-seat queries
- `pricing.ts` — Price tier validation
- `types.ts` — Shared TypeScript interfaces

### Performance Optimizations

1. **Viewport Culling**: Only renders visible seats + 80px buffer; dramatically reduces DOM for 18k-seat venues
2. **Memoization**: `useMemo` on visible seats, selected seat set, and focused seat to prevent redundant calculations
3. **RAF Throttling**: Pan and zoom updates buffered via `requestAnimationFrame` to maintain 55–60 FPS
4. **Component Memoization**: `SeatCircle` memoized to prevent re-renders when props unchanged
5. **Pointer Capture**: Efficient multi-pointer drag handling with RAF-buffered updates

### Dark Mode Theme System

20+ semantic CSS variables define light and dark palettes:
```css
/* Light mode (default) */
--bg-page, --text-primary, --seat-available, --tier-1/2/3/4
--disabled-reserved, --disabled-held, --disabled-sold, --focus

/* Dark mode ([data-theme='dark']) */
/* Same tokens, adjusted for contrast and dark backgrounds */
```

Variables fully decouple colors from component logic, enabling instant theme switching with no re-renders.

### Keyboard Navigation & Accessibility

- **Arrow keys**: Navigate between seats (wraps across rows/sections)
- **Enter / Space**: Toggle selection of focused seat
- **Tab / Shift+Tab**: Focus seats in tab order
- **Viewport hint**: Explains zoom, pan, and keyboard controls
- **Status messages**: aria-live="polite" for seat addition feedback
- **ARIA labels**: Each seat includes section, row, column, price tier, and status
- **Focus styling**: Visible focus ring with high-contrast color token

## Testing

**Unit & Integration Tests** (`src/App.test.tsx`, `src/lib/venue.test.ts`):
- 5 tests passing: seat selection, unavailable inspection, summary updates, nearest-seat queries, directional nav
- Mocked fetch and localStorage
- Full venue data and seat index validation

**E2E Tests** (Playwright):
Not yet implemented; next phase will add specs for:
- Seat selection flow + persistence
- Keyboard navigation
- Feature toggles (heat-map, dark mode)
- Adjacent-seats helper
- Zoom/pan interactions

## Browser Support

Modern browsers with ES2022+ support (Chrome 104+, Firefox 104+, Safari 16+, Edge 104+).

## Code Quality

- **TypeScript strict mode** enabled
- **ESLint** with react-hooks and react-refresh plugins
- **No warnings**: 0 lint errors, 0 typecheck errors, all tests green

## Future Work

- **Pinch-zoom gestures** for mobile (touch scaling on large maps)
- **E2E tests** (Playwright) with multi-device coverage
- **Websocket updates** for real-time seat availability
- **Seat groups** (pair, group of 4, accessible seating) with advanced search
- **Undo/redo** for selection history

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed design decisions and trade-offs.


