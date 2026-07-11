import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-coral/15 text-coral border border-coral/20',
        success:     'bg-success/10 text-success border border-success/20',
        warning:     'bg-warning/10 text-warning border border-warning/20',
        danger:      'bg-danger/10 text-danger border border-danger/20',
        secondary:   'bg-surface-border text-mist border border-surface-border',
        amber:       'bg-amber-stamp/15 text-amber-stamp border border-amber-stamp/20',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
