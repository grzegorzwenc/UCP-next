"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Fragment, useState } from "react";
import { ChevronsUpDown, Check, LogOut, Moon, Sun } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/shadcn/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { INSTANCES, marketsIn, market, ENVS, env as envOf } from "@/lib/markets";
import { NAV, navSlug } from "@/lib/nav";
import { useSession } from "@/components/shell/Session";
import { ucpApi } from "@/lib/api";
import { ROLES } from "@/lib/ucp/seed";

/**
 * Main navigation. The sections and items are the same as the hand-rolled SideNav they
 * replace; what changed is the machinery: collapse-to-icon, the ⌘B shortcut, the cookie
 * that remembers the state and the phone drawer all come from the shadcn Sidebar now.
 *
 * The header is the market switcher. Instances (EMEA / APAC / NA) are the dropdown's group
 * labels rather than a second control, so picking a market is one gesture instead of two.
 * Environment stays in the top bar, where its colour is visible even when this collapses.
 */
function MarketSwitcher({ marketId, envId }: { marketId: string; envId: string }) {
  const router = useRouter(); const pathname = usePathname();
  const rest = pathname.split("/").slice(3).join("/") || "dashboard";
  const m = market(marketId);
  const instance = INSTANCES.find((i) => i.id === m.instance);
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="cursor-pointer data-[state=open]:bg-sidebar-accent">
                {/* the hexagon alone, not the masterbrand lockup: the wordmark is unreadable at 32px */}
                <img src="/hsbc-hexagon.svg" alt="" className="h-5 w-auto shrink-0" />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-medium">{m.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{instance?.name} · {m.domain}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 opacity-60" />
              </SidebarMenuButton>
            }
          />
          {/* Base UI requires every GroupLabel to sit inside a Group — unlike Radix, a bare
              <DropdownMenuLabel> throws "MenuGroupContext is missing". One group per instance,
              so the region names double as the labels. */}
          <DropdownMenuContent align="start" side="right" sideOffset={6} className="w-[260px]">
            {INSTANCES.filter((inst) => marketsIn(inst.id).length > 0).map((inst, i) => (
              <Fragment key={inst.id}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[11px] uppercase tracking-[.08em] text-muted-foreground" title={inst.full}>{inst.name}</DropdownMenuLabel>
                  {marketsIn(inst.id).map((x) => (
                    <DropdownMenuItem key={x.id} className="cursor-pointer gap-2"
                      onClick={() => router.push(`/${x.id}/${envId}/${rest}`)}>
                      <span aria-hidden className="text-base leading-none">{x.flag}</span>
                      <span className="flex-1 truncate">{x.name}</span>
                      {x.id === m.id && <Check className="size-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function SidebarUser({ marketId, envId }: { marketId: string; envId: string }) {
  const router = useRouter(); const pathname = usePathname(); const { user: me } = useSession();
  const rest = pathname.split("/").slice(3).join("/") || "dashboard";
  const [busy, setBusy] = useState(false);
  const e = envOf(envId);
  /* Theme. The class is applied before first paint by the script in app/layout.tsx, so this
     only reads the result and flips it — same approach as hsbc-ucpmock's nav-user. Read in a
     lazy initialiser rather than an effect: by hydration the class is already correct, and the
     menu's contents only mount on open, so there is nothing to mismatch. */
  const [isDark, setIsDark] = useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  function toggleTheme() {
    const next = !isDark; setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* storage unavailable */ }
  }
  async function signOut() { setBusy(true); try { await ucpApi.logout(); router.push("/login"); router.refresh(); } catch { setBusy(false); } }
  const initials = me.name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="cursor-pointer data-[state=open]:bg-sidebar-accent">
                <span aria-hidden className="size-8 shrink-0 rounded-full bg-(--sidebar-active-bar) text-white grid place-items-center text-[11px] font-medium">{initials}</span>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-medium">{me.name}</span>
                  {/* The environment reads as the second line, with its colour dot, so it is
                      still visible at a glance without taking a slot in the top bar. The
                      tooltip carries what publishing here means — copy that used to sit in a
                      box on the dashboard. */}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="truncate text-xs text-muted-foreground inline-flex items-center gap-1.5">
                          <i aria-hidden className="inline-block size-2 rounded-full" style={{ background: e.color }} />{e.name}
                        </span>
                      }
                    />
                    <TooltipContent side="right" sideOffset={8}>{e.note}</TooltipContent>
                  </Tooltip>
                </div>
                <ChevronsUpDown className="ml-auto size-4 opacity-60" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent align="end" side="right" sideOffset={6} className="w-[260px]">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <span className="block font-medium">{me.name}</span>
                <span className="block text-xs text-muted-foreground">{me.email || `${me.id}@hsbc.com`}</span>
                <span className="mt-1 inline-block text-[11px] text-muted-foreground">{ROLES[me.role]?.name ?? me.role}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[11px] uppercase tracking-[.08em] text-muted-foreground">Environment</DropdownMenuLabel>
              {ENVS.map((x) => (
                <DropdownMenuItem key={x.id} className="cursor-pointer gap-2"
                  onClick={() => router.push(`/${marketId}/${x.id}/${rest}`)}>
                  <i aria-hidden className="inline-block size-2 rounded-full shrink-0" style={{ background: x.color }} />
                  <span className="flex-1 truncate" title={x.note}>{x.name}</span>
                  {x.id === e.id && <Check className="size-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={toggleTheme}>
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {isDark ? "Light theme" : "Dark theme"}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" disabled={busy} onClick={() => void signOut()}>
                <LogOut className="size-4" />{busy ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar({ marketId, envId }: { marketId: string; envId: string }) {
  const pathname = usePathname(); const { isMobile, setOpenMobile } = useSidebar();
  const seg = pathname.split("/")[3] || "dashboard";
  const active = navSlug(seg);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader><MarketSwitcher marketId={marketId} envId={envId} /></SidebarHeader>
      <SidebarContent>
        {NAV.map((section, i) => (
          <SidebarGroup key={section.label ?? i}>
            {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
            <SidebarMenu>
              {section.items.map((it) => (
                <SidebarMenuItem key={it.slug}>
                  <SidebarMenuButton tooltip={it.label} isActive={active === it.slug}
                    render={
                      <Link href={`/${marketId}/${envId}/${it.slug}`} className="cursor-pointer"
                        aria-current={active === it.slug ? "page" : undefined}
                        onClick={() => isMobile && setOpenMobile(false)}>
                        <it.icon className="size-4" /><span>{it.label}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      {/* the user strip sits one BDL grey darker than the nav, as in hsbc-ucpmock */}
      <SidebarFooter className="bg-(--sidebar-footer)"><SidebarUser marketId={marketId} envId={envId} /></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
