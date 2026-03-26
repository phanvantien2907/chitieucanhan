"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDown,
  FolderTree,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Receipt,
  User,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";

const navItems = [
  { title: "Trang chủ", href: "/dashboard", icon: LayoutDashboard },
  { title: "Danh mục", href: "/dashboard/categories", icon: FolderTree },
  { title: "Chi tiêu", href: "/dashboard/expenses", icon: Receipt },
  { title: "Tiết kiệm", href: "/dashboard/savings", icon: PiggyBank },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { logout, isPending } = useLogout();
  const { isLoading: authLoading, displayLabel, email, initials } = useAuth();
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  const accountTitle =
    displayLabel || email || "Tài khoản";

  return (
    <>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="border-b border-sidebar-border/60 pb-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip="Trang chủ">
                <Link href="/dashboard">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-semibold shadow-sm transition-opacity hover:opacity-90">
                    ₫
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold tracking-tight">
                      Tài chính
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      Cá nhân
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border/60">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    title={accountTitle}
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
                        {authLoading ? "…" : initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {authLoading ? "…" : displayLabel || "Tài khoản"}
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground/70">
                        {authLoading ? "…" : email ?? ""}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/70" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 rounded-xl"
                  side="top"
                  align="start"
                  sideOffset={8}
                >
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
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

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
