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
- **Length chip:** bottom right of the thumbnail, where YouTube puts the duration, in YouTube's format (`7:43`). Nothing when the length is not known. The row does not show the sync point. The page says "N videos need syncing" once, and it scrolls to the first.
- **Player:** the Video.js YouTube element with YouTube's own minimal controls, which hide while it plays. No skin and no brand color, so the video is the only thing with color. While paused, YouTube shows its own title and logo over the picture, which we cannot remove. Playing a row puts the player where the poster was and pins it under the header, so the list scrolls beneath it. The playing row is tinted `bg-accent` with "Playing" on its thumbnail. "Next game" plays the next game that has a video. A link that cannot play in the page opens in a new tab.
- **Sync sheet:** the 16:9 preview sits at the top of the sheet, then the readout, the one second steppers and the ruler. Play and pause the video and the readout follows it. Move the readout, steppers or ruler and the video jumps there and waits. The ruler is the fine control: a tick per frame step (a 30th of a second) and a label per second, 8px per step, so move far with the video's own bar. A video that cannot play in the page shows no preview, and its sheet is the same without it.
- **Placeholder frame:** with no thumbnail the frame is the drawn court in brand red with the game number, never a photo stand-in in another color.

### Import
- **Four steps on one page** (`/import`, from the "..." menu on Sessions, and from the empty Sessions page): file, people, check, done. The tab bar steps aside, as on edit screens. The primary button is pinned at the bottom, with Back as a ghost button under it.
- **File step:** the format and the time zone for new sessions are two rows in a white list. Several files can be chosen at once. Each is a row with a tinted icon disc, its name, its row count or problems, and a trash button. There is no tick, no problems is the normal state. "Add another file" sits under the list. A bad file lists every problem with its file and line, and Continue stays gray until the set is clean. A set that is clean shows one list under "In this import", in the same row style: a tinted icon disc, the label ("Games with a video", "Sessions", "Unlinked videos") and the number in `.score` on the right. Names are not counted here, they belong to the next step.
- **Several files are one set.** Names are linked once for all of them. A video or a game number used in two files is a problem before anything is sent. Files are checked and imported one at a time, in name order, each in its own transaction, and the next file links to the guests the last one made. If a later file fails, the earlier ones stay imported, the screen says which file stopped, and choosing the files again is safe because rows already in are left out. The check step checks each file on its own and says so.
- **People step: one name at a time.** The app asks only about names it cannot place: the ones that start as new guests, most games first. A name that matched someone you know or a guest you made is not asked about. Each name is a screen: "Name 3 of 12" with a thin progress bar, "Who is Gar?", a line of facts (games, months played, who it plays with) to help know who it is, the familiar people search, then the likeliest people under "Possible matches" (or "People you play with" when none fit). You come first, labelled "You". Below, under "Or": "Add “Nad” as a guest" (the default, marked Chosen), and "Same person as Nad" for another name still kept as a guest. A name typed in the search becomes the guest's name, and the handle follows it, as in the Add members picker. The guest's made up handle is hidden. "Edit guest details" is one quiet row that opens the name and handle fields, filled from what is typed. "Find @handle" is the same row in both pickers: a spinner while it looks, then the magnifier again with the reason in red under the handle when no one can be used. Spacing: 24 between parts of the screen (search, results, Or), 8 between an eyebrow and its list. Tapping a person chooses them and moves on. "Next" keeps what is chosen, and "Done" on the last name opens the review.
- **Filter by player:** one row sits above the Matches and Games sections of a session and filters both. It is the same row as Members and Videos, in its own white card: a tinted icon disc (`ListFilter`), the small label "Filter by player", the value "Everyone", and a chevron. It opens a bottom sheet (the faceted filter of a data table, on a phone). With people ticked the row stays a white card, as the Members row does, and only two things change: the disc turns solid red, and the value shows their avatars with a muted "3 players". With four or more players the stack ends in "+N", as the Members row does. A plain muted × (16px, in the chevron's place, the same button as the remove button on the import file rows) clears it. The card holds one child, because `.group-list` draws a line above every child after the first, which showed as a stray outline when the × was a second child. No names and no counts are repeated there, because the avatars say who and the section headings say how many. A tinted row, a pink avatar ring and a red × were tried and dropped: red on gray looked muddy and the × did not match the chevrons. A match is the unit and stays whole, because every game in it has the same players. A game on its own is a match of one. A card stays when every ticked player is in it (Ian and Jit shows what they both played), and it stays in its own section. A section with nothing left hides, and while filtering its heading shows the count. The sheet lists the players, the one in the most cards first, each with a tick circle and, under the name, "3 matches · 4 games" left if you ticked them (a lone game counts as a game only, so nothing counts twice, and a player who would leave none says "None together" and is dimmed). A search box shows from 8 players. The list behind updates at once, and "Show 3 matches and 4 games" closes the sheet. No result says "Nothing with all of them" and offers "Clear filter". The button shows only when there is more than one card and more than one player. The ticked players live in the address as handles (`?players=ian,jit`), set with `replaceState` so Back leaves the page and does not step through each tick. Back from a match returns to the same filtered view, and the link can be shared. The first paint is unfiltered, then the browser applies the address.
- **Steps and drafts:** a small "File, People, Check" strip sits above every step. A step you have passed shows a tick and can be tapped to go back, and nothing you chose is lost. The review has a "Files" row that goes back to the file step. Opening Import with an unfinished draft shows "Pick up where you left off" above the settings. See decisions.md, "An import in progress".
- **Review:** "Who is who?" lists the people the names mean, not the names. The row title is the person who will be used. Under it: `@handle • imported from “Zaaq, Zard”` for someone linked (a guest you made earlier counts as linked, and says "Guest"), or `Imported from “Nad”` for a new guest. Two names for one person are one row. Rows sit under "Linked to people" and "New guests", most games first. Tap a row to open the screen of each name in it again. "Check the import" is the one primary action. Coming back from the check opens the review, not the first name.
- **No names, no people step:** a file with only unlinked videos names nobody, so Continue goes straight to the check, and Back from the check returns to the file.
- **Check step:** runs the real import and rolls it back, so the counts and every error are exact. Errors say the line or the name. Nothing is saved until the person presses Import.
- **Unlinked videos:** a file row with `kind` set to `video` is a video with no game. The import screens call it an "unlinked video". Counts always say games first, then unlinked videos ("250 games and 14 unlinked videos"). A session row in the check step shows the two counts on two lines. Plain game files read exactly as before.

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
