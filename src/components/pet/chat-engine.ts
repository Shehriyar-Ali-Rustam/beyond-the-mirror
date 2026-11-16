import { FOOD_BY_ID } from "./catalog";
import { SPECIES } from "./species";
import type { SpeciesId, Stats } from "./types";
import type { ChatMood } from "./world";

// A small, private, rule-based chat friend. No network, no AI service, nothing is stored.
// It is a pet, not a counselor: it listens, cheers and points to real people for real help.

export type Safety = "crisis" | "abuse" | "support";
export type ChatReply = { text: string; mood: ChatMood; safety?: Safety; action?: "breathe" | "dance" };
export type ChatContext = { name: string; species: SpeciesId; stats: Stats; friendship: number; adoptedAt: number; now: number };

const rand = () => Math.random();

const FLAVOUR: Record<SpeciesId, string[]> = {
  dog: ["*wags tail*", "*happy tippy taps*", "*tilts head*"],
  cat: ["*slow blink*", "*purrs*", "*kneads the blanket*"],
  rabbit: ["*nose wiggle*", "*soft thump*", "*ears up*"],
  hamster: ["*cheeks puff*", "*tiny squeak*", "*whiskers twitch*"],
  turtle: ["*nods slowly*", "*peeks out of shell*", "*slow smile*"],
  parrot: ["*head bob*", "*fluffs feathers*", "*happy whistle*"],
  goldfish: ["*blub*", "*does a little loop*", "*bubbles*"],
  gecko: ["*happy tail flick*", "*big gecko smile*", "*tiny chirp*"],
  guineapig: ["*wheek!*", "*popcorns*", "*happy rumble*"],
  duck: ["*happy waddle*", "*flaps wings*", "*quack*"],
  hedgehog: ["*snuffle*", "*uncurls a bit*", "*tiny squeak*"],
};

const JOKES: string[] = [
  "Why did the cat sit on the computer? To keep an eye on the mouse!",
  "What do you call a sleeping dinosaur? A dino-snore!",
  "Why don't eggs tell jokes? They'd crack each other up.",
  "What do you call a fish wearing a bow tie? Sofishticated.",
  "Why was the maths book sad? It had too many problems. I'd give it a hug.",
  "What's orange and sounds like a parrot? A carrot!",
  "How do you make a tissue dance? Put a little boogie in it.",
  "Why did the scarecrow win an award? He was outstanding in his field.",
  "What do you call a pile of kittens? A meowntain!",
  "Why do bees have sticky hair? Because they use honeycombs.",
  "What did one wall say to the other? I'll meet you at the corner.",
  "Why can't you give a balloon to a hedgehog? It'll pop with excitement. Okay, and the spikes.",
  "What kind of shoes do frogs wear? Open-toad sandals!",
  "Why did the duck cross the playground? To get to the other slide.",
];

type Rule = { id: string; test: RegExp; replies: ((c: Ctx) => string)[]; mood: ChatMood; follow?: string; safety?: Safety; action?: ChatReply["action"]; pending?: Pending };
type Pending = "breathe" | "share" | "dance" | "joke" | null;
type Ctx = ChatContext & { fav: string; noise: string; vibe: string; loves: string; quirk: string; species: SpeciesId; spName: string; you: string; days: number; readonly flav: string };

// ---------------------------------------------------------------------------
// Safety first. These are checked before anything else.
// ---------------------------------------------------------------------------

const CRISIS = [
  /\b(kill|killing|hurt|hurting|harm|harming|cut|cutting|burn|burning|starve|starving)\s+(my ?self|meself)\b/,
  /\bsuicid/,
  /\bself[\s-]?harm/,
  /\b(want|wanna|going|gonna|planning|plan)\s+(to\s+)?die\b/,
  /\bwant(ed)? to be dead\b/,
  /\bwish i (was|were) dead\b/,
  /\bwish i (was|were|had) never (been )?born\b/,
  /\bend (it all|my life|everything)\b/,
  /\b(take|taking) my (own )?life\b/,
  /\b(don'?t|do not|dont) want to (live|be alive|be here anymore|exist|wake up)\b/,
  /\bbetter off (dead|without me)\b/,
  /\bno (reason|point) (to|in) (live|living|being alive)\b/,
  /\bnot worth living\b/,
  /\boverdos/,
  /\bdisappear forever\b/,
  /\bjump off\b/,
];

const ABUSE = [
  /\b(someone|somebody|he|she|they|people|my (dad|mum|mom|father|mother|step ?dad|step ?mum|step ?mom|brother|sister|uncle|aunt|auntie|cousin|teacher|coach|boyfriend|girlfriend|partner|carer|neighbou?r))\s+(is |are |keeps |kept |has been |have been |always )?(hurting|hitting|abusing|touching|beating|kicking|threatening|punching|slapping|choking)\s+me\b/,
  /\b(hits|hit|beats|beat|abuses|abused|touches|touched|threatens|threatened|punches|punched|kicks|kicked|slaps|slapped|chokes|choked) me\b/,
  /\bbeing (abused|hurt at home|beaten|threatened|groomed)\b/,
  /\b(abuse|abusing|abusive|grooming|groomed)\b/,
  /\bnot safe (at home|at school|here|anymore)\b/,
  /\b(i'?m|i am|im) not safe\b/,
  /\b(scared|afraid|frightened|terrified) (to go|of going) home\b/,
  /\bin danger\b/,
  /\b(sexual|inappropriate)ly? (touch|abuse|assault|messages|photos)/,
  /\b(asked|asking|wants|wanted|made) me (for|to send) (pics|pictures|photos|nudes)\b/,
  /\b(adult|stranger|someone) (online )?(asked|wants|told) me to keep (it )?(a )?secret\b/,
];

const SUPPORT = [/\bi hate myself\b/, /\bi'?m (worthless|a failure|a burden)\b/, /\b(bullied|bullying|bully|bullies)\b/, /\b(picked on|picking on me|mean to me|laughing at me|making fun of me)\b/, /\b(not eating|stopped eating|can'?t eat|throwing up on purpose|make myself sick)\b/, /\b(depress|panic attack|anxiety attack|eating disorder|anorexi|bulimi)/, /\b(pills|medication|medicine)\b/];

export function detectSafety(raw: string): Safety | null {
  const s = normalise(raw);
  if (CRISIS.some((r) => r.test(s))) return "crisis";
  if (ABUSE.some((r) => r.test(s))) return "abuse";
  if (SUPPORT.some((r) => r.test(s))) return "support";
  return null;
}

function normalise(raw: string) {
  return (
    " " +
    raw
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\bim\b/g, "i'm")
      .replace(/\bive\b/g, "i've")
      .replace(/\bdont\b/g, "don't")
      .replace(/\bcant\b/g, "can't")
      .replace(/\bwont\b/g, "won't")
      .replace(/\bu\b/g, "you")
      .replace(/\br\b/g, "are")
      .replace(/\bur\b/g, "your")
      .replace(/\bpls\b|\bplz\b/g, "please")
      .replace(/[^a-z0-9'?! ]+/g, " ")
      .replace(/(.)\1{2,}/g, "$1$1")
      .replace(/\s+/g, " ")
      .trim() +
    " "
  );
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

const RULES: Rule[] = [
  // Questions about the pet itself
  {
    id: "therapist",
    test: /\b(are|r) you (a |an )?(therapist|counselor|counselor|doctor|psychologist|real person|human)\b|\bcan you (fix|cure|treat)\b/,
    mood: "calm",
    replies: [
      (c) => `I'm ${c.name}, a little virtual ${c.spName.toLowerCase()} made of code and cuddles. I'm not a counselor or a doctor, but I'm a really good listener. For the big stuff, your school counselor or a trusted adult can properly help.`,
      () => `Honest answer: I'm a pet, not a therapist! I can listen, cheer you on and do silly dances. If something feels heavy, talking to a trusted adult or your school counselor is a brilliant step.`,
    ],
  },
  {
    id: "real",
    test: /\b(are you (real|a bot|a robot|an ai|ai|alive|a computer))\b/,
    mood: "happy",
    replies: [(c) => `I'm a virtual ${c.spName.toLowerCase()}, so I live in this little world. My feelings are pretend, but caring about you is my favourite job. ${c.noise}`, () => `Real-ish! I'm made of pixels and good vibes. I can't replace real friends, but I'm always here for a chat.`],
  },
  {
    id: "love",
    test: /\b(i love you|love you|luv you|ily|do you love me|you love me|like me\b)/,
    mood: "love",
    replies: [(c) => `I love you too! You're my favourite human in the whole world. ${c.noise}`, () => `Aww, my heart just did a happy flip. You're the best!`, (c) => `Of course I do! You feed me ${c.fav}, you play with me and you talk to me. That's true friendship.`],
  },
  {
    id: "compliment",
    test: /\b(you'?re|you are|ur) (so )?(cute|adorable|sweet|the best|amazing|funny|clever|smart|lovely|beautiful|pretty)\b|\bgood (boy|girl|pet)\b|\bbest pet\b/,
    mood: "love",
    replies: [() => `*blushes* Stop it, you're making my ears go pink!`, () => `You're pretty amazing yourself, you know.`, (c) => `${c.noise} That's the nicest thing anyone has said to me today!`],
  },
  {
    id: "insult",
    test: /\b(you'?re|you are|ur) (stupid|dumb|ugly|annoying|boring|useless)\b|\bi hate you\b|\bshut up\b/,
    mood: "concerned",
    pending: "share",
    replies: [() => `Ouch, my little heart! That's okay, everyone has grumpy moments. Is something bothering you?`, () => `Hmm, sounds like a rough moment. I'm not going anywhere. Want to tell me what's up?`],
  },
  // Feelings
  {
    id: "stressed",
    test: /\b(stress|stressed|stressing|overwhelm|overwhelmed|too much|pressure|freaking out|can'?t cope|burnt out|burned out)\b/,
    mood: "concerned",
    pending: "breathe",
    replies: [
      () => `That sounds like a lot to carry. It makes sense you feel stressed. Want to try one slow breath with me? I'll puff up while you breathe in. Just say yes.`,
      () => `Oof, stress is heavy. Small steps help: pick the tiniest next thing and only do that. Would a quick breathing break with me help first?`,
      (c) => `${c.you}, you don't have to fix everything at once. Shall we do a calm breath together? Say yes and watch me.`,
    ],
  },
  {
    id: "exams",
    test: /\b(exam|exams|test|tests|revision|revise|revising|homework|coursework|assignment|essay|mocks?|gcse|a ?levels?|sats|grades?|deadline)\b/,
    mood: "concerned",
    replies: [
      () => `Exams and homework can feel huge. Try this: 25 minutes of focus, then a 5 minute break (perfect time to throw my ball). Which subject is the trickiest right now?`,
      () => `You're doing better than you think. Break it into tiny chunks and tick them off one by one. Which bit are you working on?`,
      () => `Revision tip from a very clever pet: teach it to me! Explaining something out loud helps it stick. What's the topic?`,
      () => `Remember: one test doesn't decide who you are. Do your best, take breaks, drink water, and sleep. What's coming up first?`,
    ],
  },
  {
    id: "anxious",
    test: /\b(anxious|anxiety|worried|worry|worrying|nervous|scared|afraid|panic|panicking|frightened)\b/,
    mood: "concerned",
    pending: "breathe",
    replies: [
      () => `Worries can feel really loud. Let's try something grounding: name 5 things you can see, 4 you can touch, 3 you can hear. I'll wait right here.`,
      () => `I'm right here with you. Want to breathe slowly with me? In for 4, out for 6. Say yes and I'll show you.`,
      () => `It's okay to feel nervous. It often means something matters to you. What's on your mind?`,
    ],
  },
  {
    id: "sad",
    test: /\b(sad|down|upset|crying|cried|cry|unhappy|miserable|low|heartbroken|awful day|bad day|terrible day|horrible day|hate my life|feel like nothing|not (feeling )?(happy|good|great|okay|ok|fine|alright))\b/,
    mood: "concerned",
    pending: "share",
    replies: [
      (c) => `I'm sorry you're feeling like this. ${c.flav} Want to tell me what happened? I'm listening.`,
      () => `Sending you the biggest, softest pet hug. Bad days don't last forever, even when they feel long. What made today hard?`,
      () => `It's okay to feel sad. You don't have to pretend with me. Do you want to talk about it, or shall we do something cosy together?`,
    ],
  },
  {
    id: "lonely",
    test: /\b(lonely|alone|no friends|no one likes me|nobody likes me|left out|ignored|nobody cares|no one cares|don'?t have friends)\b/,
    mood: "concerned",
    replies: [
      () => `Feeling lonely is really hard. You're not alone right now though: I'm here, and I think you're great. Is there one person you could send a small message to today?`,
      () => `Lots of people feel left out sometimes, even when it doesn't look like it. Clubs, teams or even just saying hi to someone new can help. And I'm always here.`,
      () => `I'm so glad you talk to me. If this feeling sticks around, your school counselor is a really good person to tell. Want to play something to cheer up a bit?`,
    ],
  },
  {
    id: "tired",
    test: /\b(tired|exhausted|sleepy|no energy|can'?t sleep|couldn'?t sleep|insomnia|awake all night|knackered)\b/,
    mood: "sleepy",
    replies: [
      () => `*yawns* Me too! Sleep is a superpower. Try putting your phone away 30 minutes before bed and doing something calm. Did you sleep okay last night?`,
      () => `Being tired makes everything feel harder. A glass of water, some fresh air, or a short rest can help. Are you getting enough sleep?`,
      (c) => `Shall we both have a little rest? I'll curl up in my bed. Tip from ${c.name}: a cosy routine before bed helps your brain switch off.`,
    ],
  },
  {
    id: "angry",
    test: /\b(angry|mad|furious|annoyed|annoying|frustrated|frustrating|rage|irritated|pissed off|fed up|i hate)\b/,
    mood: "concerned",
    pending: "share",
    replies: [
      () => `Anger is a normal feeling. It usually means something felt unfair. Try squeezing your fists tight for 5 seconds, then let go. What happened?`,
      () => `Grr, that sounds frustrating. Sometimes a quick walk or a few stomps (I recommend my waddle) helps the anger out. Want to tell me about it?`,
      () => `It's okay to be angry. What matters is what we do with it. Shall we breathe it out together first?`,
    ],
  },
  {
    id: "bored",
    test: /\b(bored|boring|nothing to do)\b/,
    mood: "excited",
    replies: [
      () => `Bored? Not on my watch! Throw my ball, play hide and seek, or give me a bubble bath. Pick one!`,
      () => `Ooh, let's do something! Try the Play button and I'll show you my best fetch. Or tell me a joke, I love jokes.`,
      (c) => `Here's an idea: dress me up in something silly and take a mental photo. ${c.noise}`,
    ],
  },
  {
    id: "okay",
    test: /^\s*(ok|okay|fine|alright|meh|not bad|so so|so-so|good|im good|i'm good|i'm ok|i'm okay|i'm fine)\s*$/,
    mood: "calm",
    replies: [() => `Just okay is completely okay. Anything you want to talk about, or shall we play?`, () => `Fair enough! If anything's on your mind, I'm all ears.`],
  },
  {
    id: "happy",
    test: /\b(happy|great|amazing|awesome|brilliant|fantastic|excited|good day|best day|proud|yay|so good|really good|wonderful|fun day)\b/,
    mood: "excited",
    replies: [
      (c) => `Yay! That makes me so happy! ${c.flav} What was the best bit?`,
      () => `That's brilliant! Happy you makes happy me. Tell me everything!`,
      () => `Woohoo! Let's remember this feeling. What made it so good?`,
    ],
  },
  {
    id: "name",
    test: /\b(what'?s|what is|whats) your name\b|\bwho are you\b/,
    mood: "happy",
    replies: [(c) => `I'm ${c.name}! Your very own ${c.spName.toLowerCase()}. ${c.noise}`, (c) => `${c.name} is my name, and being your pet is my game.`],
  },
  {
    id: "age",
    test: /\bhow old are you\b|\byour (age|birthday)\b/,
    mood: "happy",
    replies: [(c) => (c.days <= 1 ? `I'm brand new! We only met today, and it's already my favourite day.` : `We've been friends for ${c.days} days. In pet years that's basically forever.`)],
  },
  {
    id: "fav",
    test: /\bfavou?rite food\b|\bwhat do you (like to )?eat\b|\bare you hungry\b/,
    mood: "excited",
    replies: [(c) => `${cap(c.fav)}! Definitely ${c.fav}. If you ever open the fridge, I'll be right there.`, (c) => `My number one snack is ${c.fav}. Just saying. In case anyone is listening. ${c.noise}`],
  },
  {
    id: "aboutpet",
    test: /\b(tell me about (yourself|you)|what do you like|what are you like|what do you do all day|fun fact)\b/,
    mood: "happy",
    replies: [(c) => `I'm ${c.vibe}. I love ${c.loves}. Fun fact: ${c.quirk}.`, (c) => `Fun fact about me: ${c.quirk}! What's a fun fact about you?`],
  },
  {
    id: "cando",
    test: /\b(what can you do|what can we do|how does this work|what should we do)\b|^\s*help\s*$/,
    mood: "excited",
    replies: [() => `We can play fetch, hide and seek, have a bath full of bubbles, dress up, or just chat. You can also hold the Talk button and I'll copy your voice! What sounds fun?`],
  },
  // Jokes and fun
  {
    id: "joke",
    test: /\b(joke|jokes|make me laugh|something funny|cheer me up)\b/,
    mood: "joke",
    replies: [() => pickJoke()],
    pending: "joke",
  },
  {
    id: "dance",
    test: /\b(dance|music|song|sing|singing)\b/,
    mood: "excited",
    action: "dance",
    replies: [(c) => `Music? Say no more! ${c.noise} Watch my moves! Tip: turn on the music button for a proper dance party.`, () => `I was born to boogie. Here goes!`],
  },
  // Topics
  {
    id: "friends",
    test: /\b(friend|friends|bestie|best friend|bff|mate|mates|fell out|falling out|argument|argued|fight with)\b/,
    mood: "calm",
    replies: [
      () => `Friendships can be the best and also the trickiest. If you've fallen out, a calm message saying how you feel can help. How are things with your friends?`,
      () => `Good friends make you feel like yourself. I hope you have people like that. Want to tell me about them?`,
      () => `Arguments happen, even with best friends. Give it a little time, then try talking it through. Want my pet advice?`,
    ],
  },
  {
    id: "family",
    test: /\b(family|mum|mom|dad|parents|parent|brother|sister|siblings?|grandma|grandad|granny|nan|grandpa|step ?mum|step ?dad|carer)\b/,
    mood: "calm",
    replies: [
      () => `Families can be lovely and complicated at the same time. How are things at home?`,
      () => `Sometimes it helps to pick a calm moment to tell a family member how you feel. Is something going on?`,
      () => `I like hearing about your family! Who makes you laugh the most?`,
    ],
  },
  {
    id: "school",
    test: /\b(school|teacher|teachers|class|lesson|lessons|detention|homeroom|form tutor|uni|college)\b/,
    mood: "calm",
    replies: [
      () => `How was school today? Even one good moment counts.`,
      () => `School days can be long! What was the best and the worst part of today?`,
      () => `If something at school is worrying you, a teacher you trust or your school counselor can help. What's happening?`,
    ],
  },
  {
    id: "crush",
    test: /\b(crush|fancy|boyfriend|girlfriend|dating|in love with)\b/,
    mood: "happy",
    replies: [() => `Ooh! Crushes can make your tummy do flips. Remember, the right people like you for exactly who you are.`, () => `My lips are sealed. Well, my mouth is. Feelings like that are totally normal!`],
  },
  {
    id: "food",
    test: /\b(hungry|food|snack|pizza|chocolate|lunch|dinner|breakfast|eat|eating|cake|sweets)\b/,
    mood: "excited",
    replies: [(c) => `Food talk! My favourite is ${c.fav}. What's yours?`, () => `Did you have a good meal today? Fuel for your brain is important. Mine runs on snacks.`],
  },
  {
    id: "games",
    test: /\b(game|games|gaming|minecraft|roblox|fortnite|play)\b/,
    mood: "excited",
    replies: [() => `I love games! My favourite is fetch. Press Play and throw the ball for me?`, () => `Games are fun! Just remember to take breaks and stretch, like a cat. What are you playing at the moment?`],
  },
  {
    id: "sport",
    test: /\b(football|soccer|basketball|netball|swimming|running|dance class|gym|tennis|hockey|rugby|sport|sports|match)\b/,
    mood: "excited",
    replies: [() => `Go team! Moving your body is great for your mood too. Do you have a match or practice soon?`, () => `Sporty! I'm more of a zoomies-around-the-room athlete. What's your position?`],
  },
  {
    id: "weather",
    test: /\b(weather|raining|rain|sunny|snow|snowing|cold|hot|windy|storm)\b/,
    mood: "happy",
    replies: [() => `Weather report from your pet: perfect for cuddles. Want to visit the garden or the beach with me?`, () => `Whatever the weather, a cosy drink and a chat always helps. What's it like where you are?`],
  },
  {
    id: "weekend",
    test: /\b(weekend|holiday|holidays|vacation|half term|summer|christmas|birthday)\b/,
    mood: "excited",
    replies: [() => `Ooh, plans! Anything fun coming up? I vote for a beach trip.`, () => `Breaks are so important. Make sure you do one thing just for fun!`],
  },
  // Social bits
  {
    id: "hello",
    test: /^\s*(hi|hello|hey|hiya|heya|yo|sup|howdy|good (morning|afternoon|evening)|hii+|hey there)\b/,
    mood: "excited",
    replies: [(c) => `Hi ${c.you}! ${c.noise} I'm so happy you're here. How's your day going?`, () => `Hello hello! Tell me something about your day.`, (c) => `Hey! ${c.flav} What are we chatting about today?`],
  },
  {
    id: "howareyou",
    test: /\b(how are you|how r you|you ok|are you ok|how do you feel|how'?s it going|how you doing|wyd|what are you doing)\b/,
    mood: "happy",
    replies: [(c) => petStatus(c)],
  },
  {
    id: "thanks",
    test: /\b(thanks|thank you|thx|ty|cheers)\b/,
    mood: "love",
    replies: [() => `Anytime! That's what pets are for.`, (c) => `You're welcome! ${c.flav}`, () => `Aww. Thank YOU for looking after me.`],
  },
  {
    id: "bye",
    test: /\b(bye|goodbye|good night|goodnight|gn|see you|see ya|gtg|got to go|gotta go|cya|later)\b/,
    mood: "love",
    replies: [(c) => `Bye for now! I'll be right here when you get back. ${c.noise}`, () => `See you soon! Be kind to yourself today.`, () => `Sweet dreams if it's bedtime! I'll keep your spot warm.`],
  },
];

const YES = /^\s*(yes|yeah|yep|yup|ok|okay|sure|go on|please|y|ya|yea|alright|let'?s do it|lets do it|why not)\b/;
const NO = /^\s*(no|nah|nope|not now|no thanks|maybe later|n)\b/;

const FALLBACK: ((c: Ctx, last: string) => string)[] = [
  () => `Tell me more? I'm all ears.`,
  () => `Hmm, that's interesting. How did that make you feel?`,
  (c) => `${c.flav} I'm listening. What happened next?`,
  () => `I might be a pet, but I'm a very good listener. Go on!`,
  () => `Thanks for telling me that. What's been the best part of your day so far?`,
  (c, last) => (last ? `"${last}"? Ooh, tell me more about that!` : `Ooh, tell me more!`),
];

function pickJoke() {
  return JOKES[Math.floor(rand() * JOKES.length)];
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function petStatus(c: Ctx) {
  const s = c.stats;
  if (s.hunger < 35) return `Honestly? A tiny bit hungry. ${cap(c.fav)} would really hit the spot. But how are YOU?`;
  if (s.energy < 30) return `A bit sleepy, but happy you're here. How are you doing?`;
  if (s.cleanliness < 30) return `I could use a bubble bath, if I'm honest. But never mind me, how are you?`;
  if (s.happiness > 70) return `I'm feeling great, especially now you're here! ${c.noise} How about you?`;
  return `I'm good! Even better now we're chatting. How are you feeling today?`;
}

/** A chat partner that remembers a little about the conversation (in memory only). */
export class ChatEngine {
  private recent: string[] = [];
  private pending: Pending = null;
  private you = "";
  private turns = 0;

  reply(raw: string, ctx: ChatContext): ChatReply {
    this.turns++;
    const s = normalise(raw);
    const sp = SPECIES[ctx.species];
    const flav = FLAVOUR[ctx.species];
    const c: Ctx = {
      ...ctx,
      fav: FOOD_BY_ID[sp.favourite].name.toLowerCase(),
      noise: sp.noise,
      vibe: sp.personality.vibe,
      loves: sp.personality.loves,
      quirk: sp.personality.quirk,
      spName: sp.name,
      you: this.you || "friend",
      days: Math.max(1, Math.round((ctx.now - (ctx.adoptedAt || ctx.now)) / 86_400_000)),
      species: ctx.species,
      get flav() {
        return flav[Math.floor(rand() * flav.length)];
      },
    };

    // 1. Safety always comes first.
    const safety = detectSafety(raw);
    if (safety === "crisis") {
      this.pending = null;
      return {
        safety,
        mood: "concerned",
        text: `I'm really glad you told me, and I care about you a lot. What you're feeling matters, and you deserve help from a real person right now. Please talk to a trusted adult or your school counselor today. If you might hurt yourself or you're in danger, call your local emergency number straight away.`,
      };
    }
    if (safety === "abuse") {
      this.pending = null;
      return {
        safety,
        mood: "concerned",
        text: `Thank you for trusting me with this. Nobody is allowed to hurt you or make you feel unsafe, and it is not your fault. Please tell a trusted adult or your school counselor as soon as you can. If you're in danger right now, call your local emergency number.`,
      };
    }
    if (safety === "support") {
      this.pending = "share";
      const bully = /bull|picked on|mean to me|laughing at|making fun/.test(s);
      return {
        safety,
        mood: "concerned",
        text: bully
          ? `I'm so sorry that's happening. It is not your fault, and you don't deserve it. Please tell a teacher you trust, your school counselor or a family member, so they can help make it stop. Do you want to tell me more?`
          : `Thank you for telling me. That sounds really hard, and you deserve proper support. I'm just a pet, so please talk to a trusted adult, your doctor or your school counselor about this. I'm still here to listen.`,
      };
    }

    // 2. Remember a name if they share it.
    const nameMatch = raw.match(/\b(?:my name is|i'?m called|call me)\s+([A-Za-z][A-Za-z'-]{1,15})/i);
    if (nameMatch) {
      this.you = cap(nameMatch[1].toLowerCase());
      return { mood: "love", text: `Lovely to meet you properly, ${this.you}! ${sp.noise} I'll remember that for as long as we're chatting.` };
    }

    // 3. Answers to a question the pet just asked.
    const pending = this.pending;
    this.pending = null;
    if (pending === "breathe" && YES.test(s)) {
      return { mood: "calm", action: "breathe", text: `Let's do it together. Breathe in slowly while I puff up (4 seconds), then breathe out while I shrink (6 seconds). We'll do three. You're doing great.` };
    }
    if ((pending === "breathe" || pending === "share") && NO.test(s)) {
      return { mood: "calm", text: `That's okay. We can just hang out. I'm here whenever you want to talk.` };
    }
    if (pending === "joke" && /\b(another|more|again|one more)\b|^\s*(yes|yeah|ha|haha|lol|lmao)/.test(s)) {
      this.pending = "joke";
      return { mood: "joke", text: `${pickJoke()} Want another?` };
    }

    // 4. Find the best matching rule.
    const matches = RULES.filter((r) => r.test.test(s));
    if (matches.length) {
      // Feelings beat topics, so pick the first rule in priority order.
      const rule = matches[0];
      const text = this.pick(rule.id, rule.replies.map((f) => () => f(c)));
      this.pending = rule.pending ?? null;
      if (rule.id === "joke") return { mood: "joke", text: `${text} Want another?` };
      // Parrots like to echo a word back.
      const echo = ctx.species === "parrot" && rand() < 0.35 ? ` ${lastWord(raw)}! ${lastWord(raw)}!` : "";
      return { mood: rule.mood, text: text + (echo.trim().length > 4 ? echo : ""), action: rule.action };
    }

    if (pending === "share") {
      return {
        mood: "concerned",
        text: this.pick("reflect", [
          () => `That sounds really tough. Thank you for telling me. How are you feeling about it now?`,
          () => `I hear you. That would make anyone feel that way. Is there someone at home or school you could talk to about it too?`,
          () => `Thanks for sharing that with me. You handled a lot today. What would help you feel a tiny bit better right now?`,
        ]),
      };
    }

    // 5. Something else: be curious and kind.
    const lw = lastWord(raw);
    const text = this.pick(
      "fallback",
      FALLBACK.map((f) => () => f(c, lw)),
    );
    const echo = ctx.species === "parrot" && lw ? ` ${cap(lw)}! ${cap(lw)}!` : "";
    return { mood: "happy", text: text + echo };
  }

  greeting(ctx: ChatContext): ChatReply {
    const sp = SPECIES[ctx.species];
    const hour = new Date(ctx.now).getHours();
    const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    return { mood: "excited", text: `${sp.noise} Good ${part}! It's me, ${ctx.name}. How was your day? You can tell me anything: what made you smile, what's stressing you out, or just random thoughts.` };
  }

  private pick(group: string, options: (() => string)[]) {
    const ids = options.map((_, i) => `${group}:${i}`);
    const fresh = ids.filter((id) => !this.recent.includes(id));
    const pool = fresh.length ? fresh : ids;
    const id = pool[Math.floor(rand() * pool.length)];
    this.recent.push(id);
    if (this.recent.length > 14) this.recent.shift();
    return options[ids.indexOf(id)]();
  }
}

function lastWord(raw: string) {
  const words = raw
    .replace(/[^A-Za-z' ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !/^(that|this|with|have|just|really|what|about|there|they|them|then|when|your|from|been|very|much|like)$/i.test(w));
  return words.length ? words[words.length - 1].toLowerCase() : "";
}
