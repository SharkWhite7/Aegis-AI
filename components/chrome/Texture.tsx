/** Grain + vignette. Inert, fixed, sits above every section. */
export default function Texture() {
  return (
    <>
      <div className="tex-vignette" aria-hidden />
      <div className="tex-grain" aria-hidden />
    </>
  );
}
