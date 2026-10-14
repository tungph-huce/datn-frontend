import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { EvaluationService } from '../../core/services/evaluation.service';
@Component({selector:'app-council-scoring',standalone:true,imports:[CommonModule,FormsModule],template:`
 <h2 class="text-2xl font-bold mb-4">Hội đồng — Chấm M3</h2>
 <select class="border rounded p-3" [(ngModel)]="councilId" (ngModelChange)="loadStudents()"><option [ngValue]="null">Chọn hội đồng</option><option *ngFor="let c of councils" [ngValue]="c.id">{{c.name}}</option></select>
 <p class="my-3 text-slate-600" *ngIf="!councils.length">Bạn chưa được phân công vào hội đồng nào.</p>
 <p class="my-3 text-slate-700" *ngIf="council">Lịch bảo vệ: <b>{{council.evaluation_date || 'chưa xếp lịch'}}</b> {{council.room ? '· phòng ' + council.room : ''}} · Vai trò của bạn: <b>{{myRole === 'PRESIDENT' ? 'Chủ tịch' : myRole === 'SECRETARY' ? 'Thư ký' : 'Ủy viên'}}</b></p>
 <div class="grid md:grid-cols-3 gap-4 mt-4"><div class="bg-white border rounded p-4"><button *ngFor="let s of students" (click)="select(s)" class="block w-full text-left p-3 border-b">{{s.full_name}} · {{s.student_code}}<div class="text-xs text-slate-500">{{s.major_name}} · K{{s.cohort}}</div></button></div>
 <section *ngIf="student" class="md:col-span-2 bg-white border rounded p-5"><h3 class="font-bold">{{student.full_name}} — {{student.datn_info?.thesis_title}}</h3>
 <p class="text-sm text-slate-500 my-3">Mỗi thành viên nộp một phiếu riêng. M3 chỉ được chấm sau khi M2 đạt và khóa, trong thời gian của đợt.</p>
 <p *ngIf="result?.m3_locked" class="text-green-700">M3 đã khóa.</p>
 <div *ngFor="let c of clos" class="py-3 border-b"><label class="font-semibold">{{c.clo_code}} — {{c.description}}<input type="number" min="0" max="10" step="0.1" [(ngModel)]="c.point" [disabled]="result?.m3_locked && !reassessment" class="border rounded p-2 w-24 ml-3"></label><p class="text-xs text-slate-500" *ngFor="let r of c.rubrics">Mức {{r.score_level}}: {{r.description}}</p><input [(ngModel)]="c.comment" placeholder="Nhận xét CLO" class="border rounded p-2 w-full mt-2"></div>
 <label class="block my-3">Kết luận <select [(ngModel)]="conclusion" class="border p-2"><option value="PASSED">Đạt</option><option value="REVISION_REQUIRED">Cần chỉnh sửa</option><option value="FAILED">Không đạt</option></select></label>
 <textarea [(ngModel)]="comment" placeholder="Nhận xét chung / yêu cầu chỉnh sửa" class="border p-3 w-full"></textarea>
 <label class="block my-2" *ngIf="conclusion==='REVISION_REQUIRED'"><input type="checkbox" [(ngModel)]="resolved"> Đã xác nhận hoàn tất chỉnh sửa</label>
 <button (click)="submit()" [disabled]="saving || result?.m3_locked" class="bg-blue-800 text-white p-3 rounded m-2 disabled:opacity-40">Nộp phiếu M3 của tôi</button>
 <button (click)="lock()" [disabled]="result?.m3_locked" class="bg-amber-600 text-white p-3 rounded disabled:opacity-40">Khóa M3 khi đủ phiếu</button>
 <div class="mt-3 flex gap-2" *ngIf="result?.m3_score != null">
  <button (click)="exportM3()" class="border rounded px-3 py-2 text-sm">Xuất tổng hợp M3 (ĐATN-07)</button>
  <button *ngIf="myRole === 'PRESIDENT' || myRole === 'SECRETARY'" (click)="exportCourse()" class="border rounded px-3 py-2 text-sm">Xuất ĐATN-08</button>
 </div>
 <p class="text-sm mt-4">Điểm M3 tổng hợp: {{result?.m3_score ?? 'Chưa đủ phiếu'}} · HP: {{result?.final_hp_score ?? 'Chưa đủ điểm'}}</p>
 <div *ngIf="flagged.length" class="mt-5 border border-amber-300 bg-amber-50 rounded p-4">
  <h4 class="font-bold text-amber-800">Hiệu chỉnh sau chấm (Điều 26.4)</h4>
  <p class="text-sm text-amber-800 mb-3">Các mục dưới đây lệch từ 2,0 điểm giữa các thành viên. Chủ tịch Hội đồng chủ trì thảo luận và ghi điểm thống nhất, lý do; chưa lập biên bản thì không khóa được M3.</p>
  <div *ngFor="let m of flagged" class="py-2 border-b border-amber-200">
   <div class="font-semibold">{{m.target === 'HP' ? 'Điểm học phần đề nghị' : m.target}} · lệch {{m.spread}}</div>
   <div class="text-xs text-slate-600"><span *ngFor="let p of m.scores" class="mr-3">{{p.evaluator_name}}: {{p.score}}</span></div>
   <div *ngIf="isPresident && !result?.m3_locked; else readOnly" class="flex gap-2 mt-2">
    <input *ngIf="m.target !== 'HP'" type="number" min="0" max="10" step="0.1" [(ngModel)]="m.agreed_score" placeholder="Điểm thống nhất" class="border rounded p-2 w-36">
    <input [(ngModel)]="m.note" placeholder="Nội dung thảo luận, lý do điều chỉnh" class="border rounded p-2 flex-1">
   </div>
   <ng-template #readOnly><div class="text-sm mt-1">{{m.note ? ('Đã thống nhất' + (m.agreed_score != null ? ': ' + m.agreed_score : '') + ' — ' + m.note) : 'Chờ Chủ tịch lập biên bản'}}</div></ng-template>
  </div>
  <button *ngIf="isPresident && !result?.m3_locked" (click)="saveModeration()" class="bg-amber-700 text-white p-2 rounded mt-3">Lưu biên bản hiệu chỉnh</button>
 </div>
 </section></div>`})
export class CouncilScoringComponent implements OnInit {
 councils:any[]=[];students:any[]=[];clos:any[]=[];councilId:number|null=null;student:any=null;existing:any=null;result:any=null;conclusion='PASSED';comment='';resolved=false;reassessment=false;saving=false;flagged:any[]=[];
 get council(){return this.councils.find(c=>c.id===this.councilId);}
 get myRole(){return this.council?.members?.find((m:any)=>m.user_id===this.auth.getCurrentUser()?.userId)?.role;}
 get isPresident(){return this.myRole==='PRESIDENT';}
 constructor(private api:ApiService,private auth:AuthService,private toast:ToastService,private evaluations:EvaluationService){}
 private save(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 /** Phụ lục 2: ĐATN-07/08 do Thư ký, Chủ tịch Hội đồng lập. */
 exportM3(){this.evaluations.exportStageDatn07(this.student.id,'M3').subscribe({next:b=>this.save(b,`DATN-07-M3-${this.student.student_code}.docx`),error:()=>this.toast.error('Chưa thể xuất ĐATN-07 (cần đủ phiếu M3).')});}
 exportCourse(){this.evaluations.exportDatn07Zip(this.student.campaign_id,[this.student.id]).subscribe({next:b=>this.save(b,`DATN-08-${this.student.student_code}.zip`),error:()=>this.toast.error('Chưa thể xuất ĐATN-08.')});}
 error=(e:any)=>this.toast.error(e.message || 'Không thực hiện được thao tác.');
 ngOnInit(){this.api.get<any[]>('/base/councils').subscribe({next:r=>this.councils=r,error:this.error});}
 loadStudents(){this.student=null;this.api.get<any[]>(`/base/councils/${this.councilId}/students`).subscribe({next:r=>this.students=r,error:this.error});}
 select(s:any){this.student=s;this.clos=[];this.result=null;this.existing=null;this.conclusion='PASSED';this.comment='';this.resolved=false;this.reassessment=false;
  this.api.get<any[]>(`/base/academic/students/${s.id}/clos`).subscribe({next:r=>{this.clos=r.filter(c=>c.m3_weight>0).map(c=>({...c,point:null,comment:''}));this.api.get<any[]>(`/base/evaluations?student_campaign_id=${s.id}`).subscribe(e=>{this.existing=e.find(v=>v.stage==='M3' && v.evaluator_id===this.auth.getCurrentUser()?.userId);if(this.existing){this.conclusion=this.existing.conclusion;this.comment=this.existing.general_comment;this.resolved=this.existing.revision_resolved;for(const c of this.clos){const mark=this.existing.scores.find((v:any)=>v.clo_code===c.clo_code);if(mark){c.point=mark.score_level;c.comment=mark.comment;}}}});},error:this.error});
  this.api.get<any>(`/base/evaluations/final-result/${s.id}`).subscribe({next:r=>this.result=r,error:this.error});
  this.loadModeration();
 }
 loadModeration(){this.flagged=[];this.api.get<any[]>(`/base/evaluations/moderation/${this.student.id}?stage=M3`).subscribe({next:r=>this.flagged=r.filter(m=>m.flagged),error:()=>this.flagged=[]});}
 saveModeration(){
  if(this.flagged.some(m=>!m.note || (m.target!=='HP' && (m.agreed_score===null || m.agreed_score===undefined || m.agreed_score<0 || m.agreed_score>10)))){this.toast.error('Nhập điểm thống nhất (0–10) và lý do cho mọi mục lệch.');return;}
  this.api.put(`/base/evaluations/moderation/${this.student.id}`,{stage:'M3',items:this.flagged.map(m=>({target:m.target,agreed_score:m.target==='HP'?null:m.agreed_score,note:m.note}))}).subscribe({next:()=>{this.toast.success('Đã lưu biên bản hiệu chỉnh.');this.select(this.student);},error:this.error});
 }
 submit(){if(this.clos.length===0 || this.clos.some(c=>c.point===null || c.point<0 || c.point>10)){this.toast.error('Chấm đủ các CLO trong khoảng 0–10.');return;}this.saving=true;
  this.api.post('/base/evaluations',{student_campaign_id:this.student.id,evaluator_id:this.auth.getCurrentUser()?.userId,evaluator_type:'COMMITTEE_MEMBER',stage:'M3',conclusion:this.conclusion,general_comment:this.comment,revision_resolved:this.resolved,reassessment:this.reassessment,scores:this.clos.map(c=>({clo_code:c.clo_code,score_level:c.point,comment:c.comment}))}).subscribe({next:()=>{this.saving=false;this.toast.success('Đã lưu phiếu M3.');this.select(this.student);},error:e=>{this.saving=false;this.error(e);}});
 }
 lock(){this.api.patch(`/base/evaluations/final-result/${this.student.id}/lock?stage=M3&evaluator_type=COMMITTEE_MEMBER`,{}).subscribe({next:()=>{this.toast.success('Đã khóa M3.');this.select(this.student);},error:this.error});}
}
