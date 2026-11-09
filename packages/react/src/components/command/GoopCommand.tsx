'use client'
// GoopCommand: shadcn/ui's Command on cmdk (the same parts, props and classes:
// GoopCommandInput / List / Empty / Group / Item / Separator / Shortcut, and
// GoopCommandDialog). Its parts read the goo settings from the root: the active item is a goo
// blob that glides between items with the arrow keys and the pointer (GoopCommandList, core
// `attachMenuHighlight` on cmdk's list), choosing an item squishes it, and the search input
// gets the Input's goo focus ring (core `attachInput`). With `goo={false}` it is exactly
// shadcn's Command. Same goo, props and toggles as @goopui/vue's GoopCommand.
// `ignoreFilter` (@goopui/vue's name; cmdk's `shouldFilter={false}`) turns the built-in filter
// off: every item and group renders as given, GoopCommandEmpty shows when there are no items,
// and the parent filters and orders the results itself (async search, fuzzy ranking).
// Reduced motion: the blob snaps, a static ring.
import { attachInput, type InputHandle, type InputOptions, type MenuHighlightHandle, type MenuHighlightOptions } from '@goopui/core'
import { cn } from 'cn'
import { Command as CommandPrimitive, useCommandState } from 'cmdk'
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react'
import { useGoopConfig } from '../../config'
import {
  COMMAND_DIALOG_PROP_KEYS,
  COMMAND_INPUT_PROP_KEYS,
  COMMAND_PROP_KEYS,
  DIALOG_PROP_KEYS,
  resolveCommandProps,
  splitProps,
  toCommandInputOptions,
  toCommandOptions,
  type GoopCommandDialogProps,
  type GoopCommandInputEngineProps,
  type GoopCommandProps,
  type GoopSoundProps,
  type ResolvedCommandProps,
} from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { GoopDialog, GoopDialogContent, GoopDialogDescription, GoopDialogHeader, GoopDialogTitle, type GoopDialogRootProps } from '../dialog/GoopDialog'
import {
  COMMAND,
  COMMAND_DIALOG_CONTENT,
  COMMAND_EMPTY,
  COMMAND_FIELD_ACTIVE,
  COMMAND_GROUP,
  COMMAND_INPUT,
  COMMAND_INPUT_HOST,
  COMMAND_INPUT_ICON,
  COMMAND_INPUT_WRAPPER,
  COMMAND_INPUT_WRAPPER_GOO,
  COMMAND_ITEM,
  COMMAND_ITEM_FLAT,
  COMMAND_LIST,
  COMMAND_LIST_GOO,
  COMMAND_SEPARATOR,
  COMMAND_SHORTCUT,
} from './styles'
import { useCmdkHighlight } from './use-cmdk-highlight'

// ---- context --------------------------------------------------------------------------------

/** What GoopCommand tells its parts. */
export interface GoopCommandContextValue {
  /** Resolved goo settings. */
  cmd: ResolvedCommandProps
  /** Core options: the highlight blob and the input ring (null when off). */
  options: { highlight: MenuHighlightOptions | null; ring: InputOptions | null }
  /** True when the built-in filter is off (`ignoreFilter`). */
  ignoreFilter: boolean
  /** The live highlight blob (set by GoopCommandList). */
  highlight: { current: MenuHighlightHandle | null }
}

const CommandContext = createContext<GoopCommandContextValue | null>(null)
CommandContext.displayName = 'GoopCommandContext'

/** The enclosing GoopCommand's settings (throws outside one). */
export function useGoopCommand(): GoopCommandContextValue {
  const ctx = useContext(CommandContext)
  if (!ctx) throw new Error('GoopCommand parts must be used inside <GoopCommand>.')
  return ctx
}

// ---- root -----------------------------------------------------------------------------------

export type GoopCommandRootProps = Omit<ComponentPropsWithoutRef<typeof CommandPrimitive>, 'shouldFilter' | keyof GoopCommandProps> &
  GoopCommandProps &
  GoopSoundProps & {
    /** Turn off the built-in filter: render every item and group as given (filter and order
     *  them yourself). cmdk's `shouldFilter={false}`. Default false. */
    ignoreFilter?: boolean
  }

export const GoopCommand = forwardRef<HTMLDivElement, GoopCommandRootProps>(function GoopCommand(allProps, ref) {
  const [engine, props] = splitProps(allProps, COMMAND_PROP_KEYS)
  const { className, ignoreFilter = false, sound, ...rest } = props
  const config = useGoopConfig()
  const cmd = useStableValue(resolveCommandProps(engine))
  const options = useStableValue(toCommandOptions(cmd, config))
  const highlight = useRef<MenuHighlightHandle | null>(null)
  useGoopSound(sound)
  return (
    <CommandContext.Provider value={{ cmd, options, ignoreFilter, highlight }}>
      <GoopSoundScope sound={sound}>
        <CommandPrimitive ref={ref} data-slot="command" shouldFilter={!ignoreFilter} className={cn(COMMAND, className)} {...rest} />
      </GoopSoundScope>
    </CommandContext.Provider>
  )
})
GoopCommand.displayName = 'GoopCommand'

// ---- input ----------------------------------------------------------------------------------

/** The Input's goo ring on a field inside `host` (shared with GoopComboboxInput). */
export function useCommandRing(
  host: { current: HTMLElement | null },
  field: { current: HTMLInputElement | null },
  options: InputOptions,
  enabled: boolean,
): InputHandle | null {
  const attach = (el: HTMLElement, o: InputOptions): InputHandle => attachInput(el, field.current!, o)
  return useAttached(host, attach, options, enabled)
}

export type GoopCommandInputProps = Omit<ComponentPropsWithoutRef<typeof CommandPrimitive.Input>, keyof GoopCommandInputEngineProps> &
  GoopCommandInputEngineProps & {
    /** Goo focus ring. Default: the command's `ring` (and `goo`) setting. */
    goo?: boolean
    /** Receives the live ring handle (null before mount / when the ring is off). */
    goopRef?: Ref<InputHandle>
  }

/** shadcn's CommandInput (search icon, rounded input box) with the Input's goo focus ring:
 *  focus flows goo around the box from the click point, typing ripples it near the caret,
 *  blur drains it. Its ring effects (`flow`, `ripple`, `drain`...) are GoopInput's. */
export const GoopCommandInput = forwardRef<HTMLInputElement, GoopCommandInputProps>(function GoopCommandInput(allProps, ref) {
  const [engine, props] = splitProps(allProps, COMMAND_INPUT_PROP_KEYS)
  const { className, goo, goopRef, ...rest } = props
  const command = useGoopCommand()
  const config = useGoopConfig()
  const enabled = command.cmd.goo && (goo ?? command.cmd.ring)
  const own = toCommandInputOptions(engine, config)
  const options: InputOptions = { ...(command.options.ring ?? {}) }
  for (const [k, v] of Object.entries(own)) if (v !== undefined) (options as Record<string, unknown>)[k] = v

  const host = useRef<HTMLDivElement | null>(null)
  const field = useRef<HTMLInputElement | null>(null)
  const composed = useComposedRefs(ref, field)
  const handle = useCommandRing(host, field, options, enabled)
  useImperativeHandle(goopRef, () => handle as InputHandle, [handle])
  const active = handle !== null

  return (
    <div data-slot="command-input-wrapper" className={active ? COMMAND_INPUT_WRAPPER_GOO : COMMAND_INPUT_WRAPPER}>
      <div ref={host} data-slot="command-input-goo" data-goop-host="input" data-goop-active={active ? '' : undefined} className={COMMAND_INPUT_HOST}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={COMMAND_INPUT_ICON}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <CommandPrimitive.Input ref={composed} data-slot="command-input" className={cn(COMMAND_INPUT, active && COMMAND_FIELD_ACTIVE, className)} {...rest} />
      </div>
    </div>
  )
})
GoopCommandInput.displayName = 'GoopCommandInput'

// ---- list -----------------------------------------------------------------------------------

export type GoopCommandListProps = ComponentPropsWithoutRef<typeof CommandPrimitive.List> & {
  /** Receives the live highlight handle (null when goo or highlight is off). */
  goopRef?: Ref<MenuHighlightHandle>
}

/** shadcn's CommandList (the scroller). Its items hold the command's goo highlight: it glides
 *  between items as the arrow keys or the pointer move cmdk's selection, stretches with
 *  momentum, and shrinks out when the search hides the highlighted item. */
export const GoopCommandList = forwardRef<HTMLDivElement, GoopCommandListProps>(function GoopCommandList({ className, goopRef, ...props }, ref) {
  const command = useGoopCommand()
  const { setList, handle } = useCmdkHighlight(command.options.highlight, command.ignoreFilter)
  const shared = command.highlight
  useIsomorphicLayoutEffect(() => {
    shared.current = handle
    return () => {
      shared.current = null
    }
  }, [shared, handle])
  useImperativeHandle(goopRef, () => handle as MenuHighlightHandle, [handle])
  const composed = useComposedRefs<HTMLDivElement>(ref, setList)
  return (
    <CommandPrimitive.List
      ref={composed}
      data-slot="command-list"
      className={cn(COMMAND_LIST, command.options.highlight && COMMAND_LIST_GOO, className)}
      {...props}
    />
  )
})
GoopCommandList.displayName = 'GoopCommandList'

// ---- empty / group / separator / shortcut ----------------------------------------------------

/** shadcn's CommandEmpty: shown when the search matches nothing. With the command's
 *  `ignoreFilter` it shows when the command has no items at all, after mount (items register
 *  on mount, so the server can't count them). Same as @goopui/vue's: never in server markup
 *  while there is no search. */
export const GoopCommandEmpty = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>>(function GoopCommandEmpty(
  { className, ...props },
  ref,
) {
  const ctx = useContext(CommandContext)
  const search = useCommandState((s) => s.search)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const show = ctx?.ignoreFilter ? mounted : !!search
  if (!show) return null
  return <CommandPrimitive.Empty ref={ref} data-slot="command-empty" className={cn(COMMAND_EMPTY, className)} {...props} />
})
GoopCommandEmpty.displayName = 'GoopCommandEmpty'

/** shadcn's CommandGroup (an optional `heading`; hidden when none of its items match). */
export const GoopCommandGroup = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive.Group>>(function GoopCommandGroup(
  { className, ...props },
  ref,
) {
  return <CommandPrimitive.Group ref={ref} data-slot="command-group" className={cn(COMMAND_GROUP, className)} {...props} />
})
GoopCommandGroup.displayName = 'GoopCommandGroup'

/** shadcn's CommandSeparator (cmdk hides it while searching unless `alwaysRender`). */
export const GoopCommandSeparator = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>>(function GoopCommandSeparator(
  { className, ...props },
  ref,
) {
  return <CommandPrimitive.Separator ref={ref} data-slot="command-separator" className={cn(COMMAND_SEPARATOR, className)} {...props} />
})
GoopCommandSeparator.displayName = 'GoopCommandSeparator'

export function GoopCommandShortcut({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span data-slot="command-shortcut" className={cn(COMMAND_SHORTCUT, className)} {...props} />
}

// ---- item -----------------------------------------------------------------------------------

/** shadcn's CommandItem. With the goo highlight on, the flat selected bg is dropped (the blob
 *  draws it) and choosing the item squishes the blob. */
export const GoopCommandItem = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive.Item>>(function GoopCommandItem(
  { className, onSelect, ...props },
  ref,
) {
  const command = useGoopCommand()
  const cue = useGoopCue('commandItem')
  return (
    <CommandPrimitive.Item
      ref={ref}
      data-slot="command-item"
      {...cue}
      className={cn(command.options.highlight ? '' : COMMAND_ITEM_FLAT, COMMAND_ITEM, className)}
      onSelect={(value) => {
        onSelect?.(value)
        command.highlight.current?.pop()
      }}
      {...props}
    />
  )
})
GoopCommandItem.displayName = 'GoopCommandItem'

// ---- dialog ---------------------------------------------------------------------------------

export type GoopCommandDialogRootProps = Omit<GoopDialogRootProps, 'children'> &
  GoopCommandDialogProps &
  GoopSoundProps & {
    title?: string
    description?: string
    /** Classes for the command inside the dialog. */
    className?: string
    showCloseButton?: boolean
    /** Turn off the command's built-in filter (GoopCommand's `ignoreFilter`). */
    ignoreFilter?: boolean
    children?: ReactNode
  }

const COMMAND_GOO_KEYS = ['goo', 'highlight', 'pop', 'ring', 'wobble', 'momentum', 'followPointer', 'speed', 'preset', 'renderer'] as const

/**
 * shadcn's CommandDialog: a Dialog with a screen-reader title and description around a
 * Command. The panel blooms open like GoopDialogContent (pools from its center, overshoots and
 * splashes all around; close pulls in and shrinks back), and the command inside gets the goo
 * highlight and input ring. The dialog's bloom props and the command's toggles (and
 * `ignoreFilter`) are both props here; `goo`, `wobble`, `speed`, `preset` and `renderer` drive
 * both. With `goo={false}` it is shadcn's CommandDialog.
 */
export function GoopCommandDialog(allProps: GoopCommandDialogRootProps) {
  const [engine, props] = splitProps(allProps, COMMAND_DIALOG_PROP_KEYS)
  const {
    title = 'Command Palette',
    description = 'Search for a command to run...',
    className,
    showCloseButton = false,
    ignoreFilter,
    sound,
    children,
    ...root
  } = props
  const [dialogGoo] = splitProps(engine, DIALOG_PROP_KEYS)
  const [commandGoo] = splitProps(engine, COMMAND_GOO_KEYS)
  return (
    <GoopDialog sound={sound} {...root}>
      <GoopDialogContent {...dialogGoo} goo={engine.goo !== false} showCloseButton={showCloseButton} className={COMMAND_DIALOG_CONTENT}>
        <GoopDialogHeader className="sr-only">
          <GoopDialogTitle>{title}</GoopDialogTitle>
          <GoopDialogDescription>{description}</GoopDialogDescription>
        </GoopDialogHeader>
        <GoopCommand {...commandGoo} ignoreFilter={ignoreFilter} className={cn('rounded-[inherit] bg-transparent', className)}>
          {children}
        </GoopCommand>
      </GoopDialogContent>
    </GoopDialog>
  )
}
GoopCommandDialog.displayName = 'GoopCommandDialog'
