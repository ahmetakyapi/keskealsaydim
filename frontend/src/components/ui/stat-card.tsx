import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatCurrency, formatPercent, getChangeColor } from "@/lib/utils";
import CountUp from "react-countup";

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  prefix?: string;
  suffix?: string;
  format?: "currency" | "percent" | "number";
  variant?: "default" | "success" | "danger" | "primary" | "gradient";
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  prefix = "",
  suffix = "",
  format = "number",
  variant = "default",
  delay = 0,
}: StatCardProps) {
  const variantClasses = {
    default: "bg-white/5 border-white/10",
    success: "bg-success/10 border-success/20",
    danger: "bg-danger/10 border-danger/20",
    primary: "bg-primary/10 border-primary/20",
    gradient: "bg-gradient-to-br from-primary/20 to-secondary/20 border-white/10",
  };

  const iconBgClasses = {
    default: "bg-white/10",
    success: "bg-success/20",
    danger: "bg-danger/20",
    primary: "bg-primary/20",
    gradient: "bg-white/10",
  };

  const formatValue = () => {
    switch (format) {
      case "currency":
        return formatCurrency(value).replace("₺", "");
      case "percent":
        return formatPercent(value).replace("%", "");
      default:
        return value.toLocaleString("tr-TR");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "rounded-2xl border p-6 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-lg",
        variantClasses[variant]
      )}
    >
      <div className="flex items-start justify-between mb-4">
        {Icon && (
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBgClasses[variant])}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-sm font-medium", getChangeColor(change))}>
            {change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{formatPercent(Math.abs(change))}</span>
          </div>
        )}
      </div>

      <p className="text-white/60 text-sm mb-1">{title}</p>
      <p className="text-3xl font-bold text-white">
        {prefix}
        <CountUp
          end={parseFloat(formatValue().replace(/\./g, "").replace(",", "."))}
          separator="."
          decimals={format === "currency" ? 2 : 0}
          decimal=","
          duration={1.5}
        />
        {suffix}
      </p>
      {changeLabel && (
        <p className={cn("text-sm mt-1", getChangeColor(change || 0))}>
          {changeLabel}
        </p>
      )}
    </motion.div>
  );
}
