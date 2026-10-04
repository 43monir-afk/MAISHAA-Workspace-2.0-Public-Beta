import React, { useState, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { FormCategory, FormTemplate, FormDraft } from '../../types/forms';
import { FORM_CATEGORIES, SAMPLE_TEMPLATES } from '../../data/formTemplates';
import { FormBuilder } from './FormBuilder';
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  Tag,
  Globe2,
  X,
  FileCheck,
  Building2,
  Sparkles,
} from 'lucide-react';

export const BangladeshFormsHub: React.FC = () => {
  const { language, showNotification } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FormCategory | 'ALL'>('ALL');
  const [activeBuilderTemplate, setActiveBuilderTemplate] = useState<FormTemplate | null>(null);
  const [inMemoryDrafts, setInMemoryDrafts] = useState<Record<string, FormDraft>>({});

  // Filter templates by category and search query
  const filteredTemplates = useMemo(() => {
    return SAMPLE_TEMPLATES.filter((tpl) => {
      const matchesCategory =
        selectedCategory === 'ALL' || tpl.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        tpl.title.toLowerCase().includes(q) ||
        tpl.titleBn.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.descriptionBn.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q) ||
        tpl.categoryBn.toLowerCase().includes(q) ||
        tpl.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  const handleUseTemplate = (template: FormTemplate) => {
    setActiveBuilderTemplate(template);
    showNotification(
      language === 'bn'
        ? `"${template.titleBn}" ফরম বিল্ডার লোড হচ্ছে...`
        : `Opening Form Builder for "${template.title}"...`
    );
  };

  const handleSaveDraft = (draft: FormDraft) => {
    setInMemoryDrafts((prev) => ({
      ...prev,
      [draft.templateId]: draft,
    }));
    showNotification(
      language === 'bn'
        ? 'খসড়া মেমোরিতে সংরক্ষিত হয়েছে'
        : 'Form draft saved in memory'
    );
  };

  // If a template is active, render the Form Builder page/panel
  if (activeBuilderTemplate) {
    return (
      <FormBuilder
        template={activeBuilderTemplate}
        onBack={() => setActiveBuilderTemplate(null)}
        onSaveDraft={handleSaveDraft}
        initialDraft={inMemoryDrafts[activeBuilderTemplate.id] || null}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Hero Banner Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d1e40] via-[#0b1733] to-[#070e24] border border-slate-700/80 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>
                {language === 'bn'
                  ? 'বাংলাদেশ প্রমিত ফরম ও ডকুমেন্ট হাব'
                  : 'Bangladesh Standard Forms & Template Hub'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {language === 'bn'
                ? 'স্মার্ট অফিস ও সরকারি ফরম লাইব্রেরি'
                : 'Bangladesh Smart Forms & Templates'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {language === 'bn'
                ? 'সিভি, সরকারি চাকরির আবেদন, ছুটির দরখাস্ত, স্মারক, ইনভয়েস, কোটেশন ও ব্যাংক পত্রের প্রস্তুতকৃত প্রমিত লেআউট।'
                : 'Standardized and verified layouts for CVs, government job applications, official memos, invoices, quotations, and banking requisitions.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-center">
              <span className="block text-xl font-bold font-mono text-teal-400">
                {SAMPLE_TEMPLATES.length}
              </span>
              <span className="text-[11px] text-slate-400">
                {language === 'bn' ? 'মোট টেমপ্লেট' : 'Templates'}
              </span>
            </div>
            <div className="px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-center">
              <span className="block text-xl font-bold font-mono text-sky-400">
                {FORM_CATEGORIES.length}
              </span>
              <span className="text-[11px] text-slate-400">
                {language === 'bn' ? 'ক্যাটাগরি' : 'Categories'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-4">
        {/* Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'bn'
                ? 'টেমপ্লেটের নাম, ধরন বা কীওয়ার্ড লিখে খুঁজুন (যেমন: CV, সরকারি চাকরি, চালান, দরখাস্ত)...'
                : 'Search templates by title, category, or keyword (e.g. CV, invoice, leave application, quotation)...'
            }
            className="w-full pl-11 pr-10 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 placeholder-slate-400 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-hidden transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
              selectedCategory === 'ALL'
                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md font-bold'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>{language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 font-mono ml-0.5">
              {SAMPLE_TEMPLATES.length}
            </span>
          </button>

          {FORM_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = SAMPLE_TEMPLATES.filter((t) => t.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md font-bold'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
                }`}
              >
                <span>{language === 'bn' ? cat.labelBn : cat.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 font-mono ml-0.5">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Cards Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredTemplates.map((template) => {
            const hasDraft = !!inMemoryDrafts[template.id];

            return (
              <div
                key={template.id}
                className={`flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 bg-slate-900/70 hover:bg-slate-900/90 shadow-lg ${
                  hasDraft
                    ? 'border-teal-500/60 ring-1 ring-teal-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badges: Category & Language */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[11px] font-semibold flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span>
                        {language === 'bn' ? template.categoryBn : template.category}
                      </span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {hasDraft && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-semibold">
                          {language === 'bn' ? 'খসড়া সংরক্ষিত' : 'Draft Saved'}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono flex items-center gap-1">
                        <Globe2 className="w-3 h-3 text-slate-400" />
                        <span>{template.language}</span>
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-base font-bold text-white leading-snug group-hover:text-teal-300 transition-colors">
                      {language === 'bn' ? template.titleBn : template.title}
                    </h3>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {language === 'bn' ? template.title : template.titleBn}
                    </span>
                  </div>

                  {/* Short Description */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {language === 'bn'
                      ? template.descriptionBn
                      : template.description}
                  </p>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {template.id}
                  </span>

                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>
                      {language === 'bn' ? 'Use Template (ব্যবহার করুন)' : 'Use Template'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 space-y-3">
          <FileText className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">
            {language === 'bn'
              ? 'কোনো টেমপ্লেট পাওয়া যায়নি'
              : 'No matching templates found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {language === 'bn'
              ? 'আপনার অনুসন্ধান পরিবর্তন করুন অথবা ফিল্টার রিসেট করুন।'
              : 'Try adjusting your search query or reset the category filter.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            {language === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
          </button>
        </div>
      )}
    </div>
  );
};
