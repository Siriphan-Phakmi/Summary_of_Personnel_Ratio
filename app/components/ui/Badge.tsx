import * as React from "react"
import { cn } from "@/app/lib/utils/cn"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "info" | "success" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default: "border-transparent bg-blue-600 text-white hover:bg-blue-700",
    secondary: "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200",
    destructive: "border-transparent bg-red-600 text-white hover:bg-red-700",
    outline: "text-gray-700 border-gray-300 dark:text-gray-300 dark:border-gray-600",
    info: "border-transparent bg-sky-500 text-white hover:bg-sky-600",
    success: "border-transparent bg-green-600 text-white hover:bg-green-700",
    warning: "border-transparent bg-amber-500 text-white hover:bg-amber-600",
  };

  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
        variantClasses[variant],
        className
      )} 
      {...props} 
    />
  )
}

export { Badge } 