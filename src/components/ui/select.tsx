import * as React from "react"
import { cn } from "@/lib/utils"

type SelectContextType = {
    value: string
    onValueChange: (value: string) => void
    open: boolean
    setOpen: (open: boolean) => void
}

const Context = React.createContext<SelectContextType | undefined>(undefined)

function useSelect() {
    const context = React.useContext(Context)
    if (!context) throw new Error("useSelect must be used within a SelectProvider")
    return context
}

const Select = ({ value, onValueChange, children }: any) => {
    const [open, setOpen] = React.useState(false)
    return (
        <Context.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative w-full">{children}</div>
        </Context.Provider>
    )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelect()
    return (
        <button
            ref={ref}
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            {children}
            <span className="ml-2 opacity-50">▼</span>
        </button>
    )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder }: any) => {
    const { value } = useSelect()
    return <span className="block truncate">{value ? (value.charAt(0).toUpperCase() + value.slice(1)) : placeholder}</span>
}

const SelectContent = ({ children, className }: any) => {
    const { open } = useSelect()
    if (!open) return null
    return (
        <div className={cn("absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white text-slate-950 shadow-md animate-in fade-in-80 w-full mt-1", className)}>
            <div className="p-1 max-h-60 overflow-y-auto">{children}</div>
        </div>
    )
}

const SelectItem = React.forwardRef<HTMLDivElement, any>(({ className, children, value, ...props }, ref) => {
    const { onValueChange, setOpen, value: selectedValue } = useSelect()
    return (
        <div
            ref={ref}
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-slate-100 hover:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                value === selectedValue && "bg-slate-100 font-medium",
                className
            )}
            onClick={(e) => {
                onValueChange(value)
                setOpen(false)
                e.stopPropagation()
            }}
            {...props}
        >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {value === selectedValue && <span>✓</span>}
            </span>
            {children}
        </div>
    )
})
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
