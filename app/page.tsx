import BootSequence from "@/components/boot/BootSequence";
import Hero from "@/components/sections/Hero";
import Premise from "@/components/sections/Premise";
import CoPilot from "@/components/sections/CoPilot";
import YourGame from "@/components/sections/YourGame";

export default function Page() {
  return (
    <>
      {/* Rendered first so its effect claims the boot gate before Hero waits on it. */}
      <BootSequence />
      <Hero />
      <Premise />
      <CoPilot />
      <YourGame />
    </>
  );
}
