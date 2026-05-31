import { setIcon } from "obsidian";
import * as React from "react";


interface LucideIconProps {
    icon: string;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const LucideIcon: React.FC<LucideIconProps> = ({ icon, size = 16, className = "", style = {} }) => {
    const ref = React.useRef<HTMLSpanElement>(null);

    React.useEffect(() => {
        if (ref.current) {
            ref.current.empty();
            setIcon(ref.current, icon);

            // Adjust size if specified
            if (size) {
                const svg = ref.current.querySelector("svg");
                if (svg) {
                    svg.setAttribute("width", size.toString());
                    svg.setAttribute("height", size.toString());
                }
            }
        }
    }, [icon, size]);

    return (
        <span
            ref={ref}
            className={`lucide-icon ${className}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...style
            }}
        />
    );
};
