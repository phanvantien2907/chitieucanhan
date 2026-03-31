"use client";

import { useState } from "react";
import { KeyRound, Lock } from "lucide-react";

import { ChangePasswordDialog } from "@/components/settings/change-password-dialog";
import { ChangePinDialog } from "@/components/settings/change-pin-dialog";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { ProfileForm } from "@/components/settings/profile-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProfile } from "@/hooks/useProfile";

export function SettingsPageClient() {
  const {
    user,
    authLoading,
    hasPin,
    pinLoading,
    hasPasswordProvider,
    savingProfile,
    changingPassword,
    saveProfile,
    changePassword,
    refreshPinState,
  } = useProfile();

  const [pinOpen, setPinOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Cài đặt
        </h1>
        <p className="text-muted-foreground text-sm">
          Hồ sơ, mật khẩu đăng nhập và mã PIN bảo mật (Tiết kiệm).
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <ProfileForm
          user={user}
          authLoading={authLoading}
          saving={savingProfile}
          onSave={saveProfile}
        />

        <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Mật khẩu đăng nhập</CardTitle>
            <CardDescription>
              Đổi mật khẩu tài khoản email (Firebase). Tài khoản chỉ đăng nhập
              Google không đổi mật khẩu tại đây.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              {authLoading ? (
                <Skeleton className="h-4 w-56" />
              ) : hasPasswordProvider ? (
                "Đăng nhập bằng email và mật khẩu — bạn có thể đổi mật khẩu bên dưới."
              ) : (
                "Bạn đăng nhập bằng Google. Đổi mật khẩu trong tài khoản Google."
              )}
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 min-h-11 w-full shrink-0 cursor-pointer touch-manipulation sm:w-auto"
                  disabled={authLoading || !user || !hasPasswordProvider}
                  onClick={() => setPasswordOpen(true)}
                >
                  <Lock className="size-4" />
                  Đổi mật khẩu
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {hasPasswordProvider
                  ? "Xác thực mật khẩu hiện tại và mật khẩu mới"
                  : "Đăng nhập Google — không dùng mật khẩu app"}
              </TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Bảo mật</CardTitle>
            <CardDescription>
              Đổi mã PIN 6 số dùng cho xác thực Tiết kiệm. Sai nhiều lần sẽ khóa
              5 phút (giống khi nhập sai PIN).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              {pinLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : hasPin ? (
                "Bạn đã thiết lập PIN."
              ) : (
                "Chưa có PIN — thiết lập trong mục Tiết kiệm trước khi đổi PIN tại đây."
              )}
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 min-h-11 w-full shrink-0 cursor-pointer touch-manipulation sm:w-auto"
                  disabled={authLoading || pinLoading || !user || !hasPin}
                  onClick={() => setPinOpen(true)}
                >
                  <KeyRound className="size-4" />
                  Đổi mã PIN
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {hasPin
                  ? "Mở form đổi PIN (xác thực PIN hiện tại)"
                  : "Cần thiết lập PIN trong Tiết kiệm trước"}
              </TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-destructive/20 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Xóa tài khoản</CardTitle>
            <CardDescription>
              Hành động này không thể hoàn tác
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              className="h-11 min-h-11 w-full shrink-0 cursor-pointer touch-manipulation sm:w-auto"
              disabled={authLoading || !user}
              onClick={() => setDeleteAccountOpen(true)}
            >
              Xóa tài khoản
            </Button>
          </CardContent>
        </Card>
      </div>

      {user ? (
        <>
          <ChangePasswordDialog
            open={passwordOpen}
            onOpenChange={setPasswordOpen}
            canUsePasswordChange={hasPasswordProvider}
            changingPassword={changingPassword}
            onChangePassword={changePassword}
          />
          <ChangePinDialog
            open={pinOpen}
            onOpenChange={setPinOpen}
            uid={user.uid}
            hasPin={hasPin}
            onPinChanged={() => {
              void refreshPinState();
            }}
          />
          <DeleteAccountDialog
            open={deleteAccountOpen}
            onOpenChange={setDeleteAccountOpen}
            uid={user.uid}
          />
        </>
      ) : null}
    </div>
  );
}
