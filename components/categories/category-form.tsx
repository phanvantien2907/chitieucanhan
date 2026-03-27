"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildCategorySelectOptions,
  createCategory,
  getDescendantCategoryIds,
  updateCategory,
  type CategoryDoc,
} from "@/services/category.service";

const categoryFormSchema = z.object({
  name: z
    .string()
    .min(1, "Vui lòng nhập tên danh mục")
    .max(200, "Tối đa 200 ký tự"),
  description: z.string().max(2000, "Tối đa 2000 ký tự"),
  parentId: z.string().optional(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

type CategoryFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  uid: string;
  category: CategoryDoc | null;
  allCategories?: CategoryDoc[];
  onSuccess: () => void;
};

export function CategoryForm({
  open,
  onOpenChange,
  mode,
  uid,
  category,
  allCategories = [],
  onSuccess,
}: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      parentId: "",
    },
    mode: "onSubmit",
  });

  const parentExcludeIds = useMemo(() => {
    if (!category || mode === "create") {
      return new Set<string>();
    }
    const s = new Set<string>([category.id]);
    for (const id of getDescendantCategoryIds(category.id, allCategories)) {
      s.add(id);
    }
    return s;
  }, [category, mode, allCategories]);

  const parentOptions = useMemo(() => {
    const base = buildCategorySelectOptions(allCategories, {
      excludeIds: parentExcludeIds,
    });
    if (category?.parentId) {
      const exists = base.some((o) => o.value === category.parentId);
      if (!exists) {
        const p = allCategories.find((c) => c.id === category.parentId);
        if (p) {
          return [
            {
              value: p.id,
              label: `${p.name} (đã xóa)`,
              depth: 0,
            },
            ...base,
          ];
        }
      }
    }
    return base;
  }, [allCategories, parentExcludeIds, category]);

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset({
      name: category?.name ?? "",
      description: category?.description ?? "",
      parentId: category?.parentId ?? "",
    });
  }, [open, category, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const parentId =
      values.parentId != null && values.parentId.trim() !== ""
        ? values.parentId.trim()
        : null;
    try {
      if (mode === "create") {
        await createCategory(uid, {
          name: values.name,
          description: values.description,
          parentId,
        });
        toast.success("Tạo danh mục thành công.");
      } else if (category) {
        await updateCategory(uid, category.id, {
          name: values.name,
          description: values.description,
          parentId,
        });
        toast.success("Đã cập nhật danh mục.");
      }
      onSuccess();
      onOpenChange(false);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
      toast.error(message);
    }
  });

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tạo danh mục" : "Sửa danh mục"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Thêm nhóm chi tiêu mới để theo dõi dễ hơn."
              : "Cập nhật thông tin danh mục."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ví dụ: Ăn uống"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ghi chú ngắn (tùy chọn)"
                      rows={4}
                      className="min-h-24 resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Danh mục cha</FormLabel>
                  <Select
                    onValueChange={(v) =>
                      field.onChange(v === "__none__" ? "" : v)
                    }
                    value={field.value && field.value.length > 0 ? field.value : "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full cursor-pointer">
                        <SelectValue placeholder="Không có (gốc)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72 overflow-y-auto p-1">
                      <SelectItem
                        value="__none__"
                        className="cursor-pointer rounded-md text-sm"
                      >
                        Danh mục gốc (không có cha)
                      </SelectItem>
                      {parentOptions.map((o) => (
                        <SelectItem
                          key={o.value}
                          value={o.value}
                          className="cursor-pointer rounded-md text-sm"
                          style={{
                            paddingLeft: `calc(0.75rem + ${o.depth} * 1rem)`,
                          }}
                        >
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting
                  ? "Đang lưu…"
                  : mode === "create"
                    ? "Tạo mới"
                    : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
