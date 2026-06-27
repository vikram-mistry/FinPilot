import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileStep } from './steps/ProfileStep';
import { LoanStep } from './steps/LoanStep';
import { EmergencyStep } from './steps/EmergencyStep';
import { InvestmentStep } from './steps/InvestmentStep';
import { RecurringExpensesStep } from './steps/RecurringExpensesStep';
import { setDocument, addDocument } from '@/hooks/useFirestore';
import { useAuthStore } from '@/store/authStore';
import { useAppStore, DEFAULT_SETTINGS } from '@/store/appStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'motion/react';
import type { Profile, LoanSetup, EmergencyFund, InvestmentSetup, AppSettings } from '@/types';
import { AlertCircle } from 'lucide-react';

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const user = useAuthStore((s) => s.user);
  const { setProfile, setSettings } = useAppStore();
  const navigate = useNavigate();

  // Onboarding Form States
  const [profileData, setProfileData] = useState<any>(null);
  const [loanData, setLoanData] = useState<LoanSetup | null>(null);
  const [emergencyData, setEmergencyData] = useState<EmergencyFund | null>(null);
  const [investmentData, setInvestmentData] = useState<InvestmentSetup | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalSteps = 5;
  const stepTitles = [
    'User Profile',
    'Home Loan Details',
    'Emergency Fund Goal',
    'Investment Portfolio',
    'Monthly Recurring Expenses',
  ];

  const handleProfileNext = (data: any) => {
    setProfileData(data);
    setStep(2);
  };

  const handleLoanNext = (data: LoanSetup | null) => {
    setLoanData(data);
    setStep(3);
  };

  const handleEmergencyNext = (data: any) => {
    setEmergencyData(data);
    setStep(4);
  };

  const handleInvestmentNext = (data: any) => {
    setInvestmentData(data);
    setStep(5);
  };

  const handleRecurringNext = async (data: { expenses: any[] }) => {
    if (!user) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      // 1. Save Profile
      const profile: Profile = {
        name: profileData.name,
        currency: profileData.currency,
        salaryDate: profileData.salaryDate,
        riskProfile: profileData.riskProfile,
        onboardingComplete: true,
      };
      await setDocument(user.uid, 'profile', profile);

      // 2. Save App Settings
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        currency: profileData.currency,
        salaryDate: profileData.salaryDate,
        riskProfile: profileData.riskProfile,
        emergencyTargetMonths: emergencyData?.targetMonths || 9,
      };
      await setDocument(user.uid, 'settings', settings);

      // 3. Save Home Loan Setup (if present)
      if (loanData) {
        await setDocument(user.uid, 'loanSetup', loanData);
      }

      // 4. Save Emergency Fund
      if (emergencyData) {
        await setDocument(user.uid, 'emergencyFund', emergencyData);
      }

      // 5. Save Investment Setup
      if (investmentData) {
        await setDocument(user.uid, 'investmentSetup', investmentData);
      }

      // 6. Save Recurring Expenses collection
      for (const exp of data.expenses) {
        const recurringExpense = {
          name: exp.name,
          amount: Number(exp.amount),
          category: exp.category,
          active: true,
          pausedUntil: null,
          startMonth: exp.startMonth,
          stopMonth: null,
        };
        await addDocument(user.uid, 'recurringExpenses', recurringExpense);
      }

      // 7. Update Store state & redirect
      setProfile(profile);
      setSettings(settings);
      navigate('/');
    } catch (err: any) {
      console.error('Error during onboarding save:', err);
      setErrorMsg(err.message || 'Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const nextProgress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center bg-slate-950 text-white px-4 py-8 relative overflow-hidden">
      {/* Premium backdrop design */}
      <div className="absolute top-[-25%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-2xl mx-auto space-y-6 relative z-10">
        
        {/* Header Title */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
            Let's Set Up Your FinPilot
          </h2>
          <p className="text-sm text-slate-400">
            Configure your initial income, assets, liabilities, and recurring plans.
          </p>
        </div>

        <Card className="border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl p-6 md:p-8 rounded-3xl">
          <CardHeader className="p-0 pb-6 space-y-4">
            {/* Step Counter Indicator */}
            <div className="flex justify-between items-center text-xs font-semibold text-teal-400">
              <span className="uppercase tracking-wider">Step {step} of {totalSteps}</span>
              <span className="font-bold text-slate-200">{stepTitles[step - 1]}</span>
            </div>
            <Progress value={nextProgress} className="h-2 bg-slate-800 [&>div]:bg-gradient-to-r [&>div]:from-teal-400 [&>div]:to-blue-500 rounded-full" />
          </CardHeader>
          
          <CardContent className="p-0 pt-2">
            {errorMsg && (
              <div className="p-3.5 mb-6 rounded-2xl border border-expense-500/20 bg-expense-50/10 text-expense-500 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {saving ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="relative w-12 h-12">
                  <div className="w-12 h-12 rounded-full border-4 border-teal-500/20 border-t-teal-400 animate-spin" />
                </div>
                <p className="text-sm font-semibold text-slate-300">Synchronizing configurations to Firestore...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {step === 1 && (
                    <ProfileStep onNext={handleProfileNext} defaultValues={profileData} />
                  )}
                  {step === 2 && (
                    <LoanStep onNext={handleLoanNext} defaultValues={loanData || undefined} />
                  )}
                  {step === 3 && (
                    <EmergencyStep onNext={handleEmergencyNext} defaultValues={emergencyData || undefined} />
                  )}
                  {step === 4 && (
                    <InvestmentStep onNext={handleInvestmentNext} defaultValues={investmentData || undefined} />
                  )}
                  {step === 5 && (
                    <RecurringExpensesStep
                      onNext={handleRecurringNext}
                      defaultValues={undefined}
                      loanSetup={loanData}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Back Button helper */}
            {step > 1 && !saving && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="mt-6 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                ← Go back to step {step - 1}
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
export default OnboardingWizard;
