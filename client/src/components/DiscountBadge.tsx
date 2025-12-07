import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  percent: number;
  className?: string;
  tone?: "primary" | "destructive" | "success" | "secondary" | "warning";
  size?: "sm" | "md" | "lg";
};

export default function DiscountBadge({ percent, className = "", tone = "destructive", size = "md" }: Props) {
  const toneClass = tone === "primary" ? "bg-primary text-primary-foreground" : tone === "success" ? "bg-green-600 text-white" : tone === "secondary" ? "bg-secondary text-secondary-foreground" : tone === "warning" ? "bg-orange-500 text-white" : "bg-red-600 text-white";
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <Badge className={cn(toneClass, sizeClass, "font-bold shadow-sm", className)}>{Math.round(percent)}% off</Badge>
  );
}