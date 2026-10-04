/**
 * MAISHAA WORKSPACE — Phase 3 Bangladesh Smart Forms & Templates Hub Types
 */

export type FormCategory =
  | 'CV'
  | 'Job Application'
  | 'Office Letter'
  | 'Leave Application'
  | 'Invoice'
  | 'Quotation'
  | 'Business Proposal'
  | 'Meeting Minutes'
  | 'School Form'
  | 'Bank Letter';

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'number'
  | 'email'
  | 'phone'
  | 'address';

export interface FormFieldDefinition {
  id: string;
  name: string;
  label: string;
  labelBn: string;
  type: FormFieldType;
  placeholder?: string;
  placeholderBn?: string;
  required?: boolean;
  defaultValue?: string | number;
  helpText?: string;
  helpTextBn?: string;
  rows?: number;
}

export interface FormDraft {
  templateId: string;
  templateTitle: string;
  formLanguage: 'bn' | 'en';
  values: Record<string, any>;
  savedAt: number;
}

export interface FormTemplate {
  id: string;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  language: 'Bangla' | 'English' | 'Bilingual';
  category: FormCategory;
  categoryBn: string;
  tags: string[];
  fields?: FormFieldDefinition[];
}
