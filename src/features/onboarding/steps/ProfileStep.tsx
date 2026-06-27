import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Compass, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

const schema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  currency: z.string(),
  salaryDate: z.coerce.number().min(1).max(31),
  riskProfile: z.enum(['conservative', 'balanced', 'aggressive']),
});

type FormValues = z.infer<typeof schema>;

interface ProfileStepProps {
  onNext: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
}

export function ProfileStep({ onNext, defaultValues }: ProfileStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name || '',
      currency: defaultValues?.currency || 'INR',
      salaryDate: defaultValues?.salaryDate || 1,
      riskProfile: defaultValues?.riskProfile || 'balanced',
    },
  });

  const selectedRisk = watch('riskProfile');

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            placeholder="e.g. Vikram Sharma"
            {...register('name')}
            className={cn(errors.name && "border-expense-500 focus-visible:ring-expense-500")}
          />
          {errors.name && (
            <p className="text-xs text-expense-500 font-semibold">{errors.name.message}</p>
          )}
        </div>

        {/* Currency & Salary Date Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              defaultValue={watch('currency')}
              onValueChange={(val) => setValue('currency', val)}
            >
              <SelectTrigger id="currency">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR (₹)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salaryDate">Salary Payday</Label>
            <Select
              defaultValue={String(watch('salaryDate'))}
              onValueChange={(val) => setValue('salaryDate', Number(val))}
            >
              <SelectTrigger id="salaryDate">
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    Day {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Risk Profile Selection Cards */}
        <div className="space-y-2.5">
          <Label>Risk Profile</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                value: 'conservative',
                label: 'Conservative',
                desc: 'Capital preservation. SIP: 10–15% of net income.',
                icon: ShieldCheck,
                color: 'text-income-600 border-income-500/20 bg-income-50/10'
              },
              {
                value: 'balanced',
                label: 'Balanced',
                desc: 'Moderate growth. SIP: 15–25% of net income.',
                icon: Compass,
                color: 'text-invest-600 border-invest-500/20 bg-invest-50/10'
              },
              {
                value: 'aggressive',
                label: 'Aggressive',
                desc: 'Max growth over time. SIP: 25–35% of net income.',
                icon: Sparkles,
                color: 'text-emergency-600 border-emergency-500/20 bg-emergency-50/10'
              }
            ].map((p) => {
              const Icon = p.icon;
              const isSelected = selectedRisk === p.value;
              return (
                <Card
                  key={p.value}
                  onClick={() => setValue('riskProfile', p.value as any)}
                  className={cn(
                    "cursor-pointer border-2 transition-all duration-200 select-none hover:scale-[1.01] active:scale-[0.99] rounded-2xl",
                    isSelected 
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/5" 
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-xl border", isSelected ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border")}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <span className="font-semibold text-sm">{p.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{p.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full py-6 rounded-2xl font-bold shadow-lg shadow-primary/20">
        Continue to Home Loan Setup
      </Button>
    </form>
  );
}
export default ProfileStep;
