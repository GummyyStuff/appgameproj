import * as React from "react"
import { TarkovButton } from "./TarkovButton"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    // Map shadcn variants to TarkovButton variants
    const tarkovVariant = variant === 'destructive' ? 'danger' : 
                         variant === 'outline' ? 'ghost' : 
                         variant === 'secondary' ? 'secondary' : 'primary'
    
    const tarkovSize = size === 'sm' ? 'sm' : 
                      size === 'lg' ? 'lg' : 'md'

    return (
      <TarkovButton
        ref={ref}
        variant={tarkovVariant}
        size={tarkovSize}
        className={className}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

