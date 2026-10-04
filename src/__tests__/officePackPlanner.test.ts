import { describe, it, expect } from 'vitest';
import { buildOfficePackPlan, isSourceFileSupported } from '../services/officePackPlanner';
import { OFFICE_PACKS } from '../data/officePacks';
import { PlannedOutput } from '../types/officePack';

describe('Phase 3 Step 3B — One-Click Office Pack Workflow Planner', () => {
  const projectPack = OFFICE_PACKS.find((p) => p.id === 'project_report')!;
  const businessPack = OFFICE_PACKS.find((p) => p.id === 'business')!;

  it('generates complete 9-step plan for Project Report Pack with all 4 outputs enabled', () => {
    const mockFile = { name: 'annual_budget.xlsx', size: 1024 * 50, type: 'application/vnd.ms-excel' };
    const allOutputs = projectPack.defaultOutputs.map((o) => ({ ...o, enabled: true }));

    const plan = buildOfficePackPlan(mockFile, 'project_report', allOutputs);

    expect(plan.packType).toBe('project_report');
    expect(plan.sourceFileName).toBe('annual_budget.xlsx');
    expect(plan.isSourceSupported).toBe(true);
    expect(plan.totalSteps).toBe(9);

    // Verify all 9 steps match the exact required sequence and tiers
    expect(plan.steps[0].title).toBe('Detect source file');
    expect(plan.steps[0].tier).toBe('LOCAL');
    expect(plan.steps[0].status).toBe('READY');

    expect(plan.steps[1].title).toBe('Extract source content');
    expect(plan.steps[1].tier).toBe('LOCAL');
    expect(plan.steps[1].status).toBe('READY');

    expect(plan.steps[2].title).toBe('Prepare report structure');
    expect(plan.steps[2].tier).toBe('LOCAL');
    expect(plan.steps[2].status).toBe('PLANNED');

    expect(plan.steps[3].title).toBe('AI summary if needed');
    expect(plan.steps[3].tier).toBe('CLOUD AI');
    expect(plan.steps[3].requiresAiConsent).toBe(true);
    expect(plan.steps[3].status).toBe('PLANNED');

    expect(plan.steps[4].title).toBe('Prepare DOCX');
    expect(plan.steps[4].tier).toBe('LOCAL');
    expect(plan.steps[4].status).toBe('PLANNED');

    expect(plan.steps[5].title).toBe('Prepare PDF');
    expect(plan.steps[5].tier).toBe('LOCAL');
    expect(plan.steps[5].status).toBe('PLANNED');

    expect(plan.steps[6].title).toBe('Prepare XLSX summary');
    expect(plan.steps[6].tier).toBe('LOCAL');
    expect(plan.steps[6].status).toBe('PLANNED');

    expect(plan.steps[7].title).toBe('Prepare PPTX presentation');
    expect(plan.steps[7].tier).toBe('LOCAL');
    expect(plan.steps[7].status).toBe('PLANNED');

    expect(plan.steps[8].title).toBe('Package outputs');
    expect(plan.steps[8].tier).toBe('LOCAL');
    expect(plan.steps[8].status).toBe('PLANNED');
  });

  it('only includes steps needed for selected outputs', () => {
    const mockFile = { name: 'market_strategy.docx', size: 1024 * 80 };

    // Select ONLY DOCX and PDF (disable XLSX and PPTX)
    const selectiveOutputs: PlannedOutput[] = businessPack.defaultOutputs.map((o) => ({
      ...o,
      enabled: o.format === 'docx' || o.format === 'pdf',
    }));

    const plan = buildOfficePackPlan(mockFile, 'business', selectiveOutputs);

    expect(plan.totalSteps).toBe(7); // 4 base steps + 2 output steps (DOCX, PDF) + 1 package step
    const stepTitles = plan.steps.map((s) => s.title);

    expect(stepTitles).toContain('Prepare DOCX');
    expect(stepTitles).toContain('Prepare PDF');
    expect(stepTitles).not.toContain('Prepare XLSX summary');
    expect(stepTitles).not.toContain('Prepare PPTX presentation');
  });

  it('enforces AI consent requirement flag on any cloud AI step', () => {
    const mockFile = { name: 'meeting_notes.txt', size: 2048 };
    const outputs = projectPack.defaultOutputs;

    const plan = buildOfficePackPlan(mockFile, 'project_report', outputs);
    const cloudSteps = plan.steps.filter((s) => s.tier === 'CLOUD AI');

    expect(cloudSteps.length).toBeGreaterThanOrEqual(1);
    cloudSteps.forEach((s) => {
      expect(s.requiresAiConsent).toBe(true);
    });
  });

  it('flags unsupported file capability with NOT SUPPORTED', () => {
    expect(isSourceFileSupported('malware.exe')).toBe(false);
    expect(isSourceFileSupported('system.bin')).toBe(false);
    expect(isSourceFileSupported('project_plan.docx')).toBe(true);
    expect(isSourceFileSupported('notes.pdf')).toBe(true);

    const unsupportedFile = { name: 'firmware.bin', size: 5000 };
    const plan = buildOfficePackPlan(unsupportedFile, 'project_report', projectPack.defaultOutputs);

    expect(plan.isSourceSupported).toBe(false);
    expect(plan.unsupportedReason).toBeDefined();

    // Steps reflect NOT SUPPORTED status for unsupported input
    const detectStep = plan.steps.find((s) => s.id === 'step_detect_source')!;
    expect(detectStep.status).toBe('NOT SUPPORTED');

    const extractStep = plan.steps.find((s) => s.id === 'step_extract_content')!;
    expect(extractStep.status).toBe('NOT SUPPORTED');
  });

  it('initializes plan with isConfirmed: false ensuring no fake execution', () => {
    const mockFile = { name: 'study_material.pdf', size: 1024 * 30 };
    const plan = buildOfficePackPlan(mockFile, 'study', projectPack.defaultOutputs);

    expect(plan.isConfirmed).toBe(false);
  });
});
