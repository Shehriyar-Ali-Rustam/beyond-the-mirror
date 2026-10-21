import type { StaticImageData } from "next/image";
import feelings from "@/assets/photos/feelings.jpg";
import untangle from "@/assets/photos/untangle.jpg";
import reset from "@/assets/photos/reset.jpg";
import exams from "@/assets/photos/exams.jpg";
import sayIt from "@/assets/photos/say-it.jpg";
import situations from "@/assets/photos/situations.jpg";
import letters from "@/assets/photos/letters.jpg";
import sunrisePerson from "@/assets/photos/sunrise-person.jpg";
import writing from "@/assets/photos/writing.jpg";
import conversation from "@/assets/photos/conversation.jpg";
import friendsBench from "@/assets/photos/friends-bench.jpg";
import heartHands from "@/assets/photos/heart-hands.jpg";
import meditationSea from "@/assets/photos/meditation-sea.jpg";
import plantsWindow from "@/assets/photos/plants-window.jpg";
import books from "@/assets/photos/books.jpg";
import friendsLaughing from "@/assets/photos/friends-laughing.jpg";
import cafe from "@/assets/photos/cafe.jpg";
import reading from "@/assets/photos/reading.jpg";

/**
 * Photography (CC0 from StockSnap via Openverse). Every image has a real
 * description so screen-reader users get the same context.
 */
export const PHOTOS = {
  feelings: { src: feelings, alt: "A palette of bright watercolour paints" },
  untangle: { src: untangle, alt: "Someone writing in a notebook next to a cup of coffee" },
  reset: { src: reset, alt: "Soft morning light over layers of misty mountains" },
  exams: { src: exams, alt: "A student working at a desk with a notebook and books" },
  "say-it": { src: sayIt, alt: "Two friends laughing together outdoors" },
  situations: { src: situations, alt: "A group of friends hugging at sunset" },
  letters: { src: letters, alt: "A handwritten letter tied with a ribbon" },
  sunrisePerson: { src: sunrisePerson, alt: "A person watching the sun rise over the hills" },
  writing: { src: writing, alt: "A student writing notes with a laptop on their lap" },
  conversation: { src: conversation, alt: "Two people talking at a table by a bright window" },
  friendsBench: { src: friendsBench, alt: "Three friends sharing a laugh on a bench" },
  heartHands: { src: heartHands, alt: "Hands making a heart shape over the sea" },
  meditationSea: { src: meditationSea, alt: "Someone sitting calmly by the sea" },
  plantsWindow: { src: plantsWindow, alt: "Potted plants and flowers on a sunny windowsill" },
  books: { src: books, alt: "Open books on a table in front of a bookshelf" },
  friendsLaughing: { src: friendsLaughing, alt: "Friends laughing together in warm evening light" },
  cafe: { src: cafe, alt: "A warm drink on a table in a quiet café" },
  reading: { src: reading, alt: "Two people relaxing and reading books" },
} satisfies Record<string, { src: StaticImageData; alt: string }>;

export type PhotoName = keyof typeof PHOTOS;
