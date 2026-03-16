// === FORM UTILITIES ===
// Reusable form utilities and validation helpers

import { z } from 'zod';
import { UseFormReturn, FieldValues } from 'react-hook-form';
import { validateEmail, validatePhone, validateTIN } from '@shared/utils';

// === VALIDATION SCHEMAS ===
export const commonValidations = {
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().refine(validatePhone, 'Please enter a valid phone number'),
  tin: z.string().refine(validateTIN, 'Please enter a valid TIN number'),
  currency: z.string().min(3, 'Currency code must be 3 characters'),
  sapBpId: z.string().min(1, 'SAP BP ID is required'),
  sapCaId: z.string().min(1, 'SAP CA ID is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  smartCardNumber: z.string().min(1, 'Smart card number is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  vatRate: z.number().min(0).max(1, 'VAT rate must be between 0 and 1'),
};

// === FORM FIELD CONFIGURATIONS ===
export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: z.ZodType<any>;
  description?: string;
  disabled?: boolean;
  className?: string;
}

// === COMMON FORM FIELD SETS ===
export const personalDetailsFields: FormFieldConfig[] = [
  {
    name: 'title',
    label: 'Title',
    type: 'select',
    options: [
      { value: 'Mr', label: 'Mr.' },
      { value: 'Mrs', label: 'Mrs.' },
      { value: 'Ms', label: 'Ms.' },
      { value: 'Dr', label: 'Dr.' },
      { value: 'Prof', label: 'Prof.' },
    ],
  },
  {
    name: 'firstName',
    label: 'First Name',
    type: 'text',
    required: true,
    validation: z.string().min(2, 'First name must be at least 2 characters'),
  },
  {
    name: 'middleName',
    label: 'Middle Name',
    type: 'text',
  },
  {
    name: 'lastName',
    label: 'Last Name',
    type: 'text',
    required: true,
    validation: z.string().min(2, 'Last name must be at least 2 characters'),
  },
  {
    name: 'gender',
    label: 'Gender',
    type: 'select',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    name: 'dateOfBirth',
    label: 'Date of Birth',
    type: 'date',
  },
];

export const contactDetailsFields: FormFieldConfig[] = [
  {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    required: true,
    validation: commonValidations.email,
  },
  {
    name: 'phone',
    label: 'Phone Number',
    type: 'text',
    required: true,
    validation: commonValidations.phone,
  },
  {
    name: 'altPhone',
    label: 'Alternative Phone',
    type: 'text',
  },
  {
    name: 'mobile',
    label: 'Mobile Number',
    type: 'text',
  },
  {
    name: 'fax',
    label: 'Fax Number',
    type: 'text',
  },
];

export const addressFields: FormFieldConfig[] = [
  {
    name: 'country',
    label: 'Country',
    type: 'select',
    required: true,
    options: [
      { value: 'TZ', label: 'Tanzania' },
      { value: 'KE', label: 'Kenya' },
      { value: 'UG', label: 'Uganda' },
      { value: 'RW', label: 'Rwanda' },
      { value: 'MW', label: 'Malawi' },
      { value: 'ZW', label: 'Zimbabwe' },
    ],
  },
  {
    name: 'region',
    label: 'Region/State',
    type: 'text',
    required: true,
  },
  {
    name: 'city',
    label: 'City',
    type: 'text',
    required: true,
  },
  {
    name: 'district',
    label: 'District',
    type: 'text',
    required: true,
  },
  {
    name: 'ward',
    label: 'Ward',
    type: 'text',
  },
  {
    name: 'address1',
    label: 'Address Line 1',
    type: 'text',
    required: true,
  },
  {
    name: 'address2',
    label: 'Address Line 2',
    type: 'text',
  },
  {
    name: 'postalCode',
    label: 'Postal Code',
    type: 'text',
  },
];

export const businessDetailsFields: FormFieldConfig[] = [
  {
    name: 'orgName',
    label: 'Organization Name',
    type: 'text',
  },
  {
    name: 'tinNumber',
    label: 'TIN Number',
    type: 'text',
    required: true,
    validation: commonValidations.tin,
  },
  {
    name: 'vrnNumber',
    label: 'VRN Number',
    type: 'text',
  },
  {
    name: 'businessType',
    label: 'Business Type',
    type: 'select',
    options: [
      { value: 'individual', label: 'Individual' },
      { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
      { value: 'partnership', label: 'Partnership' },
      { value: 'company', label: 'Company' },
      { value: 'government', label: 'Government' },
      { value: 'ngo', label: 'NGO' },
    ],
  },
];

// === FORM STEP CONFIGURATIONS ===
export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldConfig[];
  validation?: z.ZodType<any>;
}

export const agentOnboardingSteps: FormStep[] = [
  {
    id: 'personal',
    title: 'Personal Details',
    description: 'Enter agent personal information',
    fields: personalDetailsFields,
  },
  {
    id: 'contact',
    title: 'Contact Information',
    description: 'Enter contact details',
    fields: contactDetailsFields,
  },
  {
    id: 'address',
    title: 'Address Details',
    description: 'Enter address information',
    fields: addressFields,
  },
  {
    id: 'business',
    title: 'Business Information',
    description: 'Enter business details',
    fields: businessDetailsFields,
  },
];

export const customerRegistrationSteps: FormStep[] = [
  {
    id: 'personal',
    title: 'Personal Details',
    description: 'Enter customer personal information',
    fields: personalDetailsFields,
  },
  {
    id: 'contact',
    title: 'Contact Information',
    description: 'Enter contact details',
    fields: contactDetailsFields,
  },
  {
    id: 'address',
    title: 'Address Details',
    description: 'Enter address information',
    fields: addressFields,
  },
  {
    id: 'subscription',
    title: 'Subscription Details',
    description: 'Enter subscription information',
    fields: [
      {
        name: 'customerType',
        label: 'Customer Type',
        type: 'select',
        required: true,
        options: [
          { value: 'prepaid', label: 'Prepaid' },
          { value: 'postpaid', label: 'Postpaid' },
        ],
      },
      {
        name: 'serviceType',
        label: 'Service Type',
        type: 'select',
        required: true,
        options: [
          { value: 'individual', label: 'Individual' },
          { value: 'family', label: 'Family' },
          { value: 'business', label: 'Business' },
        ],
      },
      {
        name: 'accountClass',
        label: 'Account Class',
        type: 'select',
        required: true,
        options: [
          { value: 'residential', label: 'Residential' },
          { value: 'commercial', label: 'Commercial' },
          { value: 'corporate', label: 'Corporate' },
        ],
      },
    ],
  },
];

// === FORM UTILITIES ===
export const getFieldError = (form: UseFormReturn<any>, fieldName: string): string | undefined => {
  const error = form.formState.errors[fieldName];
  return error?.message as string;
};

export const hasFieldError = (form: UseFormReturn<any>, fieldName: string): boolean => {
  return !!form.formState.errors[fieldName];
};

export const isFieldDirty = (form: UseFormReturn<any>, fieldName: string): boolean => {
  return form.formState.dirtyFields[fieldName] || false;
};

export const isFieldTouched = (form: UseFormReturn<any>, fieldName: string): boolean => {
  return form.formState.touchedFields[fieldName] || false;
};

export const getFieldValue = (form: UseFormReturn<any>, fieldName: string): any => {
  return form.watch(fieldName);
};

export const setFieldValue = (form: UseFormReturn<any>, fieldName: string, value: any): void => {
  form.setValue(fieldName, value, { shouldDirty: true, shouldValidate: true });
};

export const clearFieldError = (form: UseFormReturn<any>, fieldName: string): void => {
  form.clearErrors(fieldName);
};

export const validateForm = async (form: UseFormReturn<any>): Promise<boolean> => {
  return await form.trigger();
};

export const resetForm = (form: UseFormReturn<any>, defaultValues?: any): void => {
  form.reset(defaultValues);
};

// === FORM SUBMISSION UTILITIES ===
export const createFormSubmitHandler = <T extends FieldValues>(
  onSubmit: (data: T) => void | Promise<void>,
  onError?: (errors: any) => void
) => {
  return async (form: UseFormReturn<T>) => {
    const isValid = await validateForm(form);

    if (isValid) {
      try {
        await onSubmit(form.getValues());
      } catch (error) {

        if (onError) {
          onError(error);
        }
      }
    } else {
      if (onError) {
        onError(form.formState.errors);
      }
    }
  };
};

// === VALIDATION HELPERS ===
export const createValidationSchema = (fields: FormFieldConfig[]): z.ZodObject<any> => {
  const schemaObject: Record<string, z.ZodType<any>> = {};

  fields.forEach(field => {
    if (field.validation) {
      schemaObject[field.name] = field.required
        ? field.validation
        : field.validation.optional();
    } else {
      // Default validations based on field type
      switch (field.type) {
        case 'email':
          schemaObject[field.name] = field.required
            ? commonValidations.email
            : commonValidations.email.optional();
          break;
        case 'number':
          schemaObject[field.name] = field.required
            ? z.number()
            : z.number().optional();
          break;
        default:
          schemaObject[field.name] = field.required
            ? z.string().min(1, `${field.label} is required`)
            : z.string().optional();
      }
    }
  });

  return z.object(schemaObject);
};

// === DYNAMIC FORM GENERATION ===
export const getDefaultFormData = (fields: FormFieldConfig[]): Record<string, any> => {
  const defaultData: Record<string, any> = {};

  fields.forEach(field => {
    switch (field.type) {
      case 'number':
        defaultData[field.name] = 0;
        break;
      case 'checkbox':
        defaultData[field.name] = false;
        break;
      case 'select':
        defaultData[field.name] = field.options?.[0]?.value || '';
        break;
      default:
        defaultData[field.name] = '';
    }
  });

  return defaultData;
};

// === FORM FIELD DEPENDENCIES ===
export interface FieldDependency {
  field: string;
  dependsOn: string;
  condition: (value: any) => boolean;
}

export const evaluateFieldDependencies = (
  dependencies: FieldDependency[],
  formData: Record<string, any>
): Record<string, boolean> => {
  const fieldVisibility: Record<string, boolean> = {};

  dependencies.forEach(dep => {
    const dependentValue = formData[dep.dependsOn];
    fieldVisibility[dep.field] = dep.condition(dependentValue);
  });

  return fieldVisibility;
};

// === INCIDENT FORM UTILITIES ===
export const newIncidentSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  commonFaults: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().min(1, 'Sub Category is required'),
  status: z.string().default('OPEN'),
  priority: z.string().min(1, 'Priority is required'),
  severity: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  configurationItem: z.string().min(1, 'Configuration Item is required'),
  assignmentGroup: z.string().min(1, 'Assignment Group is required'),
  assignedTo: z.string().optional(),
  channel: z.string().default('OTHER'),
  alternateLocation: z.string().optional(),
  alternateContact: z.string().optional(),
  agentId: z.string().optional(),
  agentPhone: z.string().optional(),
  alternatePhone: z.string().optional(),
  shortDescription: z.string().min(1, 'Short Description is required'),
  additionalComments: z.string().min(1, 'Additional Comments is required'),
  parentIncidentId: z.string().optional(),
});

export type IncidentFormData = z.infer<typeof newIncidentSchema>;

/**
 * Transforms incident form data for API submission
 */
export const transformIncidentFormData = (data: IncidentFormData) => {
  // Simple transformation as the controller destructures these fields directly
  return {
    ...data,
    incidentNumber: '', // Will be generated by server or provided separately
    openedBy: 'system', // Default value
    opened: new Date().toISOString(),
    targetResolveDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // Default 72h
  };
};

// === EXPORT HELPERS ===
export const exportFormData = (data: Record<string, any>, filename: string): void => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};