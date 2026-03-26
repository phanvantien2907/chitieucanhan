"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, LogOut, Search, User } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCommandPaletteShortcutLabel,
  useCommandSearch,
} from "@/components/layout/command-search";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function DashboardHeader() {
  const { logout, isPending } = useLogout();
  const { isLoading: authLoading, displayLabel, email, initials } = useAuth();
  const { setOpen: openCommandSearch } = useCommandSearch();
  const shortcutLabel = useCommandPaletteShortcutLabel();
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  return (
    <>
      <header className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-3 backdrop-blur-md transition-[height] duration-200 md:gap-4 md:px-6">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger className="-ml-1 cursor-pointer transition-transform duration-200 hover:bg-muted hover:opacity-80" />
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              Mở hoặc đóng thanh menu
            </TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="hidden h-6 md:block" />
        </div>
        <div className="relative flex min-w-0 flex-1 max-w-md">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="text-muted-foreground hover:text-foreground h-9 w-full cursor-pointer justify-start gap-2 rounded-lg border-border/80 bg-muted/40 px-2.5 text-left font-normal shadow-none transition-colors duration-200 hover:bg-muted/60 md:max-w-sm"
                aria-label="Mở tìm kiếm điều hướng"
                onClick={() => openCommandSearch(true)}
              >
                <Search className="size-4 shrink-0 opacity-80" aria-hidden />
                <span className="truncate">
                  Tìm kiếm trang…
                </span>
                <kbd className="text-muted-foreground pointer-events-none ml-auto hidden h-5 items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
                  {shortcutLabel}
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              Tìm kiếm ({shortcutLabel})
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-200 hover:bg-muted hover:opacity-80"
                aria-label="Thông báo"
              >
                <Bell className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              Thông báo
            </TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="relative h-9 cursor-pointer gap-2 rounded-full px-1.5 pr-2 transition-colors duration-200 hover:bg-muted"
                aria-label="Menu tài khoản"
              >
                <Avatar size="sm" className="size-8">
                  <AvatarFallback className="bg-muted text-xs font-medium">
                    {authLoading ? "…" : initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground hidden max-w-[120px] truncate text-sm font-medium sm:inline">
                  {authLoading
                    ? "…"
                    : displayLabel || email || "Tài khoản"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-0.5">
                  <span className="truncate text-sm font-medium">
                    {displayLabel || "Chưa đặt tên"}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {email ?? ""}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  className="cursor-pointer"
                  href="/dashboard/settings"
                >
                  <User className="size-4" />
                  Hồ sơ
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onSelect={(event) => {
                  event.preventDefault();
                  setLogoutOpen(true);
                }}
              >
                <LogOut className="size-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đăng xuất?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn cần đăng nhập lại để tiếp tục quản lý tài chính.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={isPending}
            >
              Hủy
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="cursor-pointer"
              disabled={isPending}
              onClick={() => void logout().then(() => setLogoutOpen(false))}
            >
              {isPending ? "Đang đăng xuất…" : "Đăng xuất"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
