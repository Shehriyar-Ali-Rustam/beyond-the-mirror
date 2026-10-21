# Product notes

This document records how the original brief was interpreted, the gaps found in it, and the decisions behind the build.

## 1. What the earlier version got right, and what was missing

The earlier prototype had the right instinct: the gap between what students show ("I'm fine") and what they are actually going through. It relied on anonymous posts, secret reply codes and a public feed. That made it simple, but it left gaps:

| Gap | Why it matters | What this version does |
| --- | --- | --- |
| No accounts, so no ongoing relationship | Counseling is a relationship, not a one-off message | Real accounts, an assigned counselor, persistent conversations |
| Secret codes to check replies | Codes get lost, nothing notifies you, there's no history | Notifications, read receipts, request history |
| A public feed of personal struggles | Moderation burden, risk of pile-ons and exposure | Removed. Sharing is private, one-to-one |
| No triage for counselors | Urgent messages get buried | Urgency levels, a "needs attention" queue, status workflow |
| No safeguarding model | A school has a duty of care | Identified (not anonymous) requests, a clear statement of confidentiality limits, safety prompts |
| No administration | Someone has to onboard counselors and balance caseloads | Admin portal with approvals, assignments and aggregate statistics |

### Why messages aren't anonymous

Anonymous messaging feels safer, but in a school it can block the duty of care. If a student discloses risk of harm, the counselor needs to know who it is. Instead, this version:

- states plainly who can see what (see the landing page's privacy table), and says it at the moment of writing
- makes the *toolkit* fully anonymous: no login, nothing stored
- keeps admins technically unable to read conversations

## 2. Roles and journeys

**Student:** *Land → sign up with a username, no email (30 sec) → write a first message (auto-matched to a counselor) → notified of the reply → continue the thread or book a session → resolve → rate.* The toolkit is available throughout and can hand a reflection (e.g. "Untangle a thought") straight into a new message.

**Counselor:** *Sign up with a username → wait for admin approval → open the Overview (who's waiting, what's urgent) → Inbox: reply, set status/urgency/topic, add private notes → Schedule: open slots, manage bookings, mark sessions complete → read feedback and statistics.*

**Admin:** *Log in with the fixed admin credentials → approve counselors → assign students and balance caseloads → monitor aggregate usage → publish announcements.* Admins never see message content.

## 3. Information architecture

```
Public:    /  (landing) · /toolkit · /toolkit/[tool] · /login · /register
Student:   Home · Messages (list, new, thread) · Sessions · Toolkit · Resources · Settings
Counselor: Overview · Inbox (two-pane) · Schedule · Students (roster, profile) · Announcements · Settings
Admin:     Overview · People · Assignments · Announcements · Settings
```

## 4. Feature decisions

- **No email required.** Many students don't have (or don't want to use) a personal email. Accounts use a username + password plus general profile details. Contact email is optional. Forgotten passwords are reset by the admin, who sees a one-time temporary password.
- **One fixed admin.** The administrator logs in with credentials set in environment variables. No admin sign-up, no SQL bootstrap.
- **Request = conversation.** Each request has a subject, topic, urgency and status, so it works both as a chat and as a case. Students can resolve or reopen. Counselors control triage fields.
- **Auto-matching.** A student without a counselor is matched to the lightest active caseload on their first message, so nobody hits a dead end. Admins can reassign at any time, and open requests move with the student.
- **Real-time where it matters.** Messages, inbox updates, read receipts and notifications use Supabase Realtime. Everything else is server-rendered.
- **Feedback loop.** Ratings after resolved requests and completed sessions give counselors signal without surveys.
- **Toolkit = the reference images' features,** consolidated into seven tools so it doesn't sprawl. "Fact or Fear" and the "Overthinking Breaker" became one tool, and "How to Say No" and "What Should I Say" became one script library.
- **Not built (yet):** file attachments (privacy and moderation cost), group sessions, SMS/push notifications, multi-school tenancy. The schema leaves room for each.

## 5. Design system

**Concept:** the arch, the shape of a mirror. It frames the hero, avatars, empty states and tool icons, and gives the product one recognisable silhouette instead of decoration.

**Typography:** *Fraunces* (soft, optical-size serif) for headings and moments of voice. *Instrument Sans* for UI and body text. Numbers on dashboards are set in the sans.

**Colour tokens** (light / dark), defined in `src/app/globals.css`:

| Token | Role |
| --- | --- |
| `bg`, `surface`, `surface-2/3`, `line` | Warm paper neutrals. Quiet, not clinical |
| `ink`, `ink-2`, `ink-3` | Text hierarchy |
| `primary` (evergreen) | Trust and action; the only saturated colour in most views |
| `clay` | Warmth: unread dots, highlights |
| `lilac` | Used only for the "reflection" motif |
| `ok`, `warn`, `info`, `danger` (+ `-soft`) | Reserved for status, always paired with a label or icon |

**Components:** buttons (primary / secondary / soft / ghost / danger), inputs with inline validation, chips, badges, cards, dialogs and drawers, dropdowns, popovers, accordion, skeletons and arch empty states, all on Radix primitives for keyboard and screen-reader support.

**Motion:** short and purposeful. Fade-up on entry, a spring on the active nav pill, message bubbles easing in. All of it respects `prefers-reduced-motion`.

## 6. Ideas for later

1. Push notifications through a PWA install
2. Counselor-to-counselor handover notes and case transfer
3. Per-school configuration (crisis lines, allowed email domains, branding)
4. Export of aggregate reports for school leadership
5. A mood check-in history the student owns and can choose to share
