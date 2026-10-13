import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
@Component({selector:'app-council-scoring',standalone:true,imports:[CommonModule,FormsModule],template:`
 <h2 class="text-2xl font-bold mb-4">Hội đồng — Chấm M3</h2>
 <select class="border rounded p-3" [(ngModel)]="councilId" (ngModelChange)="loadStudents()"><option [ngValue]="null">Chọn hội đồng</option><option *ngFor="let c of councils" [ngValue]="c.id">{{c.name}}</option></select>
 <p class="my-3 text-slate-600" *ngIf="!councils.length">Bạn chưa được phân công vào hội đồng nào.</p>
 <div class="grid md:grid-cols-3 gap-4 mt-4"><div class="bg-white border rounded p-4"><button *ngFor="let s of students" (click)="select(s)" class="block w-full text-left p-3 border-b">{{s.full_name}} · {{s.student_code}}<div class="text-xs text-slate-500">{{s.major_name}} · K{{s.cohort}}</div></button></div>
 <section *ngIf="student" class="md:col-span-2 bg-white border rounded p-5"><h3 class="font-bold">{{student.full_name}} — {{student.datn_info?.thesis_title}}</h3>
 <p class="text-sm text-slate-500 my-3">Mỗi thành viên nộp một phiếu riêng. M3 chỉ được chấm sau khi M2 đạt và khóa, trong thời gian của đợt.</p>
 <p *ngIf="result?.m3_locked" class="text-green-700">M3 đã khóa.</p>
 <div *ngFor="let c of clos" class="py-3 border-b"><label class="font-semibold">{{c.clo_code}} — {{c.description}}<input type="number" min="0" max="10" step="0.1" [(ngModel)]="c.point" [disabled]="result?.m3_locked && !reassessment" class="border rounded p-2 w-24 ml-3"></label><p class="text-xs text-slate-500" *ngFor="let r of c.rubrics">Mức {{r.score_level}}: {{r.description}}</p><input [(ngModel)]="c.comment" placeholder="Nhận xét CLO" class="border rounded p-2 w-full mt-2"></div>
 <label class="block my-3">Kết luận <select [(ngModel)]="conclusion" class="border p-2"><option value="PASSED">Đạt</option><option value="REVISION_REQUIRED">Cần chỉnh sửa</option><option value="FAILED">Không đạt</option></select></label>
 <textarea [(ngModel)]="comment" placeholder="Nhận xét chung / yêu cầu chỉnh sửa" class="border p-3 w-full"></textarea>
 <label class="block my-2" *ngIf="conclusion==='REVISION_REQUIRED'"><input type="checkbox" [(ngModel)]="resolved"> Đã xác nhận hoàn tất chỉnh sửa</label>
 <label class="block my-2" *ngIf="existing?.conclusion==='FAILED'"><input type="checkbox" [(ngModel)]="reassessment"> Đánh giá lại (tối đa 1 lần trong 7 ngày)</label>
 <button (click)="submit()" [disabled]="saving || (result?.m3_locked && !reassessment)" class="bg-blue-800 text-white p-3 rounded m-2 disabled:opacity-40">Nộp phiếu M3 của tôi</button>
 <button (click)="lock()" [disabled]="result?.m3_locked" class="bg-amber-600 text-white p-3 rounded disabled:opacity-40">Khóa M3 khi đủ phiếu</button>
 <p class="text-sm mt-4">Điểm M3 tổng hợp: {{result?.m3_score ?? 'Chưa đủ phiếu'}} · HP: {{result?.final_hp_score ?? 'Chưa đủ điểm'}}</p>
 </section></div>`})
export class CouncilScoringComponent implements OnInit {
 councils:any[]=[];students:any[]=[];clos:any[]=[];councilId:number|null=null;student:any=null;existing:any=null;result:any=null;conclusion='PASSED';comment='';resolved=false;reassessment=false;saving=false;
 constructor(private api:ApiService,private auth:AuthService,private toast:ToastService){}
 error=(e:any)=>this.toast.error(e.message || 'Không thực hiện được thao tác.');
 ngOnInit(){this.api.get<any[]>('/base/councils').subscribe({next:r=>this.councils=r,error:this.error});}
 loadStudents(){this.student=null;this.api.get<any[]>(`/base/councils/${this.councilId}/students`).subscribe({next:r=>this.students=r,error:this.error});}
 select(s:any){this.student=s;this.clos=[];this.result=null;this.existing=null;this.conclusion='PASSED';this.comment='';this.resolved=false;this.reassessment=false;
  this.api.get<any[]>(`/base/academic/students/${s.id}/clos`).subscribe({next:r=>{this.clos=r.filter(c=>c.m3_weight>0).map(c=>({...c,point:null,comment:''}));this.api.get<any[]>(`/base/evaluations?student_campaign_id=${s.id}`).subscribe(e=>{this.existing=e.find(v=>v.stage==='M3' && v.evaluator_id===this.auth.getCurrentUser()?.userId);if(this.existing){this.conclusion=this.existing.conclusion;this.comment=this.existing.general_comment;this.resolved=this.existing.revision_resolved;for(const c of this.clos){const mark=this.existing.scores.find((v:any)=>v.clo_code===c.clo_code);if(mark){c.point=mark.score_level;c.comment=mark.comment;}}}});},error:this.error});
  this.api.get<any>(`/base/evaluations/final-result/${s.id}`).subscribe({next:r=>this.result=r,error:this.error});
 }
 submit(){if(this.clos.length===0 || this.clos.some(c=>c.point===null || c.point<0 || c.point>10)){this.toast.error('Chấm đủ các CLO trong khoảng 0–10.');return;}this.saving=true;
  this.api.post('/base/evaluations',{student_campaign_id:this.student.id,evaluator_id:this.auth.getCurrentUser()?.userId,evaluator_type:'COMMITTEE_MEMBER',stage:'M3',conclusion:this.conclusion,general_comment:this.comment,revision_resolved:this.resolved,reassessment:this.reassessment,scores:this.clos.map(c=>({clo_code:c.clo_code,score_level:c.point,comment:c.comment}))}).subscribe({next:()=>{this.saving=false;this.toast.success('Đã lưu phiếu M3.');this.select(this.student);},error:e=>{this.saving=false;this.error(e);}});
 }
 lock(){this.api.patch(`/base/evaluations/final-result/${this.student.id}/lock?stage=M3&evaluator_type=COMMITTEE_MEMBER`,{}).subscribe({next:()=>{this.toast.success('Đã khóa M3.');this.select(this.student);},error:this.error});}
}
