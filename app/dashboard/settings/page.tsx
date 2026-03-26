import type { Metadata } from "next";

import { SettingsPageClient } from "@/components/settings/settings-page";

export const metadata: Metadata = {
  title: "Cài đặt",
  description:
    "Hồ sơ, mật khẩu đăng nhập và mã PIN bảo mật (Tiết kiệm).",
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
