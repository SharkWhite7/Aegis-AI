/**
 * Section 07's content.
 *
 * Memory has no single artefact — it is not a document, a card or a
 * brief. What it has is a shape: it compounds. So the section shows one
 * thread at four points in time and lets the entries grow down the page.
 * The argument is not "we store data", it is "session one is almost
 * useless and the hundredth is not", which is the honest case for it.
 */
export type Entry = { session: string; text: string };

export const THREAD: Entry[] = [
  {
    session: "001",
    text: "It asks what you want to do tonight, because it has nothing else to go on.",
  },
  {
    session: "014",
    text: "It stops asking. You take the causeway, you drive at night, you have not drawn a weapon in four sessions. It noticed without being told to.",
  },
  {
    session: "047",
    text: "You say you have two hours. It remembers that you said two hours last thursday and logged off at four, and it says so, which is not the same as nagging but is close enough that you notice.",
  },
  {
    session: "112",
    text: "It knows the difference between a bad week and a quiet one. It knows which one you are having before you tell it, and on the bad ones it talks less, puts something long on, and leaves the mission brief until you ask for it.",
  },
];
