// === DYNAMIC FORM COMPONENT ===
// Reusable form component that renders fields based on configuration

import { ReactNode } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormFieldConfig } from '@/lib/form-utils';
import { LoadingButton } from './loading-spinner';
import { cn } from '@shared/utils';

export interface DynamicFormProps {
  form: UseFormReturn<any>;
  fields: FormFieldConfig[];
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  title?: string;
  description?: string;
  sections?: {
    title: string;
    description?: string;
    fields: string[];
  }[];
  layout?: 'single' | 'two-column' | 'three-column';
  className?: string;
  children?: ReactNode;
}

export function DynamicForm({
  form,
  fields,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Submit',
  title,
  description,
  sections,
  layout = 'single',
  className = '',
  children,
}: DynamicFormProps) {
  const renderField = (field: FormFieldConfig) => {
    return (
      <FormField
        key={field.name}
        control={form.control}
        name={field.name}
        render={({ field: formField }) => (
          <FormItem className={field.className}>
            <FormLabel className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.required && <span className="text-destructive">*</span>}
            </FormLabel>
            <FormControl>
              {renderFieldInput(field, formField)}
            </FormControl>
            {field.description && (
              <FormDescription>{field.description}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  const renderFieldInput = (field: FormFieldConfig, formField: any) => {
    const baseProps = {
      disabled: field.disabled || isSubmitting,
      placeholder: field.placeholder,
      ...formField,
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
        return (
          <Input
            type={field.type}
            {...baseProps}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            {...baseProps}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...baseProps}
          />
        );

      case 'select':
        return (
          <Select
            onValueChange={formField.onChange}
            value={formField.value}
            disabled={baseProps.disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formField.value}
              onCheckedChange={formField.onChange}
              disabled={baseProps.disabled}
            />
            <span className="text-sm">{field.label}</span>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            {...baseProps}
          />
        );

      case 'file':
        return (
          <Input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              formField.onChange(file);
            }}
            disabled={baseProps.disabled}
          />
        );

      default:
        return (
          <Input
            {...baseProps}
          />
        );
    }
  };

  const getLayoutClass = () => {
    switch (layout) {
      case 'two-column':
        return 'grid grid-cols-1 md:grid-cols-2 gap-4';
      case 'three-column':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
      default:
        return 'space-y-4';
    }
  };

  const renderFieldsBySection = () => {
    if (sections) {
      return sections.map((section, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            {section.description && (
              <CardDescription>{section.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className={getLayoutClass()}>
              {section.fields.map((fieldName) => {
                const field = fields.find(f => f.name === fieldName);
                return field ? renderField(field) : null;
              })}
            </div>
          </CardContent>
        </Card>
      ));
    }

    return (
      <div className={getLayoutClass()}>
        {fields.map(renderField)}
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          )}
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {renderFieldsBySection()}

        {children}

        <div className="flex items-center justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isSubmitting}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !form.formState.isValid}
            className="min-w-[100px]"
          >
            {isSubmitting ? <LoadingButton /> : submitLabel}
          </Button>
        </div>
      </form>

      {/* Form State Debug (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Form Debug Info
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify(
              {
                values: form.watch(),
                errors: form.formState.errors,
                isDirty: form.formState.isDirty,
                isValid: form.formState.isValid,
                isSubmitting: form.formState.isSubmitting,
              },
              null,
              2
            )}
          </pre>
        </details>
      )}
    </div>
  );
}