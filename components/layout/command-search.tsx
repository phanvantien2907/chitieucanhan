"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FolderTree,
  Handshake,
  Home,
  PiggyBank,
  Settings,
  Wallet,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type NavRoute = {
  readonly title: string;
  readonly href: string;
  /** Extra tokens for cmdk filter (lowercase, space-separated). */
  readonly search: string;
  readonly Icon: React.ComponentType<{ className?: string }>;
};

/** Static routes — memoized by module scope (no per-render allocation). */
const NAV_ROUTES: readonly NavRoute[] = [
  {
    title: "Trang chủ",
    href: "/dashboard",
    search: "dashboard trang chủ home tổng quan",
    Icon: Home,
  },
  {
    title: "Danh mục",
    href: "/dashboard/categories",
    search: "danh mục categories folder nhóm",
    Icon: FolderTree,
  },
  {
    title: "Chi tiêu",
    href: "/dashboard/expenses",
    search: "chi tiêu expenses wallet giao dịch",
    Icon: Wallet,
  },
  {
    title: "Nợ",
    href: "/dashboard/debts",
    search: "nợ debts vay phải trả phải thu",
    Icon: Handshake,
  },
  {
    title: "Tiết kiệm",
    href: "/dashboard/savings",
    search: "tiết kiệm savings pin",
    Icon: PiggyBank,
  },
  {
    title: "Cài đặt",
    href: "/dashboard/settings",
    search: "cài đặt settings hồ sơ tài khoản",
    Icon: Settings,
  },
];

type CommandSearchContextValue = {
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const CommandSearchContext =
  React.createContext<CommandSearchContextValue | null>(null);

export function useCommandSearch(): CommandSearchContextValue {
  const ctx = React.useContext(CommandSearchContext);
  if (!ctx) {
    throw new Error("useCommandSearch must be used within CommandSearch");
  }
  return ctx;
}

function useModifierLabel(): string {
  const [label, setLabel] = React.useState("Ctrl");

  React.useEffect(() => {
    const isApple = /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
    setLabel(isApple ? "⌘" : "Ctrl");
  }, []);

  return label;
}

/** For header tooltip: `Tìm kiếm (Ctrl + K)` or `⌘ + K` on Apple. */
export function useCommandPaletteShortcutLabel(): string {
  const [label, setLabel] = React.useState("Ctrl + K");

  React.useEffect(() => {
    const isApple = /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
    setLabel(isApple ? "⌘ + K" : "Ctrl + K");
  }, []);

  return label;
}

function CommandSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const mod = useModifierLabel();

  const handleSelect = React.useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Tìm trang hoặc lệnh…" />
      <CommandList>
        <CommandEmpty>Không tìm thấy trang phù hợp.</CommandEmpty>
        <CommandGroup heading="Điều hướng">
          {NAV_ROUTES.map((route) => {
            const Icon = route.Icon;
            const filterValue = `${route.title} ${route.search} ${route.href}`;
            return (
              <CommandItem
                key={route.href}
                value={filterValue}
                onSelect={() => handleSelect(route.href)}
                className="cursor-pointer"
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                <span>{route.title}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
      <CommandSeparator />
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs">
        <span>Điều hướng nhanh</span>
        <span className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Nhấn</span>
          <kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border px-1.5 font-mono text-[10px] font-medium">
            {mod}
          </kbd>
          <span className="text-muted-foreground/80">+</span>
          <kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border px-1.5 font-mono text-[10px] font-medium">
            K
          </kbd>
        </span>
      </div>
    </CommandDialog>
  );
}

/**
 * Global command palette (Ctrl+K / ⌘K) + context for opening from the header trigger.
 * Mount once above dashboard shell.
 */
export function CommandSearch({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  const value = React.useMemo<CommandSearchContextValue>(
    () => ({
      setOpen,
      toggle: () => setOpen((o) => !o),
    }),
    []
  );

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "k" && e.key !== "K") {
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) {
        return;
      }
      e.preventDefault();
      setOpen((o) => !o);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <CommandSearchContext.Provider value={value}>
      {children}
      <CommandSearchDialog open={open} onOpenChange={setOpen} />
    </CommandSearchContext.Provider>
  );
}
