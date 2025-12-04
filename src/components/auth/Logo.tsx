import { cn } from '@/lib/utils';
import { Briefcase } from 'lucide-react';
import type { HTMLAttributes } from 'react';

export default function Logo({ className }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-6 flex items-center justify-center gap-2', className)}>
      <Briefcase className="h-8 w-8 text-primary" />
      <h1 className="text-3xl font-bold text-foreground font-headline">Fuzionest</h1>
    </div>
  );
}
