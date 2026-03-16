// === REUSABLE FORM WIZARD COMPONENT ===
// Multi-step form component with progress indicator

import { ReactNode } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, ArrowLeft, ArrowRight } from 'lucide-react';
import { FormStep } from '@/lib/form-utils';
import { useFormWizard } from '@/hooks/use-form-wizard';
import { cn } from '@shared/utils';

export interface FormWizardProps {
  steps: FormStep[];
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  onStepChange?: (step: number, direction: 'next' | 'prev') => void;
  isSubmitting?: boolean;
  title?: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}

export function FormWizard({
  steps,
  form,
  onSubmit,
  onStepChange,
  isSubmitting = false,
  title,
  description,
  className,
  children,
}: FormWizardProps) {
  const {
    currentStep,
    currentStepData,
    isFirstStep,
    isLastStep,
    totalSteps,
    progress,
    canGoNext,
    canGoPrev,
    goToStep,
    goNext,
    goPrev,
    complete,
  } = useFormWizard({
    steps,
    onComplete: onSubmit,
    onStepChange,
  });

  const handleNext = async () => {
    // Validate current step fields
    const currentFields = currentStepData.fields.map(field => field.name);
    const isValid = await form.trigger(currentFields);
    
    if (isValid) {
      goNext();
    }
  };

  const handlePrev = () => {
    goPrev();
  };

  const handleStepClick = async (stepIndex: number) => {
    if (stepIndex < currentStep) {
      goToStep(stepIndex);
    } else if (stepIndex > currentStep) {
      // Validate all previous steps before jumping ahead
      let canJump = true;
      for (let i = currentStep; i < stepIndex; i++) {
        const stepFields = steps[i].fields.map(field => field.name);
        const isStepValid = await form.trigger(stepFields);
        if (!isStepValid) {
          canJump = false;
          break;
        }
      }
      if (canJump) {
        goToStep(stepIndex);
      }
    }
  };

  const handleSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      complete(form);
    }
  };

  return (
    <div className={cn('max-w-4xl mx-auto space-y-6', className)}>
      {/* Header */}
      {(title || description) && (
        <div className="text-center space-y-2">
          {title && <h1 className="text-2xl font-bold">{title}</h1>}
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress} className="w-full" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep + 1} of {totalSteps}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center justify-center space-x-4 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isAccessible = index <= currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center space-x-2 cursor-pointer transition-colors',
                isAccessible ? 'hover:text-primary' : 'cursor-not-allowed opacity-50'
              )}
              onClick={() => isAccessible && handleStepClick(index)}
            >
              <div className="flex items-center space-x-2">
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className={cn(
                    'h-5 w-5',
                    isCurrent ? 'text-primary fill-primary' : 'text-muted-foreground'
                  )} />
                )}
                <div className="flex flex-col items-start">
                  <span className={cn(
                    'text-sm font-medium',
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 h-px bg-border mx-2" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>{currentStepData.title}</span>
                <Badge variant="outline">{currentStep + 1}/{totalSteps}</Badge>
              </CardTitle>
              {currentStepData.description && (
                <CardDescription className="mt-1">
                  {currentStepData.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Custom content or default field rendering */}
          {children || (
            <div className="grid gap-4">
              {currentStepData.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </label>
                  {/* This would need to be implemented based on field type */}
                  <div className="text-sm text-muted-foreground">
                    Field rendering would be implemented here based on field.type
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={isFirstStep || isSubmitting}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        <div className="flex items-center space-x-2">
          {!isLastStep ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext || isSubmitting}
              className="flex items-center space-x-2"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Complete</span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Form Validation Errors */}
      {Object.keys(form.formState.errors).length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-sm">
              Please fix the following errors:
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-destructive">
              {Object.entries(form.formState.errors).map(([field, error]) => (
                <li key={field}>
                  • {error?.message as string}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}