# Understanding Beyond the Mirror

This page explains the project in simple words: what the website does, who uses it, what it is built with, and how the parts work together. You don't need to be a programmer to follow it.

Live website: https://beyond-the-mirror-nu.vercel.app

---

## 1. What is this website?

**Beyond the Mirror** is a private support website for a school.

Students can talk to their school counselor, book a time to meet, and use self-help activities when they feel stressed, sad or stuck. Counselors get one place to read and answer students, plan sessions and keep notes. An administrator manages the accounts.

The name comes from the idea that a mirror only shows the outside. This website is a safe place to share what is on the inside.

---

## 2. Who uses it?

There are three kinds of users. Each one sees a different part of the website, called a **portal**.

| User | What they use it for |
| --- | --- |
| **Student** | Get matched with the right counselor, chat with them, book sessions, use the wellbeing toolkit, games and voice notes |
| **Counselor** | Apply with their qualifications, reply to students, manage sessions, keep private notes, review voice notes, look after the community board and Gratitude Wall |
| **Admin** | Check and approve counselors' qualifications, manage accounts, see how matching is working, see overall numbers |

Some parts are **public** (no login needed): the home page, the self-help toolkit, the games and the Mood Portal.

---

## 3. What can people do on it?

### Students

- **Get matched with the right counselor.** A short "How are you feeling today?" screen asks what's going on (for example exam stress or family problems). The website then picks the approved counselor whose experience fits best. If someone is stressed about exams, they're matched with a counselor who works with academic stress; family issues go to someone experienced with families. This "smart matching" runs on our own server and uses no outside AI service.
- **Message their counselor** in a private chat that updates live, like WhatsApp.
- **Write anonymously** if they are shy. The counselor can help without knowing who it is. The student can share their name later if they want.
- **Track their request:** Sent, Seen, Replied, Resolved.
- **Book a session** (in person, online or by phone) from the counselor's free times.
- **Get notifications** when the counselor replies or a session changes.
- **Community board:** ask other students for advice or share something good, with an optional photo. Posts can be anonymous.
- **A Voice That Understands:** listen to short voice notes (20 seconds to 2 minutes, up to 7 MB) recorded by other students for hard moments, like feeling lonely or before an exam. In English and Urdu. Students can record their own. A counselor checks every recording before anyone hears it.
- **Check in with yourself:** 10 quick questions about exam stress, overthinking, focus, sleep and feeling overwhelmed. The results give simple, practical ideas. It is not a medical test, and the answers are not saved.
- **Wellbeing toolkit:** six connected tools that save to the student's own private account:
  - **Daily Reflection Cards:** one thoughtful question a day, with a private journal.
  - **Behaviour Pattern Tracker:** note habits like sleep, study or putting things off, and see which patterns keep repeating.
  - **Stress Pattern Analysis:** record what causes stress and how it affects you, and see your recurring stressors over time.
  - **Academic Pressure Manager:** deadlines, breaking big tasks into steps, an automatic study plan for the week and a study timer.
  - **Decision-Making Assistant:** work through a hard choice step by step. It never decides for you.
  - **Gratitude Wall:** share things you appreciate, anonymously if you like. Posts with phone numbers, links or unkind words are checked by a counselor first.
- **Quick tools:** 8 short activities that work without an account, such as naming a feeling, calming down on a bad day, an exam revision planner and scripts for hard conversations.
- **The Little Reset Zone:** 7 games for a break, including **Little Paws 3D** (look after your own 3D virtual pet) and **Cozy Room** (a calm, rainy room to decorate), plus Smash the Stress, Spin the Fun Wheel, Mystery Box, Doodle & Guess and Guess the Emoji.
- **The Mood Portal:** pick a colour that matches your mood. The whole website changes colour and suggests something helpful.

### Counselors

- An **inbox** of all their students' messages, with search, filters and urgency labels so urgent requests stand out.
- **Private notes** about each case that only they can read.
- A **schedule** for setting free times and managing bookings.
- A **list of their students** with each student's history.
- **Apply with a professional profile:** full name, email, phone number, qualifications, years of experience and areas of expertise. Email and phone are required and only the admin can see them.
- **Review voice notes** before they go public, and **moderate** the community board, the Doodle Wall and the Gratitude Wall.
- **Announcements** to students.
- A simple **dashboard** with numbers like how many students are waiting for a reply.

### Admin

- **Check and approve** counselor applications. Only approved (verified) counselors are ever matched with students. If a counselor later changes their qualifications or areas of expertise, the admin checks them again.
- **Manage accounts:** change roles, pause access, reset passwords.
- **See how matching works.** The admin doesn't assign students by hand. The Matching page shows each counselor's areas and number of students, and what kinds of support students needed (totals only).
- See **overall statistics** only. The admin can never read anyone's messages.

---

## 4. How is it kept private and safe?

Privacy was the most important rule while building this.

- **The database itself decides who can see what.** Even if someone tried to trick the website, the database refuses to show a student another student's messages.
- **Admins can't read conversations.** They only see numbers.
- **Anonymous really means anonymous.** For anonymous messages, the student's name is not stored with the conversation at all.
- **No email needed.** People sign up with a username and password. This suits students who may not have their own email.
- **Counselor accounts must be approved** by the admin before they can see anything, and only verified counselors are matched with students.
- **The wellbeing toolkit is private.** Reflections, habits, stress records, tasks and decisions can only be seen by the student who wrote them, and they can edit or delete them at any time. Not even counselors or the admin can read them unless the student chooses to share.
- **Login protection:** after too many wrong passwords, logins are blocked for a while.
- **Photos and voice notes are stored privately.** They are shown through links that stop working after a short time.
- **Voice notes and community posts are checked.** A counselor reviews every voice note, and anyone can report something unkind.
- **Safety messages** appear in the right places. For example, if someone writes something worrying in the Mood Portal, emergency contact information appears straight away.
- **Things that stay on your device:** mood colours, game scores, check-in answers and "letters you won't send" are never uploaded.

There are **81 automatic security tests** that try to break these rules. All of them pass.

---

## 5. The technology (tech stack)

| Part | Tool used | What it does, in simple words |
| --- | --- | --- |
| Website framework | **Next.js** | Builds the pages and runs the "server" part of the website |
| Screens | **React** | Lets us build the screens from reusable pieces (buttons, cards, chat bubbles) |
| Programming language | **TypeScript** | JavaScript with extra checks that catch mistakes before the site goes live |
| Design and styling | **Tailwind CSS** | Colours, spacing, layout and animations |
| Database | **Supabase (PostgreSQL)** | Stores accounts, messages, bookings, posts, voice notes and more |
| Login | **Supabase Auth** | Handles usernames, passwords and keeping people signed in |
| Live updates | **Supabase Realtime** | Makes new messages and notifications appear instantly, without refreshing |
| File storage | **Supabase Storage** | Keeps photos, voice notes and doodles in private folders |
| Hosting | **Vercel** | Puts the website on the internet and updates it automatically |
| Code storage | **GitHub** | Keeps all the code and its history |
| 3D graphics | **three.js** with **React Three Fiber** | Draws the 3D pets in Little Paws, built entirely in code |

Smaller helpers:

- **Radix UI** makes menus, pop-ups and tabs work well with keyboards and screen readers.
- **Lucide** provides the icons.
- **Motion** adds the smooth animations.
- **Sonner** shows the small pop-up messages ("Message sent").
- **Zod** checks that what people type into forms is valid.
- **Playwright** is used for testing: it opens a real browser and clicks through the site like a person would.
- **Illustrations** come from unDraw and **photos** from StockSnap. Both are free to use.

---

## 6. How it works (the big picture)

```
   Your phone or computer
            |
            v
   Website on Vercel (Next.js)
            |
            v
   Supabase (database, login, live updates, files)
```

1. You open a page. Your browser asks the website on **Vercel** for it.
2. The website checks **who you are** (are you logged in, and are you a student, counselor or admin?).
3. It asks **Supabase** for the data. Supabase only returns what you are allowed to see.
4. The page is built and sent back to your browser.
5. While you are on a chat page, **live updates** push new messages to you straight away.
6. When you send something (a message, a booking, a voice note), the website checks it first and then saves it in the database.

### How smart matching works

The matching is done by our own code, with no outside AI service, so what students write never leaves the website.

1. The student answers "What's going on with you?", a follow-up question, and can add a few words of their own (English or Roman Urdu).
2. The website turns this into **areas of need**, for example "academic stress" and a little "anxiety". It recognises everyday words like *exam*, *parents*, *ammi*, *dost* or *overthinking*, and ignores phrases like "not worried".
3. The database gives every **verified** counselor a score based on:
   - how well their areas of expertise match (the biggest part),
   - years of experience,
   - whether they're available right now (extra important for urgent requests),
   - how many students they already have, so nobody is overloaded,
   - a small bonus if they're already the student's counselor, so people keep the same person when it fits.
4. The highest score wins. The student sees who they were matched with and why, and can write to them straight away.

If the words suggest someone might be in danger, the request is marked urgent and emergency contact information appears immediately.

---

## 7. How it was built

1. **Planning:** decided who the users are, what each one needs, and what must stay private.
2. **Database first:** created the tables (accounts, conversations, messages, bookings, posts, voice notes and so on) and the privacy rules on each one.
3. **Pages for each portal:** built the student, counselor and admin sections, plus the public pages.
4. **Design:** a clean white base with warm colours, photos inside arch shapes (the "mirror" idea), illustrations and gentle animations. It works on phones, tablets and computers.
5. **Extra features over time:** anonymous messages, the community board, voice notes, the check-in, the games, the Mood Portal, counselor verification and smart matching, the six-tool wellbeing toolkit, Little Paws 3D and Cozy Room.
6. **Testing:** automatic security tests, plus browser tests that sign in as each type of user and try every page and feature.
7. **Publishing:** the code is pushed to GitHub. Vercel notices, builds the website and puts it online. Any database changes are applied automatically during that build.

---

## 8. Where things are in the code

| Folder | What is inside |
| --- | --- |
| `src/app/` | The pages. Each folder is a web address (for example `student/messages`) |
| `src/components/` | The building blocks of the screens (chat, games, voice player and so on) |
| `src/actions/` | The code that runs when someone saves something (send a message, book a session) |
| `src/lib/` | Shared helpers (login checks, settings, lists of moods, games and tools) |
| `supabase/migrations/` | The database design and its privacy rules |
| `scripts/` | Tools for setting up the database, adding demo data and running security tests |
| `public/` and `src/assets/` | Images and illustrations |

---

## 9. Running it on your own computer

You need **Node.js** and **Docker** installed. Then:

```bash
npm install          # download the project's tools
npx supabase start   # start a local copy of the database
npm run seed         # optional: add demo students and counselors
npm run dev          # open http://localhost:3000
```

The full setup steps, including how to put it online, are in [README.md](README.md).

---

## 10. A few words you might see

- **Portal:** the part of the website for one type of user (student, counselor or admin).
- **Database:** where all the information is saved.
- **Row Level Security (RLS):** rules inside the database that decide which rows each person can see.
- **Realtime:** instant updates without refreshing the page.
- **Deploy:** putting a new version of the website online.
- **Migration:** a file that describes a change to the database, applied in order.

---

*Beyond the Mirror is not an emergency service. If someone is in danger, they should contact a trusted adult or local emergency services straight away.*
