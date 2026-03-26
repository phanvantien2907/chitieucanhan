import type { Metadata } from "next";

import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export const metadata: Metadata = {
  title: "Trang chủ",
  description:
    "Biểu đồ chi tiêu theo tháng, xu hướng và danh mục — cập nhật theo thời gian thực.",
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
