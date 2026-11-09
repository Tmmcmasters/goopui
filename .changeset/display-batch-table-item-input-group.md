---
'@goopui/core': minor
'@goopui/vue': minor
'@goopui/react': minor
---

Table, Item and Input Group, in `@goopui/vue` (shadcn-vue parts, reka-nova classes) and `@goopui/react` (shadcn/ui parts, radix-nova classes).

- **Table** (`GoopTable` + Header, Body, Footer, Row, Head, Cell, Caption, Empty): the body rows' hover fill is one goo blob that glides from row to row (a calm menu highlight with the pointer swell). It lives in a clipping stage beside the table, on a pill inset into the row, so it never changes the container's scroll size. Opt-in `selected`: the blob rests on the selected row and is its fill. Toggles `highlight`, `wobble`, `momentum`, `followPointer`, `selected`.
- **Item** (`GoopItem`, `GoopItemGroup` + Media, Content, Title, Description, Actions, Header, Footer, Separator): in a group the interactive items' hover / focus fill is one goo blob; an interactive item squishes a little when pressed and settles with a small jelly bounce (`press`, never past full size). Items inherit `goo`, `press`, `speed`, `preset` from the group.
- **Input Group** (`GoopInputGroup` + Addon, Button, Text, Input, Textarea): GoopInput's goo focus ring around the whole group; the buttons inside are GoopButtons. Same toggles as GoopInput.
- core: `attachTableHighlight`, `attachItemGroupHighlight`, `attachItemPress`, `attachInputGroup` (and their feels / constants). `attachMenuHighlight` / `attachListHighlight` take an optional third `layout` argument (`layer`, `rect`, `radius`).
