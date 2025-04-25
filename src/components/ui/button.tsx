import * as React from "react";

// Simple class utility until we properly install dependencies
const cva = (base: string, config: any) => {
  return ({ className, variant, size, ...props }: any) => {
    const variantClass = variant && config.variants.variant[variant];
    const sizeClass = size && config.variants.size[size];
    return [base, variantClass, sizeClass, className].filter(Boolean).join(' ');
  };
};

type VariantProps<T> = {
  variant?: string;
  size?: string;
};

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    // Manually handle variant and size classes for now
    const baseClass = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    let variantClass = '';
    if (variant === 'default') variantClass = "bg-primary text-primary-foreground hover:bg-primary/90";
    else if (variant === 'destructive') variantClass = "bg-destructive text-destructive-foreground hover:bg-destructive/90";
    else if (variant === 'outline') variantClass = "border border-input bg-background hover:bg-accent hover:text-accent-foreground";
    else if (variant === 'secondary') variantClass = "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    else if (variant === 'ghost') variantClass = "hover:bg-accent hover:text-accent-foreground";
    else if (variant === 'link') variantClass = "text-primary underline-offset-4 hover:underline";
    
    let sizeClass = '';
    if (size === 'default') sizeClass = "h-10 px-4 py-2";
    else if (size === 'sm') sizeClass = "h-9 rounded-md px-3";
    else if (size === 'lg') sizeClass = "h-11 rounded-md px-8";
    else if (size === 'icon') sizeClass = "h-10 w-10";
    
    const combinedClassName = `${baseClass} ${variantClass} ${sizeClass} ${className}`.trim();
    
    return (
      <button
        className={combinedClassName}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
