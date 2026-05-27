type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[#27272A] text-[#A1A1AA]",
  success: "bg-green-500/15 text-green-400",
  warning: "bg-amber-500/15 text-amber-400",
  danger: "bg-red-500/15 text-red-400",
  info: "bg-blue-500/15 text-blue-400",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
