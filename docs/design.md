# Design

Read this before you build or change a screen, a form, a sheet or a list. Tokens and utilities live in `src/app/globals.css`.

## Lens

Apple Human Interface Guidelines, applied to a web app. System components carry navigation and controls. Identity lives in color, type and a few defining moments. Cite the HIG page when a choice is debatable.

## The visual system

### Philosophy
- Apple grouped layout: a warm gray page, white content surfaces, one smash red accent (`#b01e28`, `--primary`).
- Glass appears only on the floating tab bar and the sticky header. Content never uses glass.
- Each screen has one bold `.hero` surface: Home (win rate), Session (title and cover), Match (score), auth screens (brand).
- Light mode only. We decided not to ship dark mode. Do not make large text harder than it is now.

### Radius roles

| Role | Size | Use |
|---|---|---|
| full | pill | buttons, chips, avatars |
| 4xl | 32px | heroes, dialogs, sheets |
| 2xl | 24px | cards, lists, menus |
| xl | 20px | inputs, selects, menu items |
| lg | 16px | tiles in rows |
| md | 12px | thumbnails, small icon tiles |

Inner shapes use the next step down. There is no 3xl.

### Type roles

| Role | Size | Use |
|---|---|---|
| caption | 11 | the smallest text, date block labels |
| footnote | 13 | group labels, helper text |
| sm | 14 | secondary text in rows |
| subhead | 15 | buttons, menus |
| body | 16 | row titles, navigation titles |

- Use the tokens, not `text-[..rem]`.
- `cn()` knows these tokens are font sizes. A text color next to one never drops it.
- Big readouts use `.score` at `text-3xl` (the time sheet time, the Home stats).
- A value you type into a field (title, fee) is `text-xl`.

### Buttons
- Buttons are capsules with a 44px minimum height. Inputs and selects are filled gray and 44px tall.
- **Variants:** default (filled), tinted, text, bare, secondary (gray), outline, ghost, destructive (tinted), link.
- **Text:** colored words with no fill and no hover. It sits flush with the content edge, and its tap area extends 8px each side.
- **Bare:** an icon with no shape. A faint circle shows on hover, on pointer devices only. Never on touch.
- **Disabled:** a disabled primary button is gray (`bg-foreground/10`), not a faded red. A button with a spinner stays red while it saves.
- **Actions on the page gray:** small ones use `variant="text"`. "Add something" is an `AddRow` as the last row of a white `group-list`. Do not use a tinted pill or a full width tinted button on the gray.
- **Destructive on the gray:** a white row with red text (`LogoutButton`), or an outline button with a red icon. The tinted `destructive` button is for white surfaces.

### Icons

| Box | Use |
|---|---|
| 16 | inline with text (row chevron, clock, pin, a "+" in a text button) |
| 20 | inside controls: row menus, discs, the header "+" |
| 24 | navigation: Back, match arrows, calendar arrows |
| 28 | the floating "+" |

- Stroke is 2.5 for controls. `buttonVariants` sets it. Checks stay at 3.
- Match ink by role, not box. A 20 "+" looks as big as a 24 chevron.
- 12 stays only inside badges and chips.
- Row menus ("…") are bare and muted. Navigation icons are bare and red.
- Every icon button has a 44px hit area. A smaller shape grows its hit area with a pseudo element.

### Rows and lists
- `.list-row` is `px-4 py-3 gap-3`. `RowChevron` is 16px. Avatars are 32px (`size="sm"`) in rows and stacks. 48 and 80 are for identity only: the Home greeting, the score hero, the profile.
- Section headings: `.section-title` for a screen section, `.section-label` for a list group.
- Spacing is on a 4px grid. Related lines sit close, unrelated things sit far.
- Forms use `Field`, `FieldGroup`, `FieldLabel` and `FieldError`. Sheets use the bottom `Sheet` with a grabber. Confirmations use `AlertDialog`. Empty states use `Empty`.
- Tint: `--accent` is the brand red at 10 percent, never a fixed pink. Use `bg-accent` for chips, badges and tinted buttons. Pressed is `bg-primary/15`.
- Red is spent by meaning. Do not use it as decoration.

### Accessibility
- Small text meets 4.5:1. The tab label uses `accent-foreground`, not `primary`.
- Not checked yet: increased contrast, large text sizes.

## Principles for forms and input

### 1. Do the work for the person
- Ask only for what the app cannot know.
- Pre-fill from history: last location, last fee, usual start time, recent teammates.
- Test: could the app have known this?
- HIG: entering data (get information from the system).

### 2. Choose, don't type
- Prefer tap, drag and step over typing. Keep typing as the precise fallback.
- Model: the sync sheet. Drag the ruler, step with plus and minus, or type the time.
- Test: what is the fastest input for this value?
- HIG: entering data (offer choices), pickers.

### 3. Say the problem while there is time to fix it
- Validate on blur, then live once a field has an error.
- Errors are inline, next to the field, in plain language, and say how to fix it.
- Toasts confirm success. They never carry field errors.
- Focus and scroll to the first invalid field on submit.
- Disable the primary button only when the reason is obvious.
- HIG: entering data (dynamically validate), text fields.

### 4. Never lose someone's work
- Guard unsaved changes on every exit: Cancel, swipe down, back.
- Destructive actions are undoable, or confirmed.
- Nothing drops silently. A blank that cannot be saved must say so.
- A failed save keeps what was typed.
- HIG: sheets (swipe to dismiss with unsaved changes), undo and redo.

### 5. Progressive disclosure
- Essentials first. Rare options sit behind one clear row.
- One job per screen or sheet, and one primary action.
- Test: would 80 percent of people change this field? If not, tuck it away.

### 6. One pattern per job
- Build shared form behavior once, not per screen.
- Every sheet is a real `<form>`: Enter submits and `enterKeyHint` is set.
- Sheet layout: grabber, title and one line of description, fields, a full width primary button, Cancel as a ghost button beneath.
- Use the same words for the same action everywhere. Capitalization follows existing screens.

### 7. Works for every hand, eye and keyboard
- 44px minimum targets. Set the keyboard type per field (`inputMode`, `type`, `autoCapitalize`, `autoComplete`, `spellCheck`).
- Visible focus, real labels, errors announced to screen readers, and never color alone.
- Check at 390px and at desktop width, with the on-screen keyboard open.
- HIG: accessibility, virtual keyboards.

### 8. Spend the craft in one place per screen
- One signature interaction per screen, at the level of the sync ruler. Everything else stays quiet.
- Delight comes from fewer steps, not decoration.

## Review checklist

Run it before every form commit.

- [ ] Every field has a reason to exist and a sensible default.
- [ ] Optional fields say "Optional" in the label, not only in a placeholder.
- [ ] Validation timing follows principle 3. Server errors show inline.
- [ ] Leaving with changes asks first. Destructive actions can be undone.
- [ ] Enter submits. The keyboard type and return key fit the field.
- [ ] Targets are 44px. Labels, focus and aria are right.
- [ ] Checked in the browser at 390px and at desktop width, and with the keyboard open.
- [ ] Copy says what happens ("Save changes", not "Submit").

## Pattern log

Add a line when you make a decision, so later screens stay consistent.

### Forms
- **Sheets:** a full width bottom primary button. Every sheet is a `<form>` with autofocus on the first field, a ghost Cancel under the primary, and a 44px close X. Sheets are white (`bg-card`) so gray inputs show. A sheet built around a white list (`pick-sheet`, `team-players-sheet`) stays gray with `bg-background`.
- **Edit screens** hide the tab bar and the "+" button (`bottom-nav.tsx`). A task has its own back and save.
- **Form hook:** `useAppForm` (`src/hooks/use-app-form.ts`, TanStack Form with a zod schema) in a feature hook next to the component. The component is presentational. Pure reducers hold multi-field changes and have unit tests.
- **Leave guard:** `useAppForm` feeds `useUnsavedChanges` from the form's dirty state. Use `LeaveLink` for links and `useConfirmDiscard().discard(action)` for programmatic navigation (`src/hooks/unsaved-changes.tsx`).
- **Validation:** the zod schema in the form hook, with plain copy. A field speaks after blur, then live. After a submit attempt every field speaks. Server errors land on their field through `splitServerErrors` and clear at the next edit.
- **Rejected submit:** `useAppForm` scrolls to and focuses the first error through `useRevealFirstError`. Fields opt in with `aria-invalid`.
- **Optional fields:** `<OptionalTag />` in the label.
- **Handles:** `useHandleCheck(raw, own?)` plus `HandleHint` and `handleProblem` give live availability. Spending a handle change asks first.
- **Auth:** one password field with show and hide (`PasswordInput`), and no repeat field. Auth runs in server actions. Provider errors go through `authFailure`. `MIN_PASSWORD` must match `minimum_password_length` in the Supabase config.
- **People:** pick from teammates and guests first (`loadPeople`), then search. Enter does the likeliest thing. `@handle` means look up. A bare name means guest.
- **Staged edits** (session form, match editor): Save waits for a change. Removing something staged offers Undo.
- **Scores:** two digits advance to the next score box. A blank over a saved score clears it on save (`matches.removeScores`).
- Show match types with `MATCH_TYPE_LABEL`, never the code.

### Lists and dates
- **Agenda:** Home and Sessions share `AgendaRows` (`session-list.tsx`). A day is one list item. A single date column on the left spans all that day's sessions. A hairline separates it from the sessions, which stack to its right with a short rule between them.
- **Date column:** a slim spine (`w-16`, 64px). `DateBlock` sits at its top, with its middle level with the middle of the first row. It shows the weekday, the day number (`.score text-xl`, 20) and the month. The weekday and month are caption size, bold and tracked, 2px apart.
- **Session row:** the name on one line, the short time ("9:00 to 11:00 am", `timeRangeShort`: the full range with the first am or pm dropped when it is shared, no length, a red "Now" in front while it runs), and the place, each on its own line with its icon. A missing time or place keeps its line in muted text ("No time set", "No location set"). Up to two avatars at 32px with a "+N" chip sit on the right, then a chevron. Every line truncates, and every row is a fixed 100px (`h-25`). The date column is placed for that height, so a shorter row would push the date block off the row's middle.
- **Row spacing:** name 16 on 24, detail lines 14 on 20, 4px between lines, centered in the row.
- **Headings:** the Sessions page has a `section-title` for each part (Today, Upcoming, Past) and a `section-label` for each month, over one white `group-list` each. The block names the month too, so a row reads on its own and Home matches.
- **Red in the date column:** today fills the whole column, top to bottom, in solid red with white text. Never a red tile inside a white cell, and never a fill that stops partway. An upcoming day has a red weekday over a dark number. A past day is all gray. Do not fill a date cell red for any other reason, and do not use a tile per row.
- **Why the rows feel right:** a typographic anchor with strong scale contrast, a hairline between the anchor and the content, the same structure on every row, icons in place of labels, and room to breathe.
- **Dates and times:** use only the forms in `src/lib/format.ts` (see its header). Never write `toLocale...` in a component. Everything is on the viewer's clock. See [architecture.md](architecture.md#time-and-timezones).
- **Placeholder art** is always brand red, never green. With no cover photo the session hero is plain red with no pattern. A real photo shows as an inset image.
- **Bottom nav:** the selected tab is a faint neutral capsule (`bg-foreground/6`) with a red icon and label.

### Videos
- **Playlist:** the Videos page is a playlist of games, modelled on the YouTube phone playlist. Each game is a row: a 16:9 thumbnail (`w-40`), the video's own label at body weight on up to two lines, then the game and its result, then who added it. A "…" menu holds the secondary actions.
- **Empty game:** a game with no video keeps its row, with a dashed thumbnail and a red "Add a video". Do not hide it. A viewer sees "No video yet" in muted text.
- **Not linked to a game:** videos with no game sit in a white `group-list` under the playlist, each with a red "Link". They are obvious without a banner.
- **Sync chip:** bottom right of the thumbnail, where YouTube puts the duration. Black with a check and the offset when synced. Brand red with "Not synced" when not. The page also says "N videos need syncing" once, and it scrolls to the first.
- **Player:** playing a row puts the player where the poster was and pins it under the header, so the list scrolls beneath it. The playing row is tinted `bg-accent` with "Playing" on its thumbnail. "Next game" plays the next game that has a video. A link that cannot play in the page opens in a new tab.
- **Placeholder frame:** with no thumbnail the frame is the drawn court in brand red with the game number, never a photo stand-in in another color.

### Loading and errors
- **Skeletons:** one `loading.tsx` per screen. Words that never change stay real ("Welcome back", "Upcoming", "Sessions"). Blocks are `Skeleton`, with the radius and height of what replaces them, and the hero stays red with white-tinted blocks. The agenda uses `AgendaRowsSkeleton` (same date column, same 100px rows). Check it against the real page at 390px: the next heading should sit at the same height.
- **A tab opens at once.** The browser shows its cached copy and the new data swaps in with no skeleton. Do not add a spinner or a "refreshing" label for it.
- **Failure:** `ErrorScreen` says "Could not load this" with one "Try again" button. It never shows the cause.

### Calendar and pickers
- The calendar month title, weekday labels and day numbers are all `sm` (14), told apart by weight and tone. Week numbers are footnote (13). A day's sub text is caption (11).
- Today always has a red ring. On a plain day the ring is the whole marker. On a filled day (a session, or the picked day) the ring sits outside the fill with a thin white gap.
- **Time of day** (`TimeSheet`): the big readout is the text field. Type "10", "10pm", "22:00" or "noon" (`parseTime`). On blur or Enter it settles to "10:00 am", and you edit that to correct it. A bare 1 to 11 reads as am. Text that is not a time stays, marked invalid, with a hint. It focuses on open only with a mouse and keyboard, never on a phone, where the keyboard would cover the chips and the tape.
- Known exception: the role menu descriptions in the session form use `text-xs`.

### Interaction
- **Cursor:** every clickable shows a pointer. One rule in `globals.css` does it (base layer, `:where()`). Do not add `cursor-pointer` per component. Menu and select rows must not use `cursor-default`. Draggable things (chip rows, the tape ruler) use grab, and show grabbing while dragged.
