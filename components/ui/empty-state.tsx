import Link from "next/link";
import { Card } from "./card";
import { Button } from "./button";

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  primaryAction?: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <Card className="text-center py-12">
      {icon && <div className="text-5xl mb-3">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-ink-muted mt-1 max-w-md mx-auto">{description}</p>}
      <div className="mt-5 flex items-center justify-center gap-2">
        {primaryAction && (primaryAction.href ? (
          <Link href={primaryAction.href}><Button>{primaryAction.label}</Button></Link>
        ) : (
          <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
        ))}
        {secondaryAction && (secondaryAction.href ? (
          <Link href={secondaryAction.href}><Button variant="secondary">{secondaryAction.label}</Button></Link>
        ) : (
          <Button variant="secondary" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>
        ))}
      </div>
    </Card>
  );
}
