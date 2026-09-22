"use client";
import { ErrorState } from "@/components/ui/ErrorState";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <ErrorState section="the page builder" error={error} reset={reset} />; }
