import BootSequence from "@/components/boot/BootSequence";
import Hero from "@/components/sections/Hero";
import Premise from "@/components/sections/Premise";
import CoPilot from "@/components/sections/CoPilot";
import YourGame from "@/components/sections/YourGame";
import Missions from "@/components/sections/Missions";
import Audio from "@/components/sections/Audio";
import Memory from "@/components/sections/Memory";
import Market from "@/components/sections/Market";
import Access from "@/components/sections/Access";

export default function Page() {
  return (
    <>
      {/* Rendered first so its effect claims the boot gate before Hero waits on it. */}
      <BootSequence />
      <Hero />
      <Premise />
      <CoPilot />
      <YourGame />
      <Missions />
      <Audio />
      <Memory />
      <Market />
      <Access />
    </>
  );
}
