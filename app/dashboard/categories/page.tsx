import { CategoryTable } from "@/components/categories/category-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Danh mục",
  description: "Nhóm các khoản chi tiêu theo danh mục (ăn uống, di chuyển, …).",
};
export default function CategoriesPage() {
  return <CategoryTable />;
}
