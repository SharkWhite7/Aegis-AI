import BootSequence from "@/components/boot/BootSequence";
import Book, { type Leaf } from "@/components/book/Book";
import { Cover, Live } from "@/components/book/pages/Opening";
import { PremiseStatement, Record } from "@/components/book/pages/PremisePages";
import { Ask, Answers } from "@/components/book/pages/VoicePages";
import { AnyTitle, Stays } from "@/components/book/pages/GamePages";
import { Brief, Ledger, Audio, Memory } from "@/components/book/pages/SessionPages";
import { Sheet, Price } from "@/components/book/pages/MarketPages";
import Access from "@/components/book/pages/AccessPage";

/**
 * Fifteen leaves, one idea each. The chapter ids match the index overlay's
 * hrefs, so a link from the index lands on that chapter's first leaf.
 */
const LEAVES: Leaf[] = [
  { id: "cover", n: "00", label: "Companion", node: <Cover /> },
  { id: "live", n: "00", label: "A night, live", node: <Live /> },
  { id: "premise", n: "01", label: "Premise", node: <PremiseStatement /> },
  { id: "record", n: "01", label: "Premise — the record", node: <Record /> },
  { id: "co-pilot", n: "02", label: "Co-Pilot", node: <Ask /> },
  { id: "answers", n: "02", label: "Co-Pilot — six answers", node: <Answers /> },
  { id: "your-game", n: "03", label: "Your Game", node: <AnyTitle /> },
  { id: "stays", n: "03", label: "Your Game — where it runs", node: <Stays /> },
  { id: "session", n: "04", label: "The session — missions", node: <Brief /> },
  { id: "ledger", n: "04", label: "The session — ledger", node: <Ledger /> },
  { id: "audio", n: "04", label: "The session — audio", node: <Audio /> },
  { id: "memory", n: "04", label: "The session — memory", node: <Memory /> },
  { id: "market", n: "05", label: "Marketplace", node: <Sheet /> },
  { id: "price", n: "05", label: "Marketplace — price", node: <Price /> },
  { id: "access", n: "06", label: "Access", node: <Access /> },
];

export default function Page() {
  return (
    <>
      {/* Rendered first so its effect claims the boot gate before anything waits on it. */}
      <BootSequence />
      <Book leaves={LEAVES} />
    </>
  );
}
