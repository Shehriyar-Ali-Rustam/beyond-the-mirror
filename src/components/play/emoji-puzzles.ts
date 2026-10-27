export type EmojiCategory = "movies" | "foods" | "animals" | "phrases";
export type EmojiLevel = "easy" | "medium" | "hard";

export type EmojiPuzzle = { id: string; emoji: string; answer: string; alts?: string[]; category: EmojiCategory; level: EmojiLevel; hint: string };

export const EMOJI_CATEGORIES: { id: EmojiCategory; label: string; emoji: string }[] = [
  { id: "movies", label: "Movies", emoji: "🎬" },
  { id: "foods", label: "Foods", emoji: "🍲" },
  { id: "animals", label: "Animals", emoji: "🐾" },
  { id: "phrases", label: "Phrases", emoji: "💬" },
];

export const EMOJI_LEVELS: { id: EmojiLevel; label: string; points: number; color: string }[] = [
  { id: "easy", label: "Easy", points: 10, color: "#1f8a6b" },
  { id: "medium", label: "Medium", points: 20, color: "#a26a00" },
  { id: "hard", label: "Hard", points: 30, color: "#cc4f38" },
];

export const EMOJI_PUZZLES: EmojiPuzzle[] = [
  // Movies
  { id: "m1", emoji: "🦁👑", answer: "The Lion King", category: "movies", level: "easy", hint: "Hakuna matata" },
  { id: "m2", emoji: "❄️👸⛄", answer: "Frozen", category: "movies", level: "easy", hint: "Let it go" },
  { id: "m3", emoji: "🧸🤠🚀", answer: "Toy Story", category: "movies", level: "easy", hint: "To infinity and beyond" },
  { id: "m4", emoji: "🐠🔍", answer: "Finding Nemo", category: "movies", level: "easy", hint: "Just keep swimming" },
  { id: "m5", emoji: "🐼🥋", answer: "Kung Fu Panda", category: "movies", level: "medium", hint: "The Dragon Warrior" },
  { id: "m6", emoji: "🏠🎈👴", answer: "Up", category: "movies", level: "medium", hint: "A flying house" },
  { id: "m7", emoji: "🐀👨‍🍳", answer: "Ratatouille", category: "movies", level: "medium", hint: "Anyone can cook" },
  { id: "m8", emoji: "🕷️🧑", answer: "Spider-Man", alts: ["spider man"], category: "movies", level: "medium", hint: "Your friendly neighbourhood hero" },
  { id: "m9", emoji: "🤖🌱🗑️", answer: "WALL-E", alts: ["wall e"], category: "movies", level: "hard", hint: "A lonely robot cleaning up Earth" },
  { id: "m10", emoji: "🦖🏝️", answer: "Jurassic Park", alts: ["jurassic world"], category: "movies", level: "hard", hint: "Life finds a way" },
  { id: "m11", emoji: "🚢🧊💔", answer: "Titanic", category: "movies", level: "hard", hint: "I'm the king of the world" },
  { id: "m12", emoji: "🧞‍♂️🪔🐒", answer: "Aladdin", category: "movies", level: "hard", hint: "Three wishes" },

  // Foods
  { id: "f1", emoji: "🍔🍟", answer: "Burger and fries", alts: ["burger", "burger fries", "burger and chips", "fast food"], category: "foods", level: "easy", hint: "A fast-food combo" },
  { id: "f2", emoji: "🥞🍯", answer: "Pancakes", alts: ["pancake", "pancakes with honey"], category: "foods", level: "easy", hint: "Flat, round and stacked" },
  { id: "f3", emoji: "🍫🍦", answer: "Chocolate ice cream", alts: ["ice cream", "chocolate icecream"], category: "foods", level: "easy", hint: "A cold, sweet treat" },
  { id: "f4", emoji: "🥭🥤", answer: "Mango shake", alts: ["mango lassi", "mango smoothie", "mango juice", "mango milkshake"], category: "foods", level: "easy", hint: "The best summer drink" },
  { id: "f5", emoji: "🍚🍗🌶️", answer: "Biryani", alts: ["chicken biryani", "biriyani", "biryani rice"], category: "foods", level: "medium", hint: "Spicy rice for special days" },
  { id: "f6", emoji: "🥔🔺", answer: "Samosa", alts: ["samosas", "aloo samosa"], category: "foods", level: "medium", hint: "A triangle snack at iftar" },
  { id: "f7", emoji: "🫖🥛", answer: "Chai", alts: ["tea", "milk tea", "doodh patti", "chai tea"], category: "foods", level: "medium", hint: "The answer to every problem" },
  { id: "f8", emoji: "🍝🍅", answer: "Spaghetti", alts: ["pasta", "spaghetti bolognese", "tomato pasta"], category: "foods", level: "medium", hint: "Long noodles from Italy" },
  { id: "f9", emoji: "🍢🔥", answer: "Seekh kebab", alts: ["kebab", "kabab", "seekh kabab", "bbq", "barbecue", "kebabs"], category: "foods", level: "hard", hint: "Grilled on a skewer" },
  { id: "f10", emoji: "🥕🍮", answer: "Gajar ka halwa", alts: ["gajar halwa", "carrot halwa", "carrot pudding", "halwa"], category: "foods", level: "hard", hint: "A winter dessert" },
  { id: "f11", emoji: "🧀🍞🔥", answer: "Grilled cheese", alts: ["cheese toast", "cheese sandwich", "toasted cheese", "grilled cheese sandwich"], category: "foods", level: "hard", hint: "Melty and crispy" },
  { id: "f12", emoji: "🍉🧊🥤", answer: "Watermelon juice", alts: ["watermelon slush", "watermelon smoothie", "watermelon drink", "watermelon shake"], category: "foods", level: "hard", hint: "Cool, pink and refreshing" },

  // Animals
  { id: "a1", emoji: "⭐🐟", answer: "Starfish", alts: ["star fish"], category: "animals", level: "easy", hint: "Lives in the sea, shaped like the sky" },
  { id: "a2", emoji: "🌊🐴", answer: "Seahorse", alts: ["sea horse"], category: "animals", level: "easy", hint: "The dads carry the babies" },
  { id: "a3", emoji: "🐱🐟", answer: "Catfish", alts: ["cat fish"], category: "animals", level: "easy", hint: "A fish with whiskers" },
  { id: "a4", emoji: "❄️🐻", answer: "Polar bear", alts: ["snow bear", "white bear"], category: "animals", level: "easy", hint: "Lives in the Arctic" },
  { id: "a5", emoji: "🧈🪰", answer: "Butterfly", alts: ["butter fly"], category: "animals", level: "medium", hint: "Starts life as a caterpillar" },
  { id: "a6", emoji: "🐉🪰", answer: "Dragonfly", alts: ["dragon fly"], category: "animals", level: "medium", hint: "Zooms over ponds" },
  { id: "a7", emoji: "🌧️🦌", answer: "Reindeer", alts: ["rain deer"], category: "animals", level: "medium", hint: "Lives in snowy places, has antlers" },
  { id: "a8", emoji: "🐜🍽️", answer: "Anteater", alts: ["ant eater"], category: "animals", level: "medium", hint: "A very long tongue" },
  { id: "a9", emoji: "🔨🦈", answer: "Hammerhead shark", alts: ["hammerhead", "hammer shark"], category: "animals", level: "hard", hint: "A strangely shaped head" },
  { id: "a10", emoji: "🗡️🐟", answer: "Swordfish", alts: ["sword fish"], category: "animals", level: "hard", hint: "One of the fastest fish" },
  { id: "a11", emoji: "🍯🦡", answer: "Honey badger", alts: ["honeybadger", "badger"], category: "animals", level: "hard", hint: "Small but fearless" },
  { id: "a12", emoji: "🦎🌈", answer: "Chameleon", alts: ["chamelion", "camelion"], category: "animals", level: "hard", hint: "Changes colour" },

  // Phrases
  { id: "p1", emoji: "🍰👌", answer: "Piece of cake", alts: ["a piece of cake", "easy peasy"], category: "phrases", level: "easy", hint: "Something really easy" },
  { id: "p2", emoji: "⏰💰", answer: "Time is money", category: "phrases", level: "easy", hint: "Don't waste it" },
  { id: "p3", emoji: "🌧️🐱🐶", answer: "Raining cats and dogs", alts: ["its raining cats and dogs", "cats and dogs"], category: "phrases", level: "easy", hint: "Heavy rain" },
  { id: "p4", emoji: "🧊🔨", answer: "Break the ice", alts: ["breaking the ice", "ice breaker", "icebreaker"], category: "phrases", level: "easy", hint: "Start a conversation with someone new" },
  { id: "p5", emoji: "☁️9️⃣", answer: "Cloud nine", alts: ["on cloud nine", "on cloud 9", "cloud 9"], category: "phrases", level: "medium", hint: "Extremely happy" },
  { id: "p6", emoji: "🐘🚪", answer: "Elephant in the room", category: "phrases", level: "medium", hint: "An obvious problem nobody mentions" },
  { id: "p7", emoji: "🦋🫃", answer: "Butterflies in my stomach", alts: ["butterflies in your stomach", "butterflies in stomach", "butterflies in the stomach", "butterflies"], category: "phrases", level: "medium", hint: "Nervous before something big" },
  { id: "p8", emoji: "🧠⛈️", answer: "Brainstorm", alts: ["brain storm", "brainstorming"], category: "phrases", level: "medium", hint: "Coming up with lots of ideas" },
  { id: "p9", emoji: "1️⃣🌙🔵", answer: "Once in a blue moon", alts: ["blue moon"], category: "phrases", level: "hard", hint: "Very rarely" },
  { id: "p10", emoji: "🐢🏆", answer: "Slow and steady wins the race", alts: ["slow and steady"], category: "phrases", level: "hard", hint: "Patience pays off" },
  { id: "p11", emoji: "🍋➡️🍹", answer: "When life gives you lemons", alts: ["when life gives you lemons make lemonade", "make lemonade", "lemonade"], category: "phrases", level: "hard", hint: "Make the best of a bad situation" },
  { id: "p12", emoji: "🥚🥚🧺", answer: "Don't put all your eggs in one basket", alts: ["all your eggs in one basket", "eggs in one basket", "all eggs in one basket"], category: "phrases", level: "hard", hint: "Don't risk everything on one thing" },
];
