import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { DepartmentCampaignService } from '../../../core/services/department-campaign.service';
import { TrainingProgramService } from '../../../core/services/training-program.service';
import { CampaignService } from '../../../core/services/campaign.service';
import { AuthService } from '../../../core/services/auth.service';

import { CloRubricConfigComponent } from './clo-rubric-config.component';

describe('CloRubricConfigComponent', () => {
  let component: CloRubricConfigComponent;
  let fixture: ComponentFixture<CloRubricConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, HttpClientTestingModule, RouterTestingModule],
      declarations: [ CloRubricConfigComponent ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
    .compileComponents();

    spyOn(TestBed.inject(TrainingProgramService), 'getAll').and.returnValue(of([]));
    spyOn(TestBed.inject(CampaignService), 'getCampaignOptions').and.returnValue(of([]));
    spyOn(TestBed.inject(AuthService), 'getCurrentUser').and.returnValue(null);
    fixture = TestBed.createComponent(CloRubricConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  async function enterWeight(label: string, value: number | null): Promise<HTMLInputElement> {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
    input.value = value === null ? '' : String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return input;
  }

  function saveButton(): HTMLButtonElement {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(button => button.textContent?.includes('Lưu bộ CLO mới'))!;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the total at 100 when M3 increases from 50 to 60', async () => {
    await enterWeight('Trọng số M3 chung', 60);
    expect([component.m1Weight, component.m2Weight, component.m3Weight]).toEqual([20, 20, 60]);
    expect(component.totalStageWeight).toBe(100);
    expect(component.isStageWeightValid).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[aria-label="Trọng số M2 chung"]')!.value).toBe('20');
  });

  it('balances the other stages after editing any stage, including decreases', async () => {
    await enterWeight('Trọng số M1 chung', 35);
    expect([component.m1Weight, component.m2Weight, component.m3Weight]).toEqual([35, 30, 35]);
    await enterWeight('Trọng số M2 chung', 45);
    expect([component.m1Weight, component.m2Weight, component.m3Weight]).toEqual([35, 45, 20]);
    await enterWeight('Trọng số M3 chung', 10);
    expect([component.m1Weight, component.m2Weight, component.m3Weight]).toEqual([35, 55, 10]);
    expect(component.totalStageWeight).toBe(100);
  });

  it('clamps pasted values and corrects the visible input even when the model stays at 100', async () => {
    await enterWeight('Trọng số M3 chung', 120);
    expect([component.m1Weight, component.m2Weight, component.m3Weight]).toEqual([0, 0, 100]);
    const input = await enterWeight('Trọng số M3 chung', 110);
    expect(input.value).toBe('100');
    expect(component.totalStageWeight).toBe(100);
    const negative = await enterWeight('Trọng số M1 chung', -10);
    expect(negative.value).toBe('0');
    expect(component.isStageWeightValid).toBeTrue();
  });

  it('allows a single stage to reach 100 without making another stage negative', async () => {
    await enterWeight('Trọng số M1 chung', 90);
    expect([component.m1Weight, component.m2Weight, component.m3Weight]).toEqual([90, 10, 0]);
    await enterWeight('Trọng số M2 chung', 100);
    expect([component.m1Weight, component.m2Weight, component.m3Weight]).toEqual([0, 100, 0]);
    expect(component.isStageWeightValid).toBeTrue();
  });

  it('keeps decimal weights valid and balances an emptied input', async () => {
    await enterWeight('Trọng số M1 chung', 33.33);
    await enterWeight('Trọng số M2 chung', 33.33);
    expect([component.m1Weight, component.m2Weight, component.m3Weight]).toEqual([33.33, 33.33, 33.34]);
    expect(component.totalStageWeight).toBe(100);
    expect(component.isStageWeightValid).toBeTrue();
    await enterWeight('Trọng số M1 chung', null);
    expect(component.m1Weight).toBe(0);
    expect(component.isStageWeightValid).toBeTrue();
  });

  it('balances an individual CLO without modifying other CLOs or the shared defaults', async () => {
    component.cloCount = 2;
    component.defineCloCount();
    fixture.detectChanges();
    await fixture.whenStable();
    await enterWeight('Trọng số M3 CLO1', 60);
    expect([component.clos[0].m1_weight, component.clos[0].m2_weight, component.clos[0].m3_weight]).toEqual([20, 20, 60]);
    expect([component.clos[1].m1_weight, component.clos[1].m2_weight, component.clos[1].m3_weight]).toEqual([20, 30, 50]);
    expect([component.m1Weight, component.m2Weight, component.m3Weight]).toEqual([20, 30, 50]);
    expect(component.areCloStageWeightsValid).toBeTrue();
  });

  it('preserves a valid 0/0/100 configuration when loading CLOs', () => {
    component.m1Weight = 0;
    component.m2Weight = 0;
    component.m3Weight = 100;
    component.departmentCampaignId = 1;
    const service = TestBed.inject(DepartmentCampaignService);
    spyOn(service, 'getCloConfigs').and.returnValue(of([component.createEmptyClo(1)]));
    component.loadCloConfigs();
    expect([component.m1Weight, component.m2Weight, component.m3Weight]).toEqual([0, 0, 100]);
    expect(component.isStageWeightValid).toBeTrue();
  });

  it('sends balanced shared and individual weights when saving', async () => {
    component.departmentCampaignId = 1;
    component.majorId = 2;
    component.programId = 3;
    component.programs = [{ id: 3, code: 'STANDARD', name: 'Chuẩn', description: '', grading_type: 'STANDARD', in_use: false }];
    component.newCloSetName = 'Bộ CLO';
    component.cloCount = 1;
    component.defineCloCount();
    fixture.detectChanges();
    await fixture.whenStable();
    await enterWeight('Trọng số M3 chung', 60);
    await enterWeight('Trọng số M3 CLO1', 60);
    const save = spyOn(TestBed.inject(DepartmentCampaignService), 'saveCloConfigs').and.returnValue(of([]));
    spyOn(component, 'loadCloSets').and.stub();
    spyOn(component, 'loadCloConfigs').and.stub();
    expect(saveButton().disabled).toBeFalse();
    saveButton().click();
    expect(save).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      m1_weight: 20, m2_weight: 20, m3_weight: 60,
      clos: [jasmine.objectContaining({ m1_weight: 20, m2_weight: 20, m3_weight: 60 })]
    }));
  });

  it('rejects invalid existing weights instead of enabling save', () => {
    component.m3Weight = 60;
    expect(component.isStageWeightValid).toBeFalse();
    component.m3Weight = 50;
    component.clos = [component.createEmptyClo(1)];
    component.clos[0].m3_weight = 60;
    expect(component.areCloStageWeightsValid).toBeFalse();
    fixture.detectChanges();
    expect(saveButton().disabled).toBeTrue();
  });
});
