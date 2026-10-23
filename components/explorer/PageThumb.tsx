/**
 * A drawn miniature of a page, laid out per template so the list reads at a glance — a product
 * page looks like a product page, a rates page like a rates page. Ported from hsbc-ucpmock's
 * `src/lib/components/pages/page-thumb.svelte`, which replaces the file icon in every view.
 *
 * Two things carried over deliberately. It is always a white page with neutral greys, in both
 * themes, because that is what a screenshot of the real page would look like. And the sizes are
 * percentages, so the same drawing works at `h-9 w-12` in a table row and at `aspect-[16/10]`
 * filling a card.
 *
 * One divergence: theirs fills the image areas with a real photo through `photoSrc(photo)`. There
 * is no photo service in this prototype, so those areas are flat neutral blocks — at 48×36 in a
 * table row the shape is what reads, not the picture.
 */
const TONE = { dark: "bg-neutral-800", mid: "bg-neutral-400", light: "bg-neutral-200" } as const;

function Line({ w, tone = "light", h = "2px" }: { w: string; tone?: keyof typeof TONE; h?: string }) {
  return <span className={`block shrink-0 ${TONE[tone]}`} style={{ width: w, height: h }} />;
}

/** An image area. Flat, for the reason in the note above. */
function Pic({ className = "" }: { className?: string }) {
  return <span className={`block bg-neutral-200 ${className}`} />;
}

function Cta({ w = "22%" }: { w?: string }) {
  return <span className="block shrink-0 bg-brand" style={{ width: w, height: "6px" }} />;
}

/** The site chrome every page template carries: logo, a couple of nav items, utilities. */
function Chrome() {
  return (
    <div className="flex h-[9%] shrink-0 items-center gap-1 border-b border-neutral-200 px-[4%]">
      <span className="size-[6%] max-h-2 max-w-2 bg-brand" />
      <Line w="14%" tone="mid" />
      <span className="ms-auto" />
      <Line w="8%" tone="mid" />
      <Line w="8%" tone="mid" />
    </div>
  );
}

const ROWS = [0, 1, 2, 3, 4];

function Body({ template }: { template: string }) {
  switch (template) {
    case "product":
      return (
        <>
          <div className="flex h-[22%] shrink-0 items-center gap-[4%] border-b border-neutral-200 bg-neutral-50 px-[4%]">
            <div className="flex w-[55%] flex-col gap-[5%]"><Line w="80%" tone="dark" h="3px" /><Line w="55%" /><Cta w="30%" /></div>
            <Pic className="h-[70%] flex-1" />
          </div>
          <div className="flex flex-1 gap-[4%] px-[4%] pt-[4%]">
            <div className="flex flex-[2] flex-col gap-[3%]">
              <Line w="35%" tone="mid" h="3px" />
              {ROWS.map((i) => (
                <div key={i} className="flex items-center justify-between border-b border-neutral-200 py-[2%]"><Line w="40%" /><Line w="14%" tone="mid" /></div>
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-[6%] border border-neutral-200 p-[4%]"><Line w="60%" tone="mid" h="3px" /><Line w="90%" /><Line w="85%" /><Line w="70%" /></div>
          </div>
        </>
      );

    case "rates":
      return (
        <>
          <div className="flex flex-col gap-[3%] px-[4%] pt-[4%]"><Line w="40%" tone="dark" h="4px" /><Line w="65%" /></div>
          <div className="mx-[4%] mt-[4%] flex flex-col border border-neutral-200">
            <div className="grid grid-cols-3 gap-[3%] border-b border-neutral-200 bg-neutral-100 p-[3%]"><Line w="60%" tone="dark" h="3px" /><Line w="50%" tone="dark" h="3px" /><Line w="50%" tone="dark" h="3px" /></div>
            {ROWS.slice(0, 4).map((r) => (
              <div key={r} className="grid grid-cols-3 gap-[3%] border-b border-neutral-100 p-[3%]"><Line w="75%" /><Line w="30%" tone="mid" /><Line w="30%" tone="mid" /></div>
            ))}
          </div>
          <div className="flex flex-1 flex-col px-[4%] pt-[3%]">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center justify-between border-b border-neutral-200 py-[3%]"><Line w="55%" tone="mid" /><span className="block size-[5px] rotate-45 border-e border-b border-neutral-400" /></div>
            ))}
          </div>
        </>
      );

    case "hub":
      return (
        <>
          <div className="flex flex-col gap-[3%] px-[4%] pt-[4%]"><Line w="45%" tone="dark" h="4px" /><Line w="70%" /></div>
          <div className="grid flex-1 grid-cols-3 gap-[3%] px-[4%] pt-[4%]">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col gap-[5%] border border-neutral-200">
                <Pic className="h-[55%] w-full" />
                <div className="flex flex-col gap-[6%] p-[6%]"><Line w="60%" tone="mid" h="3px" /><Line w="85%" /></div>
              </div>
            ))}
          </div>
          <div className="mx-[4%] my-[3%] flex h-[8%] shrink-0 items-center justify-between bg-brand/10 px-[3%]"><Line w="40%" tone="dark" /><Cta w="12%" /></div>
        </>
      );

    case "campaign":
      return (
        <>
          <div className="relative h-[62%] shrink-0 overflow-hidden">
            <Pic className="absolute inset-0" />
            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute inset-x-[10%] top-[18%] flex flex-col items-center gap-[4%]">
              <span className="block h-[5px] w-[70%] bg-white" />
              <span className="block h-[5px] w-[45%] bg-white" />
              <span className="mt-[3%] block h-[8px] w-[34%] bg-brand" />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-[3%] px-[4%] pt-[4%]"><Line w="30%" tone="mid" /><Line w="100%" /><Line w="92%" /><Line w="60%" /></div>
        </>
      );

    /* blank, and anything whose template we do not recognise: an empty page, not a broken one */
    default:
      return (
        <div className="flex flex-1 flex-col gap-[4%] px-[4%] pt-[6%]">
          <Line w="40%" tone="mid" h="3px" />
          <Line w="85%" />
          <Line w="70%" />
        </div>
      );
  }
}

export function PageThumb({ template = "blank", className = "" }: { template?: string; className?: string }) {
  return (
    <div className={`relative flex flex-col overflow-hidden bg-white text-neutral-300 ${className}`} aria-hidden>
      <Chrome />
      <Body template={template} />
    </div>
  );
}
