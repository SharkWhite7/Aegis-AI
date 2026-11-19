import BootSequence from "@/components/boot/BootSequence";
import Hero from "@/components/sections/Hero";
import Premise from "@/components/sections/Premise";
import CoPilot from "@/components/sections/CoPilot";
import YourGame from "@/components/sections/YourGame";
import Missions from "@/components/sections/Missions";
import Audio from "@/components/sections/Audio";

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
    </>
  );
}
