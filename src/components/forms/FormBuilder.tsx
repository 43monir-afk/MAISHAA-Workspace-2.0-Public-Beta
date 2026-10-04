import React, { useState } from 'react';
import { FormFieldDefinition, FormTemplate, FormDraft } from '../../types/forms';
import { getTemplateFields } from '../../data/formTemplates';
import {
  validateFormBeforeGeneration,
  generateFormDocxBlob,
  generateFormPdfBlob,
  generateSafeFilename,
} from '../../services/formDocumentService';
import { downloadFileOnce } from '../../utils/downloadHelper';

import {
  ArrowLeft,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Languages,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Hash,
  AlignLeft,
  FileText,
  Clock,
  Sparkles,
  Download,
  FileDown,
  Loader2,
} from 'lucide-react';

interface FormBuilderProps {
  template: FormTemplate;
  onBack: () => void;
  onSaveDraft?: (draft: FormDraft) => void;
  initialDraft?: FormDraft | null;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  template,
  onBack,
  onSaveDraft,
  initialDraft,
}) => {
  // Language selector: Bangla / English
  const [formLanguage, setFormLanguage] = useState<'bn' | 'en'>(
    initialDraft?.formLanguage || 'bn'
  );

  // Form field definitions derived from template metadata
  const fields: FormFieldDefinition[] = getTemplateFields(template);

  // Form input values in-memory
  const [formValues, setFormValues] = useState<Record<string, any>>(() => {
    if (initialDraft?.values) {
      return { ...initialDraft.values };
    }
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      initial[f.name] = f.defaultValue !== undefined ? f.defaultValue : '';
    });
    return initial;
  });

  // Validation errors map
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // In-memory draft state
  const [lastSavedDraft, setLastSavedDraft] = useState<FormDraft | null>(
    initialDraft || null
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Document generation state
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [genErrorMsg, setGenErrorMsg] = useState<string | null>(null);

  // Download DOCX Handler
  const handleDownloadDocx = async () => {
    if (isGeneratingDocx || isGeneratingPdf) return;
    setGenErrorMsg(null);
    const valResult = validateFormBeforeGeneration(template, formValues, formLanguage);
    if (!valResult.isValid) {
      setErrors(valResult.errors);
      setGenErrorMsg(
        formLanguage === 'bn'
          ? 'ডকুমেন্ট তৈরির আগে সকল আবশ্যক ফিল্ড সঠিক তথ্য দিয়ে পূরণ করুন।'
          : 'Please complete all required fields correctly before generating document.'
      );
      return;
    }

    try {
      setIsGeneratingDocx(true);
      const blob = await generateFormDocxBlob(template, formValues, formLanguage);
      const filename = generateSafeFilename(template, 'docx', formLanguage);
      await downloadFileOnce(blob, filename);
      setSaveSuccessMsg(
        formLanguage === 'bn'
          ? `DOCX ফাইল প্রস্তুত ও ডাউনলোড সম্পন্ন: ${filename}`
          : `DOCX generated & downloaded: ${filename}`
      );
    } catch (err: any) {
      setGenErrorMsg(err?.message || 'Failed to generate DOCX document.');
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    if (isGeneratingDocx || isGeneratingPdf) return;
    setGenErrorMsg(null);
    const valResult = validateFormBeforeGeneration(template, formValues, formLanguage);
    if (!valResult.isValid) {
      setErrors(valResult.errors);
      setGenErrorMsg(
        formLanguage === 'bn'
          ? 'ডকুমেন্ট তৈরির আগে সকল আবশ্যক ফিল্ড সঠিক তথ্য দিয়ে পূরণ করুন।'
          : 'Please complete all required fields correctly before generating document.'
      );
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const blob = await generateFormPdfBlob(template, formValues, formLanguage);
      const filename = generateSafeFilename(template, 'pdf', formLanguage);
      await downloadFileOnce(blob, filename);
      setSaveSuccessMsg(
        formLanguage === 'bn'
          ? `PDF ফাইল প্রস্তুত ও ডাউনলোড সম্পন্ন: ${filename}`
          : `PDF generated & downloaded: ${filename}`
      );
    } catch (err: any) {
      setGenErrorMsg(err?.message || 'Failed to generate PDF document.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  // Field change handler
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    // Clear error on edit if present
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  // Field blur validation
  const handleFieldBlur = (field: FormFieldDefinition, currentVal?: any) => {
    const val = currentVal !== undefined ? currentVal : formValues[field.name];
    setTouched((prev) => ({ ...prev, [field.name]: true }));
    validateSingleField(field, val);
  };

  // Validate single field according to Step 2B rules
  const validateSingleField = (field: FormFieldDefinition, rawVal: any): string | null => {
    const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;

    // 1. Required Check
    if (field.required && (val === undefined || val === null || val === '')) {
      const err =
        formLanguage === 'bn'
          ? `${field.labelBn} পূরণ করা আবশ্যক`
          : `${field.label} is required`;
      setErrors((prev) => ({ ...prev, [field.name]: err }));
      return err;
    }

    if (val !== undefined && val !== null && val !== '') {
      // 2. Email format validation
      if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(String(val))) {
          const err =
            formLanguage === 'bn'
              ? 'অনুগ্রহ করে সঠিক ইমেইল ঠিকানা দিন (যেমন: name@example.com)'
              : 'Please enter a valid email address (e.g. name@example.com)';
          setErrors((prev) => ({ ...prev, [field.name]: err }));
          return err;
        }
      }

      // 3. Phone sanity validation (min 7 digits, allowed +, -, spaces)
      if (field.type === 'phone') {
        const phoneClean = String(val).replace(/[\s\-\(\)]/g, '');
        const phoneRegex = /^\+?[0-9০-৯]{7,16}$/;
        if (!phoneRegex.test(phoneClean)) {
          const err =
            formLanguage === 'bn'
              ? 'সঠিক মোবাইল বা ফোন নম্বর দিন (কমপক্ষে ৭-১১ ডিজিট)'
              : 'Please enter a valid phone number (at least 7 digits)';
          setErrors((prev) => ({ ...prev, [field.name]: err }));
          return err;
        }
      }

      // 4. Number sanity validation
      if (field.type === 'number') {
        const numVal = Number(val);
        if (isNaN(numVal) || numVal < 0) {
          const err =
            formLanguage === 'bn'
              ? 'অনুগ্রহ করে সঠিক ধনাত্মক সংখ্যা লিখুন'
              : 'Please enter a valid positive number';
          setErrors((prev) => ({ ...prev, [field.name]: err }));
          return err;
        }
      }

      // 5. Text sanity validation (non-whitespace)
      if (field.type === 'text' || field.type === 'address' || field.type === 'textarea') {
        if (typeof val === 'string' && val.trim().length === 0) {
          const err =
            formLanguage === 'bn'
              ? 'শুধুমাত্র ফাঁকা স্পেস গ্রহণযোগ্য নয়'
              : 'Field cannot consist only of whitespace';
          setErrors((prev) => ({ ...prev, [field.name]: err }));
          return err;
        }
      }
    }

    // Clear error if valid
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field.name];
      return next;
    });
    return null;
  };

  // Full form validation
  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    fields.forEach((f) => {
      newTouched[f.name] = true;
      const err = validateSingleField(f, formValues[f.name]);
      if (err) {
        newErrors[f.name] = err;
        isValid = false;
      }
    });

    setTouched(newTouched);
    setErrors(newErrors);
    return isValid;
  };

  // Save Draft in-memory handler
  const handleSaveDraft = () => {
    const isFormValid = validateForm();
    if (!isFormValid) {
      setSaveSuccessMsg(null);
      return;
    }

    const draft: FormDraft = {
      templateId: template.id,
      templateTitle: template.title,
      formLanguage,
      values: { ...formValues },
      savedAt: Date.now(),
    };

    setLastSavedDraft(draft);
    if (onSaveDraft) {
      onSaveDraft(draft);
    }

    const msg =
      formLanguage === 'bn'
        ? `খসড়া (Draft) মেমোরিতে সংরক্ষিত হয়েছে (${new Date(draft.savedAt).toLocaleTimeString()})`
        : `Draft saved in memory successfully at ${new Date(draft.savedAt).toLocaleTimeString()}`;
    setSaveSuccessMsg(msg);
  };

  // Reset form values
  const handleResetForm = () => {
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      initial[f.name] = f.defaultValue !== undefined ? f.defaultValue : '';
    });
    setFormValues(initial);
    setErrors({});
    setTouched({});
    setSaveSuccessMsg(null);
  };

  // Helper to render reusable field types
  const renderField = (field: FormFieldDefinition) => {
    const hasError = !!errors[field.name];
    const value = formValues[field.name] !== undefined ? formValues[field.name] : '';
    const label = formLanguage === 'bn' ? field.labelBn : field.label;
    const placeholder =
      formLanguage === 'bn'
        ? field.placeholderBn || field.placeholder || ''
        : field.placeholder || '';
    const help = formLanguage === 'bn' ? field.helpTextBn : field.helpText;

    const baseInputStyles = `w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-slate-100 placeholder-slate-400 text-sm transition-all outline-hidden ${
      hasError
        ? 'border-rose-500 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 bg-rose-950/10'
        : 'border-slate-700 focus:border-teal-400 focus:ring-1 focus:ring-teal-400'
    }`;

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-teal-400" />
                <span>{label}</span>
                {field.required && <span className="text-rose-400">*</span>}
              </label>
              {field.required && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {formLanguage === 'bn' ? 'আবশ্যক' : 'Required'}
                </span>
              )}
            </div>
            <textarea
              name={field.name}
              rows={field.rows || 4}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={(e) => handleFieldBlur(field, e.target.value)}
              placeholder={placeholder}
              className={`${baseInputStyles} resize-y leading-relaxed`}
            />
            {help && <p className="text-[11px] text-slate-400">{help}</p>}
            {hasError && (
              <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors[field.name]}</span>
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>{label}</span>
                {field.required && <span className="text-rose-400">*</span>}
              </label>
            </div>
            <input
              type="date"
              name={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={(e) => handleFieldBlur(field, e.target.value)}
              className={baseInputStyles}
            />
            {help && <p className="text-[11px] text-slate-400">{help}</p>}
            {hasError && (
              <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors[field.name]}</span>
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-teal-400" />
                <span>{label}</span>
                {field.required && <span className="text-rose-400">*</span>}
              </label>
            </div>
            <input
              type="number"
              name={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={(e) => handleFieldBlur(field, e.target.value)}
              placeholder={placeholder}
              className={baseInputStyles}
            />
            {help && <p className="text-[11px] text-slate-400">{help}</p>}
            {hasError && (
              <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors[field.name]}</span>
              </p>
            )}
          </div>
        );

      case 'email':
        return (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-teal-400" />
                <span>{label}</span>
                {field.required && <span className="text-rose-400">*</span>}
              </label>
            </div>
            <input
              type="email"
              name={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={(e) => handleFieldBlur(field, e.target.value)}
              placeholder={placeholder}
              className={baseInputStyles}
            />
            {help && <p className="text-[11px] text-slate-400">{help}</p>}
            {hasError && (
              <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors[field.name]}</span>
              </p>
            )}
          </div>
        );

      case 'phone':
        return (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-400" />
                <span>{label}</span>
                {field.required && <span className="text-rose-400">*</span>}
              </label>
            </div>
            <input
              type="tel"
              name={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={(e) => handleFieldBlur(field, e.target.value)}
              placeholder={placeholder}
              className={baseInputStyles}
            />
            {help && <p className="text-[11px] text-slate-400">{help}</p>}
            {hasError && (
              <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors[field.name]}</span>
              </p>
            )}
          </div>
        );

      case 'address':
        return (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>{label}</span>
                {field.required && <span className="text-rose-400">*</span>}
              </label>
            </div>
            <input
              type="text"
              name={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={(e) => handleFieldBlur(field, e.target.value)}
              placeholder={placeholder}
              className={baseInputStyles}
            />
            {help && <p className="text-[11px] text-slate-400">{help}</p>}
            {hasError && (
              <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors[field.name]}</span>
              </p>
            )}
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                <span>{label}</span>
                {field.required && <span className="text-rose-400">*</span>}
              </label>
            </div>
            <input
              type="text"
              name={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={(e) => handleFieldBlur(field, e.target.value)}
              placeholder={placeholder}
              className={baseInputStyles}
            />
            {help && <p className="text-[11px] text-slate-400">{help}</p>}
            {hasError && (
              <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors[field.name]}</span>
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{formLanguage === 'bn' ? 'টেমপ্লেটে ফিরুন' : 'Back to Templates'}</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-semibold uppercase">
                {template.category}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ID: {template.id}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              {formLanguage === 'bn' ? template.titleBn : template.title}
            </h2>
          </div>
        </div>

        {/* Language Selector: Bangla / English */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-800/90 border border-slate-700">
            <span className="px-2 text-xs text-slate-400 flex items-center gap-1">
              <Languages className="w-3.5 h-3.5" />
              <span>{formLanguage === 'bn' ? 'ভাষা:' : 'Language:'}</span>
            </span>
            <button
              onClick={() => setFormLanguage('bn')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                formLanguage === 'bn'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              বাংলা (BN)
            </button>
            <button
              onClick={() => setFormLanguage('en')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                formLanguage === 'en'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              English (EN)
            </button>
          </div>
        </div>
      </div>

      {/* Draft Status Banner */}
      {lastSavedDraft && (
        <div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-teal-300">
            <Clock className="w-4 h-4 shrink-0 text-teal-400" />
            <span>
              {formLanguage === 'bn'
                ? `মেমোরি ড্রাফট সংরক্ষিত: ${new Date(lastSavedDraft.savedAt).toLocaleTimeString()} (${Object.keys(lastSavedDraft.values).length} টি ফিল্ড)`
                : `In-memory draft saved: ${new Date(lastSavedDraft.savedAt).toLocaleTimeString()} (${Object.keys(lastSavedDraft.values).length} fields captured)`}
            </span>
          </div>
          {saveSuccessMsg && (
            <span className="text-emerald-400 font-medium">{saveSuccessMsg}</span>
          )}
        </div>
      )}

      {/* Main Form Fields Layout */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" />
            <span>
              {formLanguage === 'bn'
                ? 'ফরমের নির্ধারিত তথ্য ফিল্ডসমূহ'
                : 'Form Structured Metadata Fields'}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {formLanguage === 'bn'
              ? 'টেমপ্লেটের তথ্যানুযায়ী ফিল্ডগুলো পূরণ করুন। খসড়া সংরক্ষণ করতে "Save Draft" বাটন চাপুন।'
              : 'Complete the structured fields for this template. Use "Save Draft" to preserve in-memory progress.'}
          </p>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {fields.map((field) => {
            const isWide = field.type === 'textarea' || field.type === 'address';
            return (
              <div key={field.id} className={isWide ? 'md:col-span-2' : 'col-span-1'}>
                {renderField(field)}
              </div>
            );
          })}
        </div>

        {/* Generation Error Banner */}
        {genErrorMsg && (
          <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/20 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{genErrorMsg}</span>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="pt-6 border-t border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetForm}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{formLanguage === 'bn' ? 'ফিল্ড রিসেট করুন' : 'Reset Form'}</span>
            </button>
            <button
              onClick={onBack}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <span>{formLanguage === 'bn' ? 'বাতিল' : 'Cancel'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{formLanguage === 'bn' ? 'Save Draft' : 'Save Draft'}</span>
            </button>

            {/* Download DOCX Button */}
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isGeneratingDocx || isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isGeneratingDocx ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>
                {formLanguage === 'bn' ? 'Download DOCX (ডাউনলোড)' : 'Download DOCX'}
              </span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingDocx || isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md hover:shadow-teal-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>
                {formLanguage === 'bn' ? 'Download PDF (ডাউনলোড)' : 'Download PDF'}
              </span>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};
