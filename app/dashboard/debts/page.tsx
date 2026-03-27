import type { Metadata } from "next";

import { DebtTable } from "@/components/debts/debt-table";

export const metadata: Metadata = {
  title: "Nợ",
  description: "Theo dõi khoản phải thu và phải trả.",
};

export default function DebtsPage() {
  return <DebtTable />;
}
