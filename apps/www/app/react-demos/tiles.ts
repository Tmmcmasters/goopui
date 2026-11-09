// Slugs whose /react/docs/components tile is a live React preview (react-demos/batch1.tsx
// `Tile`). Plain data, so ComponentTile.vue can read it without loading React.
export const REACT_TILES: ReadonlySet<string> = new Set(['button', 'switch', 'checkbox', 'spinner', 'skeleton', 'badge', 'card', 'avatar', 'separator', 'label', 'menubar'])

// The forms batch's tiles (react-demos/forms.tsx `FormsTile`).
export const REACT_FORMS_TILES: ReadonlySet<string> = new Set(['toggle', 'radio-group', 'input', 'slider', 'progress'])

// Simple batch (react-demos/batch-simple.tsx `SimpleTile`): Alert, Kbd, Breadcrumb, Button Group, Empty, Pagination.
export const REACT_SIMPLE_TILES: ReadonlySet<string> = new Set(['alert', 'kbd', 'breadcrumb', 'button-group', 'empty', 'pagination'])
