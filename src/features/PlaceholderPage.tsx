import React from 'react';
import { Compass, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PlaceholderProps {
  title: string;
  phase: number;
}

export function PlaceholderPage({ title, phase }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <Card className="max-w-md border-border bg-card/50 backdrop-blur-md rounded-3xl shadow-xl p-8 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-primary/10 blur-xl" />
        
        <CardContent className="p-0 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
            <Compass className="w-8 h-8 animate-spin-slow" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">{title} Module</h2>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/15 mt-1">
              Coming in Phase {phase}
            </span>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            This module is currently planned and will be built in the next iteration phase. 
            All core cash flow tools and home loan calculations are available now.
          </p>

          <div className="border-t border-border pt-4 w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Coexisting on shared Firebase schema</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default PlaceholderPage;
