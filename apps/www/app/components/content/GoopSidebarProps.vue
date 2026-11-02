<script setup lang="ts">
// Props of GoopSidebar. Defaults match packages/vue/src/components/sidebar/GoopSidebar.vue and
// toSidebarOptions in goop-props.ts.
import type { PropRow } from '~/components/docs/PropsTable.vue'

const rows: PropRow[] = [
  { prop: 'side', type: `'left' | 'right'`, def: `'left'`, note: 'The screen side the sidebar sits on.' },
  { prop: 'variant', type: `'sidebar' | 'floating' | 'inset'`, def: `'sidebar'`, note: 'shadcn\'s three looks: flush with a border, a floating card, or inset beside a rounded main area.' },
  { prop: 'collapsible', type: `'offcanvas' | 'icon' | 'none'`, def: `'offcanvas'`, note: 'How it collapses: slides off screen, shrinks to icons, or never collapses.' },
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Sidebar.' },
  { prop: 'highlight', type: 'boolean', def: 'true', note: 'The hover and focus highlight is a goo blob that glides between items, its soft swell under the cursor.' },
  { prop: 'followPointer', type: 'boolean', def: 'true', note: 'The highlight\'s swell follows the cursor along the item. false keeps it centred.' },
  { prop: 'pill', type: 'boolean', def: 'true', note: 'The active item is a soft filled pill with a faint rim.' },
  { prop: 'slosh', type: 'boolean | number', def: 'true', note: 'Collapsing and expanding slosh the inner edge in low, wide mounds, driven by how fast the edge moves. A number from 0 to 2 sets the strength.' },
  { prop: 'submenus', type: 'boolean', def: 'true', note: 'GoopCollapsible sub-menus inside flood their row and spring open.' },
  { prop: 'tooltips', type: 'boolean', def: 'true', note: 'Icon-mode tooltips (GoopSidebarMenuButton tooltip) bloom as goo.' },
  { prop: 'bloom', type: 'boolean', def: 'true', note: 'On mobile the sheet blooms from its screen edge like GoopSheet.' },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `app config, then 'svg'`, note: 'How the goo is drawn.' },
]
</script>

<template>
  <DocsPropsTable :rows="rows" caption="GoopSidebar props" />
</template>
