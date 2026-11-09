/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React previews for Tags Input and Field, and their tiles on /react/docs/components. Each set
// mirrors its Vue twin (components/content/DemoTagsInput.vue, DemoField.vue,
// components/docs/ComponentTile.vue) so the two pages compare 1:1; keep them in sync.
import {
  GoopButton,
  GoopCheckbox,
  GoopField,
  GoopFieldContent,
  GoopFieldDescription,
  GoopFieldError,
  GoopFieldGroup,
  GoopFieldLabel,
  GoopFieldLegend,
  GoopFieldSeparator,
  GoopFieldSet,
  GoopInput,
  GoopSwitch,
  GoopTagsInput,
  GoopTagsInputInput,
  GoopTagsInputItem,
  GoopTagsInputItemDelete,
  GoopTagsInputItemText,
} from '@goopui/react'
import { useState, type FormEvent } from 'react'

type Pg = Record<string, Record<string, unknown>>

function Tags({ tags, onChange, ...rest }: { tags: string[]; onChange: (v: string[]) => void } & Record<string, unknown>) {
  const { inputId, placeholder, inputLabel, ...root } = rest as { inputId?: string; placeholder?: string; inputLabel?: string }
  return (
    <GoopTagsInput value={tags} onValueChange={onChange} {...root}>
      {tags.map((tag) => (
        <GoopTagsInputItem key={tag} value={tag}>
          <GoopTagsInputItemText />
          <GoopTagsInputItemDelete />
        </GoopTagsInputItem>
      ))}
      <GoopTagsInputInput id={inputId} placeholder={placeholder} aria-label={inputLabel} />
    </GoopTagsInput>
  )
}

// ---- Tags Input (DemoTagsInput.vue) -----------------------------------------------------------

export function TagsInputDemo({ set, pg }: { set: string; pg: Pg }) {
  const [tags, setTags] = useState(['Vue', 'React', 'Svelte'])
  const [emails, setEmails] = useState(['ada@example.com'])
  const [invalid, setInvalid] = useState(['nope'])
  const [plain, setPlain] = useState(['Plain'])
  switch (set) {
    case 'basic':
      return (
        <div className="grid w-full max-w-sm gap-2">
          <label htmlFor="demo-tags" className="text-sm font-medium">Frameworks</label>
          <Tags tags={tags} onChange={setTags} inputId="demo-tags" placeholder="Add a framework…" {...pg.main} />
        </div>
      )
    case 'paste':
      return (
        <div className="grid w-full max-w-sm gap-2">
          <label htmlFor="demo-tags-paste" className="text-sm font-medium">Invite (up to 5)</label>
          <Tags tags={emails} onChange={setEmails} addOnPaste addOnBlur max={5} delimiter={/[,;\s]+/} inputId="demo-tags-paste" placeholder="Paste a list of emails…" />
        </div>
      )
    default:
      return (
        <div className="grid w-full max-w-sm gap-4">
          <Tags tags={invalid} onChange={setInvalid} aria-invalid="true" placeholder="Invalid" inputLabel="Invalid tags" />
          <Tags tags={plain} onChange={setPlain} goo={false} placeholder="Plain shadcn" inputLabel="Plain shadcn tags" />
        </div>
      )
  }
}

// ---- Field (DemoField.vue) --------------------------------------------------------------------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function FieldDemo({ set, pg }: { set: string; pg: Pg }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [touched, setTouched] = useState(false)
  const tagsError = tags.length ? '' : 'Pick at least one topic.'
  switch (set) {
    case 'basic': {
      const check = (e: FormEvent) => {
        e.preventDefault()
        setError(EMAIL.test(email) ? '' : 'Enter a valid email address.')
      }
      return (
        <form className="field-demo flex w-full max-w-sm flex-col gap-4" noValidate onSubmit={check}>
          <GoopField data-invalid={error ? 'true' : undefined} {...pg.main}>
            <GoopFieldLabel htmlFor="demo-field-email">Email</GoopFieldLabel>
            <GoopInput
              id="demo-field-email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError('')
              }}
              type="email"
              placeholder="you@example.com"
              aria-invalid={error ? 'true' : undefined}
            />
            <GoopFieldDescription>We'll never share it.</GoopFieldDescription>
            <GoopFieldError errors={error ? [error] : []} />
          </GoopField>
          <GoopButton type="submit" className="self-start">Subscribe</GoopButton>
        </form>
      )
    }
    case 'fieldset':
      return (
        <GoopFieldSet className="field-demo w-full max-w-sm">
          <GoopFieldLegend>Notifications</GoopFieldLegend>
          <GoopFieldDescription>Choose how we reach you.</GoopFieldDescription>
          <GoopFieldGroup>
            <GoopField orientation="horizontal">
              <GoopCheckbox id="demo-field-email-n" defaultChecked />
              <GoopFieldLabel htmlFor="demo-field-email-n" className="font-normal">Email</GoopFieldLabel>
            </GoopField>
            <GoopField orientation="horizontal">
              <GoopCheckbox id="demo-field-sms" />
              <GoopFieldLabel htmlFor="demo-field-sms" className="font-normal">Text messages</GoopFieldLabel>
            </GoopField>
            <GoopFieldSeparator />
            <GoopField orientation="horizontal">
              <GoopFieldContent>
                <GoopFieldLabel htmlFor="demo-field-digest">Weekly digest</GoopFieldLabel>
                <GoopFieldDescription>A summary every Monday.</GoopFieldDescription>
              </GoopFieldContent>
              <GoopSwitch id="demo-field-digest" />
            </GoopField>
          </GoopFieldGroup>
        </GoopFieldSet>
      )
    default: {
      const bad = touched && !!tagsError
      return (
        <GoopField className="field-demo w-full max-w-sm" data-invalid={bad ? 'true' : undefined}>
          <GoopFieldLabel htmlFor="demo-field-tags">Topics</GoopFieldLabel>
          <Tags tags={tags} onChange={setTags} aria-invalid={bad ? 'true' : undefined} onBlur={() => setTouched(true)} inputId="demo-field-tags" placeholder="Add a topic, then press Enter" />
          <GoopFieldError errors={bad ? [tagsError] : []} />
        </GoopField>
      )
    }
  }
}

// ---- tiles (ComponentTile.vue) ----------------------------------------------------------------

export function Forms2Tile({ slug }: { slug: string }) {
  switch (slug) {
    case 'tags-input':
      return (
        <GoopTagsInput defaultValue={['vue', 'react']} containerClassName="w-auto" className="w-44 text-xs" aria-label="Tags">
          {['vue', 'react'].map((t) => (
            <GoopTagsInputItem key={t} value={t}>
              <GoopTagsInputItemText className="text-xs" />
              <GoopTagsInputItemDelete />
            </GoopTagsInputItem>
          ))}
          <GoopTagsInputInput className="w-8 text-xs" aria-label="Add a tag" />
        </GoopTagsInput>
      )
    case 'field':
      return (
        <GoopField data-invalid="true" className="w-40 gap-1.5">
          <GoopFieldLabel className="text-xs">Email</GoopFieldLabel>
          <GoopInput className="h-7 text-xs" defaultValue="nope" aria-invalid="true" aria-label="Email" />
          <GoopFieldError className="text-[11px]" goo={false}>Enter a valid email.</GoopFieldError>
        </GoopField>
      )
    default:
      return null
  }
}
