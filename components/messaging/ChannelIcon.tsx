import { Mail, MessageSquareText, BellRing, PanelTop } from "lucide-react";
import type { Channel } from "@/lib/messaging/model";

const ICON = { email: Mail, sms: MessageSquareText, push: BellRing, inapp: PanelTop } as const;
export function ChannelIcon({ channel, className = "w-4.5 h-4.5" }: { channel: Channel; className?: string }) { const I = ICON[channel]; return <I className={className} aria-hidden />; }
