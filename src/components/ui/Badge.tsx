import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
}

const variantStyles = {
    default: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary text-secondary-foreground border-secondary',
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-orange-100 text-orange-700 border-orange-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    outline: 'bg-transparent border-gray-200 text-gray-700',
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                variantStyles[variant],
                className
            )}
            {...props}
        />
    )
}

export { Badge }
