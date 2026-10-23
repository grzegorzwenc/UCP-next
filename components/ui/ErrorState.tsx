"use client";
import Link from "next/link";
import { useParams } from "next/navigation";

type Props = { section: string; error: Error & { digest?: string; requestId?: string }; reset: () => void };

/** Route-level error boundary body: what broke, the request id when we have one, and two ways out. */
export function ErrorState({ section, error, reset }: Props) {
  const params = useParams<{ market?: string; env?: string }>();
  const dash = `/${params?.market ?? "uk"}/${params?.env ?? "prod"}/dashboard`;
  const requestId = error.requestId ?? (error.message.match(/request ([A-Za-z0-9-]+)/)?.[1]) ?? error.digest;
  return (
    <div className="p-4 md:p-7">
      <div role="alert" className="max-w-[640px] mx-auto mt-10 bg-surface border border-line rounded-xl p-8">
        <div className="w-10 h-10 rounded-full bg-crit-soft text-crit grid place-items-center text-lg font-bold mb-4" aria-hidden="true">!</div>
        <h1 className="text-xl font-medium">Something went wrong loading {section}</h1>
        <p className="text-sm text-ink-2 mt-2 break-words">{error.message || "The page could not be loaded."}</p>
        {requestId && <p className="text-xs text-ink-3 mt-2">Request id <span className="text-ink-2">{requestId}</span> · quote it if you contact support.</p>}
        <div className="flex gap-2 mt-6"><button className="btn btn-sm btn-primary" onClick={reset}>Try again</button><Link href={dash} className="btn btn-sm btn-secondary">Go to dashboard</Link></div>
      </div>
    </div>
  );
}
