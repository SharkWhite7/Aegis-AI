import BootSequence from "@/components/boot/BootSequence";
import Hero from "@/components/sections/Hero";
import CoPilot from "@/components/sections/CoPilot";
import Missions from "@/components/sections/Missions";
import Audio from "@/components/sections/Audio";
import Memory from "@/components/sections/Memory";
import Market from "@/components/sections/Market";
import Access from "@/components/sections/Access";
import Footer from "@/components/chrome/Footer";

export default function Page() {
  return (
    <>
      {/* Rendered first so its effect claims the boot gate before Hero waits on it. */}
      <BootSequence />
      <Hero />
      <CoPilot />
      <Missions />
      <Audio />
      <Memory />
      <Market />
      <Access />
      <Footer />
    </>
  );
}
