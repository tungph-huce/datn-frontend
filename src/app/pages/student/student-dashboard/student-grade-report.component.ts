import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-student-grade-report',
  templateUrl: './student-grade-report.component.html',
  styleUrls: ['./student-grade-report.component.scss']
})
export class StudentGradeReportComponent implements OnInit, OnChanges {
  @Input() finalResult: any = null;
  @Input() cloDetails: any[] = [];
  @Input() m1Weight: number = 40;
  @Input() m2Weight: number = 60;
  @Input() hasFinalResult: boolean = false;

  isDemoMode: boolean = false;
  displayCloDetails: any[] = [];

  ngOnInit() {
    this.checkAndSetupData();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.checkAndSetupData();
  }

  checkAndSetupData() {
    this.displayCloDetails = this.cloDetails || [];
    this.isDemoMode = false;
  }

  getM1Score(): number | null {
    return this.finalResult?.m1_score ?? null;
  }

  getM2Score(): number | null {
    return this.finalResult?.m2_score ?? null;
  }

  getFinalHpScore(): number | null {
    return this.finalResult?.final_hp_score ?? null;
  }
}
