import { ExpenseTable } from "@/components/expenses/expense-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chi tiêu",
  description: "Theo dõi chi tiêu theo danh mục và lịch sử giao dịch.",
};

export default function ExpensesPage() {
  return <ExpenseTable />;
}
