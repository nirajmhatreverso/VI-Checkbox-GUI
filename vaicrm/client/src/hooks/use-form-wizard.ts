// === FORM WIZARD HOOK ===
// Reusable hook for multi-step form functionality

import { useState, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormStep } from '@/lib/form-utils';

export interface UseFormWizardProps {
  steps: FormStep[];
  onComplete: (data: any) => void;
  onStepChange?: (step: number, direction: 'next' | 'prev') => void;
  initialStep?: number;
}

export function useFormWizard({
  steps,
  onComplete,
  onStepChange,
  initialStep = 0,
}: UseFormWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const totalSteps = steps.length;
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Navigation state
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const canGoNext = currentStep < totalSteps - 1;
  const canGoPrev = currentStep > 0;

  // Navigation functions
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      const direction = step > currentStep ? 'next' : 'prev';
      setCurrentStep(step);
      onStepChange?.(step, direction);
    }
  }, [currentStep, totalSteps, onStepChange]);

  const goNext = useCallback(() => {
    if (canGoNext) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onStepChange?.(nextStep, 'next');
    }
  }, [currentStep, canGoNext, onStepChange]);

  const goPrev = useCallback(() => {
    if (canGoPrev) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onStepChange?.(prevStep, 'prev');
    }
  }, [currentStep, canGoPrev, onStepChange]);

  const goToFirst = useCallback(() => {
    goToStep(0);
  }, [goToStep]);

  const goToLast = useCallback(() => {
    goToStep(totalSteps - 1);
  }, [goToStep, totalSteps]);

  // Complete the wizard
  const complete = useCallback((form: UseFormReturn<any>) => {
    const formData = form.getValues();
    onComplete(formData);
  }, [onComplete]);

  // Reset wizard
  const reset = useCallback(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  // Validate current step
  const validateCurrentStep = useCallback(async (form: UseFormReturn<any>) => {
    const currentFields = currentStepData.fields.map(field => field.name);
    return await form.trigger(currentFields);
  }, [currentStepData]);

  // Get completed steps
  const getCompletedSteps = useCallback(() => {
    return Array.from({ length: currentStep }, (_, i) => i);
  }, [currentStep]);

  // Check if step is accessible
  const isStepAccessible = useCallback((step: number) => {
    return step <= currentStep;
  }, [currentStep]);

  // Get step status
  const getStepStatus = useCallback((step: number) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'current';
    return 'upcoming';
  }, [currentStep]);

  return {
    // State
    currentStep,
    currentStepData,
    totalSteps,
    progress,
    
    // Navigation state
    isFirstStep,
    isLastStep,
    canGoNext,
    canGoPrev,
    
    // Navigation functions
    goToStep,
    goNext,
    goPrev,
    goToFirst,
    goToLast,
    
    // Utility functions
    complete,
    reset,
    validateCurrentStep,
    getCompletedSteps,
    isStepAccessible,
    getStepStatus,
  };
}