/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React previews for the menus (Dropdown Menu, Context Menu, Menubar, Navigation Menu) and the
// Menubar tile on /react/docs/components. Each set mirrors its Vue twin
// (components/content/DemoDropdownMenu.vue, DemoContextMenu.vue, DemoMenubar.vue,
// DemoNavigationMenu.vue, components/docs/ComponentTile.vue) so the two pages compare 1:1;
// keep them in sync.
import {
  GoopButton,
  GoopContextMenu,
  GoopContextMenuCheckboxItem,
  GoopContextMenuContent,
  GoopContextMenuItem,
  GoopContextMenuLabel,
  GoopContextMenuRadioGroup,
  GoopContextMenuRadioItem,
  GoopContextMenuSeparator,
  GoopContextMenuShortcut,
  GoopContextMenuSub,
  GoopContextMenuSubContent,
  GoopContextMenuSubTrigger,
  GoopContextMenuTrigger,
  GoopDropdownMenu,
  GoopDropdownMenuCheckboxItem,
  GoopDropdownMenuContent,
  GoopDropdownMenuGroup,
  GoopDropdownMenuItem,
  GoopDropdownMenuLabel,
  GoopDropdownMenuRadioGroup,
  GoopDropdownMenuRadioItem,
  GoopDropdownMenuSeparator,
  GoopDropdownMenuShortcut,
  GoopDropdownMenuSub,
  GoopDropdownMenuSubContent,
  GoopDropdownMenuSubTrigger,
  GoopDropdownMenuTrigger,
  GoopMenubar,
  GoopMenubarCheckboxItem,
  GoopMenubarContent,
  GoopMenubarItem,
  GoopMenubarMenu,
  GoopMenubarRadioGroup,
  GoopMenubarRadioItem,
  GoopMenubarSeparator,
  GoopMenubarShortcut,
  GoopMenubarSub,
  GoopMenubarSubContent,
  GoopMenubarSubTrigger,
  GoopMenubarTrigger,
  GoopNavigationMenu,
  GoopNavigationMenuContent,
  GoopNavigationMenuItem,
  GoopNavigationMenuLink,
  GoopNavigationMenuList,
  GoopNavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@goopui/react'
import { useState, type MouseEvent } from 'react'

type Pg = Record<string, Record<string, unknown>>

// ---- Dropdown Menu ------------------------------------------------------------------------------

export function DropdownMenuDemo({ set, pg }: { set: string; pg: Pg }) {
  const [statusBar, setStatusBar] = useState(true)
  const [panel, setPanel] = useState(false)
  const [position, setPosition] = useState('bottom')
  const body = (() => {
    switch (set) {
      case 'checks':
        return (
          <GoopDropdownMenu>
            <GoopDropdownMenuTrigger asChild>
              <GoopButton variant="outline">Appearance</GoopButton>
            </GoopDropdownMenuTrigger>
            <GoopDropdownMenuContent className="w-48">
              <GoopDropdownMenuLabel>View</GoopDropdownMenuLabel>
              <GoopDropdownMenuCheckboxItem checked={statusBar} onCheckedChange={setStatusBar}>
                Status bar
              </GoopDropdownMenuCheckboxItem>
              <GoopDropdownMenuCheckboxItem checked={panel} onCheckedChange={setPanel}>
                Panel
              </GoopDropdownMenuCheckboxItem>
              <GoopDropdownMenuSeparator />
              <GoopDropdownMenuLabel>Panel position</GoopDropdownMenuLabel>
              <GoopDropdownMenuRadioGroup value={position} onValueChange={setPosition}>
                <GoopDropdownMenuRadioItem value="top">Top</GoopDropdownMenuRadioItem>
                <GoopDropdownMenuRadioItem value="bottom">Bottom</GoopDropdownMenuRadioItem>
                <GoopDropdownMenuRadioItem value="right">Right</GoopDropdownMenuRadioItem>
              </GoopDropdownMenuRadioGroup>
            </GoopDropdownMenuContent>
          </GoopDropdownMenu>
        )
      case 'sub':
        return (
          <GoopDropdownMenu>
            <GoopDropdownMenuTrigger asChild>
              <GoopButton variant="outline">Share</GoopButton>
            </GoopDropdownMenuTrigger>
            <GoopDropdownMenuContent className="w-48">
              <GoopDropdownMenuItem>Copy link</GoopDropdownMenuItem>
              <GoopDropdownMenuSub>
                <GoopDropdownMenuSubTrigger>Send to</GoopDropdownMenuSubTrigger>
                <GoopDropdownMenuSubContent>
                  <GoopDropdownMenuItem>Email</GoopDropdownMenuItem>
                  <GoopDropdownMenuItem>Message</GoopDropdownMenuItem>
                  <GoopDropdownMenuItem>Slack</GoopDropdownMenuItem>
                </GoopDropdownMenuSubContent>
              </GoopDropdownMenuSub>
              <GoopDropdownMenuItem>Export</GoopDropdownMenuItem>
            </GoopDropdownMenuContent>
          </GoopDropdownMenu>
        )
      case 'plain': {
        const one = (label: string, variant: 'secondary' | 'outline', content: Record<string, unknown>) => (
          <GoopDropdownMenu key={label}>
            <GoopDropdownMenuTrigger asChild>
              <GoopButton variant={variant}>{label}</GoopButton>
            </GoopDropdownMenuTrigger>
            <GoopDropdownMenuContent className="w-48" {...content}>
              <GoopDropdownMenuItem>Profile</GoopDropdownMenuItem>
              <GoopDropdownMenuItem>Settings</GoopDropdownMenuItem>
              <GoopDropdownMenuItem>Log out</GoopDropdownMenuItem>
            </GoopDropdownMenuContent>
          </GoopDropdownMenu>
        )
        return (
          <>
            {one('No highlight blob', 'secondary', { highlight: false, openDrips: false })}
            {one('Popover tokens', 'secondary', { surface: 'popover' })}
            {one('Plain shadcn', 'outline', { goo: false })}
          </>
        )
      }
      default:
        return (
          <GoopDropdownMenu>
            <GoopDropdownMenuTrigger asChild>
              <GoopButton variant="outline">Open menu</GoopButton>
            </GoopDropdownMenuTrigger>
            <GoopDropdownMenuContent className="w-48" {...pg.content}>
              <GoopDropdownMenuLabel>My account</GoopDropdownMenuLabel>
              <GoopDropdownMenuGroup>
                <GoopDropdownMenuItem>
                  Profile <GoopDropdownMenuShortcut>⇧⌘P</GoopDropdownMenuShortcut>
                </GoopDropdownMenuItem>
                <GoopDropdownMenuItem>
                  Settings <GoopDropdownMenuShortcut>⌘,</GoopDropdownMenuShortcut>
                </GoopDropdownMenuItem>
                <GoopDropdownMenuItem disabled>Billing</GoopDropdownMenuItem>
              </GoopDropdownMenuGroup>
              <GoopDropdownMenuSeparator />
              <GoopDropdownMenuItem variant="destructive">Log out</GoopDropdownMenuItem>
            </GoopDropdownMenuContent>
          </GoopDropdownMenu>
        )
    }
  })()
  return <div className="flex flex-wrap items-start justify-center gap-4 pb-36">{body}</div>
}

// ---- Context Menu -------------------------------------------------------------------------------

export function ContextMenuDemo({ pg }: { pg: Pg }) {
  const [bookmarks, setBookmarks] = useState(true)
  const [urls, setUrls] = useState(false)
  const [person, setPerson] = useState('pedro')
  return (
    <GoopContextMenu>
      <GoopContextMenuTrigger className="flex h-44 w-full max-w-sm items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground select-none">
        Right-click here (or long-press)
      </GoopContextMenuTrigger>
      <GoopContextMenuContent className="w-52" {...pg.content}>
        <GoopContextMenuItem inset>
          Back <GoopContextMenuShortcut>⌘[</GoopContextMenuShortcut>
        </GoopContextMenuItem>
        <GoopContextMenuItem inset disabled>
          Forward <GoopContextMenuShortcut>⌘]</GoopContextMenuShortcut>
        </GoopContextMenuItem>
        <GoopContextMenuItem inset>
          Reload <GoopContextMenuShortcut>⌘R</GoopContextMenuShortcut>
        </GoopContextMenuItem>
        <GoopContextMenuSub>
          <GoopContextMenuSubTrigger inset>More tools</GoopContextMenuSubTrigger>
          <GoopContextMenuSubContent className="w-44">
            <GoopContextMenuItem>Save page…</GoopContextMenuItem>
            <GoopContextMenuItem>Create shortcut…</GoopContextMenuItem>
            <GoopContextMenuSeparator />
            <GoopContextMenuItem>Developer tools</GoopContextMenuItem>
          </GoopContextMenuSubContent>
        </GoopContextMenuSub>
        <GoopContextMenuSeparator />
        <GoopContextMenuCheckboxItem checked={bookmarks} onCheckedChange={setBookmarks}>
          Show bookmarks
        </GoopContextMenuCheckboxItem>
        <GoopContextMenuCheckboxItem checked={urls} onCheckedChange={setUrls}>
          Show full URLs
        </GoopContextMenuCheckboxItem>
        <GoopContextMenuSeparator />
        <GoopContextMenuRadioGroup value={person} onValueChange={setPerson}>
          <GoopContextMenuLabel inset>People</GoopContextMenuLabel>
          <GoopContextMenuRadioItem value="pedro">Pedro Duarte</GoopContextMenuRadioItem>
          <GoopContextMenuRadioItem value="colm">Colm Tuite</GoopContextMenuRadioItem>
        </GoopContextMenuRadioGroup>
      </GoopContextMenuContent>
    </GoopContextMenu>
  )
}

// ---- Menubar ------------------------------------------------------------------------------------

export function MenubarDemo({ pg }: { pg: Pg }) {
  const [bookmarks, setBookmarks] = useState(false)
  const [urls, setUrls] = useState(true)
  const [person, setPerson] = useState('benoit')
  const content = pg.content ?? {}
  return (
    <GoopMenubar {...pg.main}>
      <GoopMenubarMenu>
        <GoopMenubarTrigger>File</GoopMenubarTrigger>
        <GoopMenubarContent {...content}>
          <GoopMenubarItem>
            New Tab <GoopMenubarShortcut>⌘T</GoopMenubarShortcut>
          </GoopMenubarItem>
          <GoopMenubarItem>
            New Window <GoopMenubarShortcut>⌘N</GoopMenubarShortcut>
          </GoopMenubarItem>
          <GoopMenubarItem disabled>New Incognito Window</GoopMenubarItem>
          <GoopMenubarSeparator />
          <GoopMenubarSub>
            <GoopMenubarSubTrigger>Share</GoopMenubarSubTrigger>
            <GoopMenubarSubContent>
              <GoopMenubarItem>Email link</GoopMenubarItem>
              <GoopMenubarItem>Messages</GoopMenubarItem>
              <GoopMenubarItem>Notes</GoopMenubarItem>
            </GoopMenubarSubContent>
          </GoopMenubarSub>
          <GoopMenubarSeparator />
          <GoopMenubarItem>
            Print... <GoopMenubarShortcut>⌘P</GoopMenubarShortcut>
          </GoopMenubarItem>
        </GoopMenubarContent>
      </GoopMenubarMenu>
      <GoopMenubarMenu>
        <GoopMenubarTrigger>Edit</GoopMenubarTrigger>
        <GoopMenubarContent {...content}>
          <GoopMenubarItem>
            Undo <GoopMenubarShortcut>⌘Z</GoopMenubarShortcut>
          </GoopMenubarItem>
          <GoopMenubarItem>
            Redo <GoopMenubarShortcut>⇧⌘Z</GoopMenubarShortcut>
          </GoopMenubarItem>
          <GoopMenubarSeparator />
          <GoopMenubarItem>Cut</GoopMenubarItem>
          <GoopMenubarItem>Copy</GoopMenubarItem>
          <GoopMenubarItem>Paste</GoopMenubarItem>
        </GoopMenubarContent>
      </GoopMenubarMenu>
      <GoopMenubarMenu>
        <GoopMenubarTrigger>View</GoopMenubarTrigger>
        <GoopMenubarContent className="w-60" {...content}>
          <GoopMenubarCheckboxItem checked={bookmarks} onCheckedChange={setBookmarks}>
            Always Show Bookmarks Bar
          </GoopMenubarCheckboxItem>
          <GoopMenubarCheckboxItem checked={urls} onCheckedChange={setUrls}>
            Always Show Full URLs
          </GoopMenubarCheckboxItem>
          <GoopMenubarSeparator />
          <GoopMenubarItem inset>
            Reload <GoopMenubarShortcut>⌘R</GoopMenubarShortcut>
          </GoopMenubarItem>
          <GoopMenubarItem inset>Toggle Fullscreen</GoopMenubarItem>
        </GoopMenubarContent>
      </GoopMenubarMenu>
      <GoopMenubarMenu>
        <GoopMenubarTrigger>Profiles</GoopMenubarTrigger>
        <GoopMenubarContent {...content}>
          <GoopMenubarRadioGroup value={person} onValueChange={setPerson}>
            <GoopMenubarRadioItem value="andy">Andy</GoopMenubarRadioItem>
            <GoopMenubarRadioItem value="benoit">Benoit</GoopMenubarRadioItem>
            <GoopMenubarRadioItem value="luis">Luis</GoopMenubarRadioItem>
          </GoopMenubarRadioGroup>
          <GoopMenubarSeparator />
          <GoopMenubarItem inset>Add Profile...</GoopMenubarItem>
        </GoopMenubarContent>
      </GoopMenubarMenu>
    </GoopMenubar>
  )
}

/** The Menubar index tile: the real bar, "File" open so the goo body sits on it (no menu content). */
export function MenubarTile() {
  return (
    <GoopMenubar defaultValue="File" className="h-7 gap-0 [&_[data-slot=menubar-trigger]]:text-xs">
      {['File', 'Edit', 'View'].map((m) => (
        <GoopMenubarMenu key={m} value={m}>
          <GoopMenubarTrigger>{m}</GoopMenubarTrigger>
        </GoopMenubarMenu>
      ))}
    </GoopMenubar>
  )
}

// ---- Navigation Menu ----------------------------------------------------------------------------

const STARTED = [
  { title: 'Introduction', body: 'Components that drip, built on Radix and Tailwind.' },
  { title: 'Installation', body: 'Add the React package and its stylesheet.' },
  { title: 'Sound', body: 'Optional interaction cues.' },
]
const COMPONENTS = [
  { title: 'Button', body: 'Drips, splats and a shockwave.' },
  { title: 'Hover Card', body: 'Blooms out of the edge facing its link.' },
  { title: 'Tabs', body: 'A goo blob slides between triggers.' },
  { title: 'Sidebar', body: 'The edge sloshes as it collapses.' },
]
const PANEL = 'grid gap-1 p-1 w-[min(17rem,calc(100vw-5rem))] sm:w-80'
const stop = (e: MouseEvent) => e.preventDefault()

// Divs and spans, not ul/p: the docs prose styles lists, paragraphs and links.
export function NavigationMenuDemo({ set, pg }: { set: string; pg: Pg }) {
  const links = (items: typeof STARTED) =>
    items.map((s) => (
      <GoopNavigationMenuLink key={s.title} href="#" className="flex-col items-start gap-1 no-underline" onClick={stop}>
        <span className="text-sm leading-none font-medium">{s.title}</span>
        <span className="line-clamp-2 text-sm leading-snug font-normal text-muted-foreground">{s.body}</span>
      </GoopNavigationMenuLink>
    ))
  return (
    <div className="flex w-full justify-start pb-72 sm:justify-center">
      <GoopNavigationMenu {...pg.main} viewport={set !== 'inline'}>
        <GoopNavigationMenuList className="m-0 p-0">
          <GoopNavigationMenuItem className="m-0 p-0">
            <GoopNavigationMenuTrigger>Getting started</GoopNavigationMenuTrigger>
            <GoopNavigationMenuContent>
              <div className={PANEL}>{links(STARTED)}</div>
            </GoopNavigationMenuContent>
          </GoopNavigationMenuItem>
          <GoopNavigationMenuItem className="m-0 p-0">
            <GoopNavigationMenuTrigger>Components</GoopNavigationMenuTrigger>
            <GoopNavigationMenuContent>
              <div className={`${PANEL} sm:w-[28rem] sm:grid-cols-2`}>{links(COMPONENTS)}</div>
            </GoopNavigationMenuContent>
          </GoopNavigationMenuItem>
          <GoopNavigationMenuItem className="m-0 p-0 max-sm:hidden">
            <GoopNavigationMenuLink href="#" className={`${navigationMenuTriggerStyle()} no-underline`} onClick={stop}>
              Docs
            </GoopNavigationMenuLink>
          </GoopNavigationMenuItem>
        </GoopNavigationMenuList>
      </GoopNavigationMenu>
    </div>
  )
}
