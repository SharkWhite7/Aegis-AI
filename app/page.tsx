import BootSequence from "@/components/boot/BootSequence";
import Hero from "@/components/sections/Hero";

export default function Page() {
  return (
    <>
      {/* Rendered first so its effect claims the boot gate before Hero waits on it. */}
      <BootSequence />
      <Hero />
    </>
  );
}
