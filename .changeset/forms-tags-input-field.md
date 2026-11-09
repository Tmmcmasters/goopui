---
'@goopui/core': minor
'@goopui/vue': minor
'@goopui/react': minor
---

Tags Input and Field. `GoopTagsInput` (+ `Item`, `ItemText`, `ItemDelete`, `Input`): shadcn-vue's TagsInput on reka-ui in Vue, and goopUI's own React TagsInput with the same parts and keyboard (shadcn/ui has none). It keeps GoopInput's goo focus ring around the whole box; a new tag plops in like a droplet joining (`merge`), a removed one drains away (`melt`). Core: `attachTagsInput`, `tagMergePose`, `tagMeltPose`, `TAGS_INPUT_EFFECTS`; `attachInput` takes an optional `frame` (the element the ring follows). `GoopField` and its parts (`FieldSet`, `FieldLegend`, `FieldGroup`, `FieldContent`, `FieldLabel`, `FieldTitle`, `FieldDescription`, `FieldSeparator`, `FieldError`): shadcn's Field family, the controls inside keep their own goo, and `GoopFieldError` drips in when it appears (`drip`, `reveal`; core `attachFieldError`, `fieldErrorPose`).
