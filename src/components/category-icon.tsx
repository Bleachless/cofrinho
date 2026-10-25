import {
  ArrowDownLeft,
  ArrowLeftRight,
  Bike,
  Car,
  CircleDashed,
  Dumbbell,
  Fuel,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  PiggyBank,
  Plus,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Tv,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  ArrowDownLeft,
  ArrowLeftRight,
  Bike,
  Car,
  CircleDashed,
  Dumbbell,
  Fuel,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  PiggyBank,
  Plus,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Tv,
  UtensilsCrossed,
  Wallet,
};

// Ícone da categoria num quadradinho com a cor dela.
export function CategoryIcon({ category, size = "md" }: { category: Pick<Category, "icon" | "color" | "name">; size?: "sm" | "md" }) {
  const Icon = ICONS[category.icon] ?? CircleDashed;
  return (
    <span
      className={size === "sm" ? "flex size-6 shrink-0 items-center justify-center rounded-md" : "flex size-8 shrink-0 items-center justify-center rounded-lg"}
      style={{ background: `color-mix(in oklch, ${category.color} 18%, transparent)`, color: category.color }}
      title={category.name}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
    </span>
  );
}
