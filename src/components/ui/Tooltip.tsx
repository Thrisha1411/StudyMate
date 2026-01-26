import type { ReactNode } from 'react'

interface TooltipProps {
    children: ReactNode
    content: string
}

export function Tooltip({ children, content }: TooltipProps) {
    return (
        <div className="group relative inline-block">
            {children}
            <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium rounded-xl whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg backdrop-blur-sm">
                {content}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-[6px] border-transparent border-t-blue-600"></div>
            </div>
        </div>
    )
}
