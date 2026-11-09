import { effect, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

const ring = [
  { prop: 'flow', type: fx, def: 'true', note: "On focus, goo flows around the box's border from the click point (the left edge on keyboard focus). GoopInput's ring." },
  { prop: 'close', type: fx, def: 'true', note: 'The wobble where the two flow fronts meet and close the ring.' },
  { prop: 'ripple', type: fx, def: 'true', note: 'Each edit sends a small ripple along the ring from the point nearest the caret.' },
  { prop: 'wobble', type: fx, def: 'true', note: 'The closed ring wobbles gently while the field is focused.' },
  { prop: 'drain', type: fx, def: 'true', note: 'On blur the ring drains away, top first.' },
  { prop: 'drip', type: fx, def: 'true', note: 'With aria-invalid, a small drip hangs off the bottom of the destructive ring.' },
  { prop: 'drips', type: fx, def: 'false', note: 'Resting drips under the ring while it shows. Off by default.' },
  { prop: 'merge', type: fx, def: 'true', note: 'A new tag plops in like a droplet joining: a small drop of the tag colour spreads into the tag with a little jelly, and a goo bridge to the tag before it swells and pinches off. A number scales the jelly.' },
  { prop: 'melt', type: fx, def: 'true', note: 'A removed tag drains away where it was: it pinches in from both ends, sinks a little and shrinks to nothing.' },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: ring thickness and timing, how much a new tag overshoots, how far a removed one sinks.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]

export default defineComponentDoc({
  slug: 'tags-input',
  title: 'Tags Input',
  category: 'Forms',
  component: 'GoopTagsInput',
  code: `<GoopTagsInput v-model="tags"{{main}}>
  <GoopTagsInputItem v-for="tag in tags" :key="tag" :value="tag">
    <GoopTagsInputItemText />
    <GoopTagsInputItemDelete />
  </GoopTagsInputItem>
  <GoopTagsInputInput placeholder="Add a framework…" />
</GoopTagsInput>`,
  reactCode: `import {
  GoopTagsInput,
  GoopTagsInputInput,
  GoopTagsInputItem,
  GoopTagsInputItemDelete,
  GoopTagsInputItemText,
} from '@goopui/react'
import { useState } from 'react'

export function Frameworks() {
  const [tags, setTags] = useState(['Vue', 'React', 'Svelte'])
  return (
    <GoopTagsInput value={tags} onValueChange={setTags}{{main}}>
      {tags.map((tag) => (
        <GoopTagsInputItem key={tag} value={tag}>
          <GoopTagsInputItemText />
          <GoopTagsInputItemDelete />
        </GoopTagsInputItem>
      ))}
      <GoopTagsInputInput placeholder="Add a framework…" />
    </GoopTagsInput>
  )
}`,
  controls: [
    preset(),
    speed(),
    strength('merge'),
    effect('melt'),
    effect('flow'),
    effect('ripple'),
    effect('wobble', { advanced: true }),
    effect('drain', { advanced: true }),
    effect('close', { advanced: true }),
  ],
  tables: {
    main: {
      caption: 'GoopTagsInput props',
      rows: [
        { prop: 'modelValue', type: 'AcceptableInputValue[]', def: '', note: 'The tags (v-model).' },
        { prop: 'defaultValue', type: 'AcceptableInputValue[]', def: '', note: 'The initial tags when uncontrolled.' },
        { prop: 'addOnPaste, addOnTab, addOnBlur, duplicate, delimiter, max, disabled, ...', type: '', def: '', note: "reka-ui's TagsInputRoot props, forwarded as they are." },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the bordered box, like shadcn.' },
        { prop: 'containerClass', type: 'string | array | object', def: `'relative w-full min-w-0'`, note: 'Classes for the wrapper that holds the ring layer. Set width or margins here.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn TagsInput, with no wrapper.' },
        ...ring,
      ],
    },
  },
  reactTables: {
    main: {
      caption: 'GoopTagsInput props',
      rows: [
        { prop: 'value, defaultValue, onValueChange', type: 'string[]', def: '', note: 'The tags, controlled or not.' },
        { prop: 'addOnPaste, addOnTab, addOnBlur', type: 'boolean', def: 'false', note: 'Pasted text becomes tags (split on the delimiter); Tab or leaving the field adds the typed text.' },
        { prop: 'duplicate', type: 'boolean', def: 'false', note: 'Allow the same tag twice.' },
        { prop: 'delimiter', type: 'string | RegExp', def: `','`, note: 'Typing this character adds a tag (a RegExp only splits pasted text).' },
        { prop: 'max', type: 'number', def: '0', note: 'Most tags allowed (0: no limit).' },
        { prop: 'disabled, dir, name, required', type: '', def: '', note: 'As on reka-ui. With name, each tag is submitted as a hidden input.' },
        { prop: 'displayValue, convertValue', type: '(v: string) => string', def: '', note: 'How a tag reads; how typed text becomes a tag (default: trimmed).' },
        { prop: 'onAddTag, onRemoveTag, onInvalid', type: '(tag: string) => void', def: '', note: 'A tag was added, removed, or refused (a duplicate, or max reached).' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the bordered box.' },
        { prop: 'containerClassName', type: 'string', def: `'relative w-full min-w-0'`, note: 'Classes for the wrapper that holds the ring layer.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders the plain box, with no wrapper.' },
        { prop: 'ref', type: 'Ref<HTMLDivElement>', def: '', note: 'The bordered box.' },
        { prop: 'goopRef', type: 'Ref<TagsInputHandle>', def: '', note: 'The live engine handle (null before mount or with goo off).' },
        ...ring,
      ],
    },
  },
})
