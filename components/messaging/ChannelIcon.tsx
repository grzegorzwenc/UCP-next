import { Mail, MessageSquareText, BellRing, PanelTop } from "lucide-react";
import type { Channel } from "@/lib/messaging/model";
import { CHANNEL_LABEL } from "@/lib/blocks/registry";

const ICON = { email: Mail, sms: MessageSquareText, push: BellRing, inapp: PanelTop } as const;
export function ChannelIcon({ channel, className = "w-4.5 h-4.5" }: { channel: Channel; className?: string }) { const I = ICON[channel]; return <I className={className} aria-hidden />; }

/** Per-type colours, so a list of messages reads at a glance: blue e-mail, violet pop-up/push, green SMS, amber in-app. */
const BADGE: Record<Channel, string> = {
  email: "bg-[#1d4ed8]/10 text-[#1e40af] border-[#1d4ed8]/25",
  push: "bg-[#7c3aed]/10 text-[#5b21b6] border-[#7c3aed]/25",
  sms: "bg-[#15803d]/10 text-[#166534] border-[#15803d]/25",
  inapp: "bg-[#b45309]/10 text-[#92400e] border-[#b45309]/25",
};
export function ChannelBadge({ channel, className = "" }: { channel: Channel; className?: string }) {
  return <span className={`inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap ${BADGE[channel]} ${className}`}><ChannelIcon channel={channel} className="size-3.5" />{CHANNEL_LABEL[channel]}</span>;
}
