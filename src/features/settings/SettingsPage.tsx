import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDocument, useCollection, setDocument, addDocument, deleteDocument } from '@/hooks/useFirestore';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowUp, ArrowDown, Download, Upload, ShieldCheck, Moon, Sun, Monitor, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatCurrency, getCurrentMonth } from '@/lib/formatters';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { Profile, AppSettings, RecurringExpense } from '@/types';

const schema = z.object({
  name: z.string().min(2, { message: 'Name is required' }),
  currency: z.string(),
  salaryDate: z.coerce.number().min(1).max(31),
  riskProfile: z.enum(['conservative', 'balanced', 'aggressive']),
  investmentPreference: z.enum(['sip-first', 'prepayment-first', 'balanced']),
  emergencyTargetMonths: z.coerce.number().min(1).max(36),
  theme: z.enum(['light', 'dark', 'system']),
});

type FormValues = z.infer<typeof schema>;

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { profile, settings, setProfile, setSettings } = useAppStore();

  const {
    control,
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile?.name || '',
      currency: profile?.currency || 'INR',
      salaryDate: profile?.salaryDate || 1,
      riskProfile: profile?.riskProfile || 'balanced',
      investmentPreference: settings?.investmentPreference || 'balanced',
      emergencyTargetMonths: settings?.emergencyTargetMonths || 9,
      theme: settings?.theme || 'system',
    },
  });

  const formValues = watch();

  const handleSaveSettings = async (data: FormValues) => {
    if (!user) return;

    try {
      const updatedProfile: Profile = {
        name: data.name,
        currency: data.currency,
        salaryDate: data.salaryDate,
        riskProfile: data.riskProfile,
        onboardingComplete: true,
      };

      const updatedSettings: AppSettings = {
        currency: data.currency,
        salaryDate: data.salaryDate,
        riskProfile: data.riskProfile,
        theme: data.theme,
        emergencyTargetMonths: data.emergencyTargetMonths,
        investmentPreference: data.investmentPreference,
        advisorPriorities: settings?.advisorPriorities || ['expenses', 'emergency', 'investments', 'prepayment', 'buffer'],
      };

      // 1. Write to firestore
      await setDocument(user.uid, 'profile', updatedProfile);
      await setDocument(user.uid, 'settings', updatedSettings);

      // 2. Update local Zustand stores
      setProfile(updatedProfile);
      setSettings(updatedSettings);

      alert('Configurations updated successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to update configurations.');
    }
  };

  // Reorder priorities up/down
  const handleMovePriority = async (index: number, direction: 'up' | 'down') => {
    if (!user || !settings) return;
    const priorities = [...settings.advisorPriorities];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= priorities.length) return;

    // Swap elements
    const temp = priorities[index];
    priorities[index] = priorities[targetIdx]!;
    priorities[targetIdx] = temp!;

    const updatedSettings = {
      ...settings,
      advisorPriorities: priorities,
    };

    await setDocument(user.uid, 'settings', updatedSettings);
    setSettings(updatedSettings);
  };

  // Export JSON Dump
  const handleExportData = async () => {
    if (!user) return;
    try {
      // Fetch documents individually
      const profileSnap = await getDoc(doc(db, 'users', user.uid, 'profile', 'profile'));
      const settingsSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'settings'));
      const loanSetupSnap = await getDoc(doc(db, 'users', user.uid, 'loanSetup', 'loanSetup'));
      const emergencySnap = await getDoc(doc(db, 'users', user.uid, 'emergencyFund', 'emergencyFund'));
      const investSnap = await getDoc(doc(db, 'users', user.uid, 'investmentSetup', 'investmentSetup'));

      const backupData = {
        profile: profileSnap.exists() ? profileSnap.data() : null,
        settings: settingsSnap.exists() ? settingsSnap.data() : null,
        loanSetup: loanSetupSnap.exists() ? loanSetupSnap.data() : null,
        emergencyFund: emergencySnap.exists() ? emergencySnap.data() : null,
        investmentSetup: investSnap.exists() ? investSnap.data() : null,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `finpilot_backup_${new Date().toISOString().substring(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to export data.');
    }
  };

  // Import JSON Dump
  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], 'UTF-8');
    fileReader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.profile) await setDocument(user.uid, 'profile', data.profile);
        if (data.settings) await setDocument(user.uid, 'settings', data.settings);
        if (data.loanSetup) await setDocument(user.uid, 'loanSetup', data.loanSetup);
        if (data.emergencyFund) await setDocument(user.uid, 'emergencyFund', data.emergencyFund);
        if (data.investmentSetup) await setDocument(user.uid, 'investmentSetup', data.investmentSetup);
        
        // Refresh local store
        if (data.profile) setProfile(data.profile);
        if (data.settings) setSettings(data.settings);
        
        alert('Database restored successfully. Please refresh the page.');
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Failed to import backup file. Ensure it is a valid backup JSON.');
      }
    };
  };

  const handleSeedData = async () => {
    if (!user) return;
    try {
      const historicalData = [
        { month: '2026-01', income: 256525, expense: 184249 },
        { month: '2026-02', income: 186464, expense: 98841 },
        { month: '2026-03', income: 169881, expense: 152496 },
        { month: '2026-04', income: 182242, expense: 431221 },
        { month: '2026-05', income: 182242, expense: 180918 },
        { month: '2026-06', income: 182242, expense: 122000 },
      ];

      for (const item of historicalData) {
        const record = {
          salaryIncome: item.income,
          bonusIncome: 0,
          otherIncome: 0,
          sodexoDeduction: 0,
          otherDeductions: 0,
          oneTimeExpenses: [
            { category: 'custom', description: 'Historical monthly expenses', amount: item.expense }
          ],
          recurringExpensesSnapshot: [],
          plannedSIP: 0,
          actualSIP: 0,
          plannedPrepayment: 0,
          actualPrepayment: 0,
          plannedEmergencyContribution: 0,
          actualEmergencyContribution: 0,
          finalized: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await setDocument(user.uid, `monthlyRecords/${item.month}`, record);
      }

      alert('Jan-Jun 2026 historical data seeded successfully!');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to seed historical data.');
    }
  };

  // Recurring Commitments Form State & Logic
  const { data: recurringExpenses = [] } = useCollection<RecurringExpense>('recurringExpenses');
  const [newCommitOpen, setNewCommitOpen] = useState(false);
  const commitSchema = z.object({
    name: z.string().min(2, { message: 'Name is required' }),
    category: z.string().min(1),
    amount: z.number().min(1, { message: 'Amount must be positive' }),
  });

  const {
    register: registerCommit,
    handleSubmit: handleCommitSubmit,
    control: commitControl,
    reset: resetCommit,
    formState: { errors: commitErrors }
  } = useForm<{ name: string; category: string; amount: number }>({
    resolver: zodResolver(commitSchema),
    defaultValues: {
      name: '',
      category: 'Other',
      amount: 1000,
    }
  });

  const onAddCommitment = async (data: { name: string; category: string; amount: number }) => {
    if (!user) return;
    try {
      await addDocument(user.uid, 'recurringExpenses', {
        name: data.name,
        category: data.category,
        amount: data.amount,
        active: true,
        pausedUntil: null,
        startMonth: getCurrentMonth(),
        stopMonth: null,
      });
      resetCommit();
      setNewCommitOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const onDeleteCommitment = async (id: string) => {
    if (!user) return;
    try {
      await deleteDocument(user.uid, `recurringExpenses/${id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div>
        <span className="text-xs font-bold text-primary tracking-wider uppercase">Configurations</span>
        <h2 className="text-2xl font-bold mt-1 text-foreground">App Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your user profile parameters, financial rules, themes, and database imports.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Config Forms Column */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit(handleSaveSettings)} className="space-y-6">
            
            {/* User Profile Form */}
            <Card className="rounded-2xl border border-border bg-card">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold">User Profile Settings</CardTitle>
                <CardDescription className="text-xs">Update your basic name and salary date details</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-xs text-expense-500">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="salaryDate">Payday (Day of Month)</Label>
                  <Select
                    defaultValue={String(formValues.salaryDate)}
                    onValueChange={(val) => setValue('salaryDate', Number(val), { shouldDirty: true })}
                  >
                    <SelectTrigger id="salaryDate">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>Day {d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Financial Parameters Form */}
            <Card className="rounded-2xl border border-border bg-card">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold">Financial Planner Rules</CardTitle>
                <CardDescription className="text-xs">Adjust how surplus allocations are divided up</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Risk Profile */}
                  <div className="space-y-1.5">
                    <Label>Risk Profile Category</Label>
                    <Select
                      defaultValue={formValues.riskProfile}
                      onValueChange={(val) => setValue('riskProfile', val as any, { shouldDirty: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative (SIP: 10-15%)</SelectItem>
                        <SelectItem value="balanced">Balanced (SIP: 15-25%)</SelectItem>
                        <SelectItem value="aggressive">Aggressive (SIP: 25-35%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preference */}
                  <div className="space-y-1.5">
                    <Label>Allocation Allocation Preference</Label>
                    <Select
                      defaultValue={formValues.investmentPreference}
                      onValueChange={(val) => setValue('investmentPreference', val as any, { shouldDirty: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="balanced">Split Evenly (Balanced)</SelectItem>
                        <SelectItem value="sip-first">Prioritize SIP Mutual Funds</SelectItem>
                        <SelectItem value="prepayment-first">Prioritize Home Loan Principal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Emergency Target Months */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="emergencyTargetMonths">Emergency Fund Target (Months)</Label>
                    <Input id="emergencyTargetMonths" type="number" {...register('emergencyTargetMonths')} />
                    {errors.emergencyTargetMonths && <p className="text-xs text-expense-500">{errors.emergencyTargetMonths.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appearance Theme Selector */}
            <Card className="rounded-2xl border border-border bg-card">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold">Appearance Settings</CardTitle>
                <CardDescription className="text-xs">Adjust interface display theme colors</CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'light', label: 'Light Theme', icon: Sun },
                    { value: 'dark', label: 'Dark Theme', icon: Moon },
                    { value: 'system', label: 'System Default', icon: Monitor },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSel = formValues.theme === t.value;
                    return (
                      <Card
                        key={t.value}
                        onClick={() => setValue('theme', t.value as any, { shouldDirty: true })}
                        className={cn(
                          "cursor-pointer border-2 transition-all text-center rounded-2xl select-none hover:scale-[1.01] active:scale-[0.99]",
                          isSel ? "border-primary bg-primary/5 font-semibold" : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <CardContent className="p-4 flex flex-col items-center gap-2">
                          <Icon className={cn("w-5 h-5", isSel ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-xs text-foreground">{t.label}</span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button type="submit" disabled={!isDirty} className="w-full rounded-xl font-bold py-5 shadow-md shadow-primary/10">
                  Save Settings Changes
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>

        {/* Advisor Priorities and Backup Sidebar Column */}
        <div className="space-y-6">
          
          {/* Advisor Allocator Priorities list */}
          {settings && (
            <Card className="rounded-2xl border border-border bg-card">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold">Smart Allocation Rules</CardTitle>
                <CardDescription className="text-xs">Priority order used for allocating surplus cash</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-2">
                {settings.advisorPriorities.map((item: string, idx: number) => (
                  <div key={item} className="flex justify-between items-center text-xs font-semibold bg-muted/40 p-3 rounded-xl border">
                    <span className="capitalize text-foreground">{item}</span>
                    <div className="flex gap-1">
                      {idx > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMovePriority(idx, 'up')}
                          className="w-8 h-8 rounded-lg"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {idx < settings.advisorPriorities.length - 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMovePriority(idx, 'down')}
                          className="w-8 h-8 rounded-lg"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Monthly Recurring Commitments Manager */}
          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader className="pb-3 border-b flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold">Monthly Commitments</CardTitle>
                <CardDescription className="text-xs">Manage recurring loaded expenses</CardDescription>
              </div>
              <Dialog open={newCommitOpen} onOpenChange={setNewCommitOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl gap-1 font-semibold text-xs ml-auto">
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl border border-border">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-foreground">Add Recurring Commitment</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCommitSubmit(onAddCommitment)} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="commitName">Commitment Name</Label>
                      <Input id="commitName" placeholder="e.g. Rent, Gym, Insurance" {...registerCommit('name')} />
                      {commitErrors.name && <p className="text-xs text-expense-500">{commitErrors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Controller
                        control={commitControl}
                        name="category"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Food & Dining">Food & Dining</SelectItem>
                              <SelectItem value="Bills & Utilities">Bills & Utilities</SelectItem>
                              <SelectItem value="Discretionary">Discretionary</SelectItem>
                              <SelectItem value="EMI">EMI</SelectItem>
                              <SelectItem value="SIP">SIP</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Amount</Label>
                      <Controller
                        control={commitControl}
                        name="amount"
                        render={({ field }) => (
                          <CurrencyInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="e.g. 15,000"
                          />
                        )}
                      />
                      {commitErrors.amount && <p className="text-xs text-expense-500">{commitErrors.amount.message}</p>}
                    </div>
                    <Button type="submit" className="w-full rounded-2xl py-6 font-bold shadow-lg shadow-primary/20 mt-4">
                      Save Commitment
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="pt-5 p-0 max-h-[300px] overflow-y-auto pr-1">
              {recurringExpenses.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No recurring expenses configured.</p>
              ) : (
                <div className="divide-y divide-border">
                  {recurringExpenses.map((exp: any) => (
                    <div key={exp.id} className="flex justify-between items-center text-xs font-semibold px-6 py-3.5 hover:bg-muted/10">
                      <div className="space-y-0.5">
                        <p className="text-foreground">{exp.name}</p>
                        <p className="text-[10px] text-muted-foreground font-normal uppercase">{exp.category}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-foreground font-bold">{formatCurrency(exp.amount)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteCommitment(exp.id)}
                          className="text-expense-500 hover:text-expense-600 hover:bg-expense-50 dark:hover:bg-expense-950/20 rounded-xl w-8 h-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Backup Restore controls */}
          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold">Database Management</CardTitle>
              <CardDescription className="text-xs">Backup and restore database dumps locally</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              
              <Button
                variant="outline"
                onClick={handleExportData}
                className="w-full gap-2 rounded-xl py-5 font-semibold text-xs border-border hover:bg-muted"
              >
                <Download className="w-4 h-4 text-primary" />
                <span>Export All Data (JSON)</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleSeedData}
                className="w-full gap-2 rounded-xl py-5 font-semibold text-xs border-border hover:bg-muted"
              >
                <Plus className="w-4 h-4 text-primary" />
                <span>Seed Jan-Jun 2026 Data</span>
              </Button>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Import Backup Dump</Label>
                <div className="relative">
                  <Input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="h-10 text-xs rounded-xl bg-muted/20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
export default SettingsPage;
