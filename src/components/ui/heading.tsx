interface HeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function Heading({
  title,
  subtitle,
  className,
}: HeadingProps) {
  return (
    <div className={className}>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="text-muted-foreground mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
