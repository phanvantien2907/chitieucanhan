import { SavingsPinGate } from "@/components/savings/savings-pin-gate";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tiết kiệm",
  description: "Theo dõi khoản tiết kiệm.",
};
export default function SavingsPage() {
  return <SavingsPinGate />;
}
