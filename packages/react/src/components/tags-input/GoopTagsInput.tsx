'use client'
// GoopTagsInput: goopUI's own TagsInput for React. shadcn/ui has none, so this mirrors
// shadcn-vue's (reka-ui TagsInput) part for part, with the same classes and keyboard: the
// root box (GoopTagsInput), the tags (GoopTagsInputItem with GoopTagsInputItemText and
// GoopTagsInputItemDelete) and the text field (GoopTagsInputInput). Props follow reka's root in
// React shape: `value` / `defaultValue` / `onValueChange` (string tags), `addOnPaste`,
// `addOnTab`, `addOnBlur`, `duplicate`, `delimiter`, `max`, `disabled`, `dir`, `name`,
// `required`, `displayValue`, `convertValue`, `onAddTag`, `onRemoveTag`, `onInvalid`.
//
// After hydration core's `attachTagsInput` adds the goo:
//   - the Input's goo focus ring around the whole box, on an aria-hidden layer in a wrapper
//     (`data-slot="tags-input-goo"`);
//   - merge: a new tag plops in like a droplet joining the others;
//   - melt: a removed tag drains away where it was.
// `ref` is the bordered box, `goopRef` the engine. With `goo={false}` it is the plain box (no
// wrapper).
import { attachTagsInput, type TagsInputHandle } from '@goopui/core'
import { cn } from 'cn'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import { useGoopConfig } from '../../config'
import { TAGS_INPUT_PROP_KEYS, splitProps, toTagsInputOptions, type GoopSoundProps, type GoopTagsInputEngineProps } from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'
import {
  TAGS_INPUT,
  TAGS_INPUT_INPUT,
  TAGS_INPUT_ITEM,
  TAGS_INPUT_ITEM_DELETE,
  TAGS_INPUT_ITEM_TEXT,
  goopTagsInputActive,
  goopTagsInputContainer,
} from './variants'

interface TagsInputContext {
  values: string[]
  /** Add a tag from typed text. True when it was added. */
  add(raw: string): boolean
  remove(index: number): void
  /** The selected (active) tag's index, -1 for none. */
  selected: number
  select(index: number): void
  disabled: boolean
  delimiter: string | RegExp
  addOnPaste: boolean
  addOnTab: boolean
  addOnBlur: boolean
  dir: 'ltr' | 'rtl'
  displayValue: (value: string) => string
  input: RefObject<HTMLInputElement | null>
}

const Ctx = createContext<TagsInputContext | null>(null)
const useTagsInput = (part: string): TagsInputContext => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error(`${part} must be used inside <GoopTagsInput>`)
  return ctx
}

export type GoopTagsInputProps = Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'onChange' | 'onInvalid' | 'dir' | keyof GoopTagsInputEngineProps> &
  GoopTagsInputEngineProps &
  GoopSoundProps & {
    /** The tags (controlled). */
    value?: string[]
    /** The initial tags when uncontrolled. */
    defaultValue?: string[]
    onValueChange?: (value: string[]) => void
    /** Pasted text becomes tags (split on the delimiter). */
    addOnPaste?: boolean
    /** Tab adds the typed text as a tag. */
    addOnTab?: boolean
    /** Leaving the field adds the typed text as a tag. */
    addOnBlur?: boolean
    /** Allow the same tag twice. */
    duplicate?: boolean
    /** Typing this character adds a tag (a RegExp splits pasted text only). Default ','. */
    delimiter?: string | RegExp
    /** Most tags allowed (0 = no limit). */
    max?: number
    disabled?: boolean
    dir?: 'ltr' | 'rtl'
    /** Submitted with a form: one hidden input per tag. */
    name?: string
    required?: boolean
    /** How a tag reads (default: the tag itself). */
    displayValue?: (value: string) => string
    /** Typed text -> tag (default: trimmed). */
    convertValue?: (text: string) => string
    onAddTag?: (value: string) => void
    onRemoveTag?: (value: string) => void
    /** A tag was refused (a duplicate, or `max` reached). */
    onInvalid?: (value: string) => void
    /** Classes for the wrapper that holds the ring layer (default `relative w-full min-w-0`). */
    containerClassName?: string
    /** Master switch. `false` renders the plain box (no wrapper). */
    goo?: boolean
    /** Receives the live goo handle (null before mount / when goo is off). */
    goopRef?: Ref<TagsInputHandle>
  }

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i])

export const GoopTagsInput = forwardRef<HTMLDivElement, GoopTagsInputProps>(function GoopTagsInput(allProps, ref) {
  const [engine, props] = splitProps(allProps, TAGS_INPUT_PROP_KEYS)
  const {
    className,
    containerClassName,
    goo = true,
    sound,
    goopRef,
    value: valueProp,
    defaultValue,
    onValueChange,
    addOnPaste = false,
    addOnTab = false,
    addOnBlur = false,
    duplicate = false,
    delimiter = ',',
    max = 0,
    disabled = false,
    dir = 'ltr',
    name,
    required,
    displayValue,
    convertValue,
    onAddTag,
    onRemoveTag,
    onInvalid,
    onMouseDown,
    children,
    ...rest
  } = props

  const [inner, setInner] = useState<string[]>(() => [...(defaultValue ?? [])])
  const values = valueProp ?? inner
  const latest = useRef(values)
  latest.current = values
  const [selected, setSelected] = useState(-1)
  const input = useRef<HTMLInputElement | null>(null)

  const commit = useCallback(
    (next: string[]) => {
      if (same(next, latest.current)) return
      latest.current = next
      if (valueProp === undefined) setInner(next)
      onValueChange?.(next)
    },
    [valueProp, onValueChange],
  )

  const add = useCallback(
    (raw: string): boolean => {
      const tag = convertValue ? convertValue(raw) : raw.trim()
      if (!tag) return false
      const cur = latest.current
      if ((max > 0 && cur.length >= max) || (!duplicate && cur.includes(tag))) {
        onInvalid?.(tag)
        return false
      }
      commit([...cur, tag])
      onAddTag?.(tag)
      return true
    },
    [convertValue, max, duplicate, commit, onAddTag, onInvalid],
  )
  const remove = useCallback(
    (index: number) => {
      const cur = latest.current
      const tag = cur[index]
      if (tag === undefined) return
      commit(cur.filter((_, i) => i !== index))
      onRemoveTag?.(tag)
      setSelected(-1)
    },
    [commit, onRemoveTag],
  )

  const ctx = useMemo<TagsInputContext>(
    () => ({
      values,
      add,
      remove,
      selected: selected < values.length ? selected : -1,
      select: setSelected,
      disabled,
      delimiter,
      addOnPaste,
      addOnTab,
      addOnBlur,
      dir,
      displayValue: displayValue ?? ((v: string) => v),
      input,
    }),
    [values, add, remove, selected, disabled, delimiter, addOnPaste, addOnTab, addOnBlur, dir, displayValue],
  )

  const host = useRef<HTMLDivElement | null>(null)
  const box = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, box)
  const config = useGoopConfig()
  const on = useGoopSound(sound)
  const attach = useCallback((el: HTMLElement, o: Parameters<typeof attachTagsInput>[2]) => attachTagsInput(el, box.current!, o), [])
  const handle = useAttached(host, attach, toTagsInputOptions(engine, config), goo)
  useImperativeHandle(goopRef, () => handle as TagsInputHandle, [handle])
  const active = handle !== null

  // A press on the box itself (not a tag or the field) focuses the field.
  const onBoxMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    onMouseDown?.(e)
    if (e.defaultPrevented || disabled || e.target !== e.currentTarget) return
    e.preventDefault()
    input.current?.focus()
  }

  const root = (
    <div
      ref={composed}
      data-slot="tags-input"
      dir={dir}
      data-disabled={disabled ? '' : undefined}
      className={cn(TAGS_INPUT, active && goopTagsInputActive, className)}
      onMouseDown={onBoxMouseDown}
      {...rest}
    >
      {children}
      {name ? values.map((v, i) => <input key={`${i}-${v}`} type="hidden" name={name} value={v} />) : null}
      {name && required && values.length === 0 ? <input type="text" required name={name} tabIndex={-1} aria-hidden="true" value="" onChange={() => {}} className="sr-only" /> : null}
    </div>
  )

  return (
    <GoopSoundScope sound={sound === undefined ? undefined : on}>
      <Ctx.Provider value={ctx}>
        {goo ? (
          <div ref={host} data-slot="tags-input-goo" data-goop-host="tags-input" data-goop-active={active ? '' : undefined} className={cn(goopTagsInputContainer, containerClassName)}>
            {root}
          </div>
        ) : (
          root
        )}
      </Ctx.Provider>
    </GoopSoundScope>
  )
})
GoopTagsInput.displayName = 'GoopTagsInput'

// ---- items ----------------------------------------------------------------------------------

interface ItemContext {
  value: string
  index: number
  textId: string
  disabled: boolean
  active: boolean
}
const ItemCtx = createContext<ItemContext | null>(null)
const useItem = (part: string): ItemContext => {
  const ctx = useContext(ItemCtx)
  if (!ctx) throw new Error(`${part} must be used inside <GoopTagsInputItem>`)
  return ctx
}

export type GoopTagsInputItemProps = ComponentPropsWithoutRef<'div'> & {
  /** The tag this item shows. */
  value: string
  disabled?: boolean
}

export const GoopTagsInputItem = forwardRef<HTMLDivElement, GoopTagsInputItemProps>(function GoopTagsInputItem(
  { value, disabled: own = false, className, onClick, ...props },
  ref,
) {
  const ctx = useTagsInput('GoopTagsInputItem')
  const textId = useId()
  const index = ctx.values.indexOf(value)
  const active = index >= 0 && ctx.selected === index
  const disabled = own || ctx.disabled
  const item = useMemo(() => ({ value, index, textId, disabled, active }), [value, index, textId, disabled, active])
  return (
    <ItemCtx.Provider value={item}>
      <div
        ref={ref}
        data-slot="tags-input-item"
        aria-labelledby={textId}
        aria-current={active}
        data-disabled={disabled ? '' : undefined}
        data-state={active ? 'active' : 'inactive'}
        className={cn(TAGS_INPUT_ITEM, className)}
        onClick={(e) => {
          onClick?.(e)
          if (e.defaultPrevented || disabled) return
          ctx.select(index)
          ctx.input.current?.focus()
        }}
        {...props}
      />
    </ItemCtx.Provider>
  )
})
GoopTagsInputItem.displayName = 'GoopTagsInputItem'

export type GoopTagsInputItemTextProps = ComponentPropsWithoutRef<'span'>

export const GoopTagsInputItemText = forwardRef<HTMLSpanElement, GoopTagsInputItemTextProps>(function GoopTagsInputItemText({ className, children, ...props }, ref) {
  const ctx = useTagsInput('GoopTagsInputItemText')
  const item = useItem('GoopTagsInputItemText')
  return (
    <span ref={ref} id={item.textId} data-slot="tags-input-item-text" className={cn(TAGS_INPUT_ITEM_TEXT, className)} {...props}>
      {children ?? ctx.displayValue(item.value)}
    </span>
  )
})
GoopTagsInputItemText.displayName = 'GoopTagsInputItemText'

export type GoopTagsInputItemDeleteProps = ComponentPropsWithoutRef<'button'>

const XIcon = (): ReactNode => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)

export const GoopTagsInputItemDelete = forwardRef<HTMLButtonElement, GoopTagsInputItemDeleteProps>(function GoopTagsInputItemDelete(
  { className, children, onClick, onMouseDown, ...props },
  ref,
) {
  const ctx = useTagsInput('GoopTagsInputItemDelete')
  const item = useItem('GoopTagsInputItemDelete')
  return (
    <button
      ref={ref}
      type="button"
      tabIndex={-1}
      data-slot="tags-input-item-delete"
      aria-labelledby={item.textId}
      aria-current={item.active}
      data-state={item.active ? 'active' : 'inactive'}
      disabled={item.disabled}
      className={cn(TAGS_INPUT_ITEM_DELETE, className)}
      // Keep the focus (and the goo ring) in the field.
      onMouseDown={(e) => {
        onMouseDown?.(e)
        if (!e.defaultPrevented) e.preventDefault()
      }}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || item.disabled) return
        e.stopPropagation()
        ctx.remove(item.index)
        ctx.input.current?.focus()
      }}
      {...props}
    >
      {children ?? <XIcon />}
    </button>
  )
})
GoopTagsInputItemDelete.displayName = 'GoopTagsInputItemDelete'

// ---- input ----------------------------------------------------------------------------------

export type GoopTagsInputInputProps = ComponentPropsWithoutRef<'input'>

export const GoopTagsInputInput = forwardRef<HTMLInputElement, GoopTagsInputInputProps>(function GoopTagsInputInput(
  { className, onKeyDown, onPaste, onBlur, onInput, disabled: own, ...props },
  ref,
) {
  const ctx = useTagsInput('GoopTagsInputInput')
  const composed = useComposedRefs(ref, ctx.input)
  const cue = useGoopCue('input')
  const disabled = own || ctx.disabled

  const addTyped = (el: HTMLInputElement): boolean => {
    if (!el.value) return false
    const ok = ctx.add(el.value)
    if (ok) el.value = ''
    return ok
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    const el = e.currentTarget
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0
    const n = ctx.values.length
    const back = ctx.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    const forward = ctx.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const isDelimiter = typeof ctx.delimiter === 'string' && ctx.delimiter.length === 1 && e.key === ctx.delimiter
    if (e.key === 'Enter' || isDelimiter || (e.key === 'Tab' && ctx.addOnTab && el.value)) {
      if (e.nativeEvent.isComposing) return
      if (el.value || isDelimiter) e.preventDefault()
      addTyped(el)
      return
    }
    if ((e.key === 'Backspace' || e.key === 'Delete') && atStart) {
      if (ctx.selected >= 0) {
        e.preventDefault()
        const i = ctx.selected
        ctx.remove(i)
        if (e.key === 'Backspace' && i > 0) ctx.select(i - 1)
      } else if (e.key === 'Backspace' && n > 0) {
        e.preventDefault()
        ctx.select(n - 1)
      }
      return
    }
    if (e.key === back && atStart && n > 0) {
      e.preventDefault()
      ctx.select(ctx.selected < 0 ? n - 1 : Math.max(0, ctx.selected - 1))
      return
    }
    if (e.key === forward && ctx.selected >= 0) {
      e.preventDefault()
      ctx.select(ctx.selected + 1 < n ? ctx.selected + 1 : -1)
      return
    }
    if (e.key === 'Home' && ctx.selected >= 0) {
      e.preventDefault()
      ctx.select(0)
      return
    }
    if (e.key === 'End' && ctx.selected >= 0) {
      e.preventDefault()
      ctx.select(n - 1)
      return
    }
    if (e.key === 'Escape') {
      ctx.select(-1)
      return
    }
    if (ctx.selected >= 0 && e.key.length === 1) ctx.select(-1)
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    onPaste?.(e)
    if (e.defaultPrevented || !ctx.addOnPaste) return
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    for (const part of text.split(ctx.delimiter)) ctx.add(part)
  }

  return (
    <input
      ref={composed}
      type="text"
      autoComplete="off"
      data-slot="tags-input-input"
      disabled={disabled}
      className={cn(TAGS_INPUT_INPUT, className)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onInput={(e) => {
        onInput?.(e)
        if (ctx.selected >= 0) ctx.select(-1)
      }}
      onBlur={(e) => {
        onBlur?.(e)
        if (ctx.addOnBlur) addTyped(e.currentTarget)
        ctx.select(-1)
      }}
      {...cue}
      {...props}
    />
  )
})
GoopTagsInputInput.displayName = 'GoopTagsInputInput'
