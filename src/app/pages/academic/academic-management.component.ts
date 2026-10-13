import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CampaignService } from '../../core/services/campaign.service';
import { DepartmentService } from '../../core/services/department.service';
import { ToastService } from '../../core/services/toast.service';

@Component({selector:'app-academic-management',standalone:true,imports:[CommonModule,FormsModule,RouterModule],templateUrl:'./academic-management.component.html',styles:[`
 :host {display:block} section {background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:18px 0}
 h2 {font-size:24px;font-weight:700} h3 {font-size:18px;font-weight:650;margin-bottom:12px} label {display:inline-flex;flex-direction:column;gap:5px;margin:6px 12px 8px 0;font-size:14px}
 input,select,textarea {border:1px solid #cbd5e1;border-radius:6px;padding:8px;background:white;max-width:100%}button {padding:8px 14px;border-radius:6px;background:#00429d;color:white;margin:5px}button:disabled{opacity:.4}td,th{text-align:left;padding:10px;border-bottom:1px solid #e2e8f0}table{width:100%}.muted{color:#64748b;font-size:13px}
`]})
export class AcademicManagementComponent implements OnInit {
  departments:any[]=[];campaigns:any[]=[];majors:any[]=[];sets:any[]=[];bindings:any[]=[];students:any[]=[];teachers:any[]=[];councils:any[]=[];
  departmentId:number|null=null;campaignId:number|null=null;dcId:number|null=null;majorId:number|null=null;cohort='68';setId:number|null=null;
  majorCode='';majorName='';query='';councilName='';councilId:number|null=null;
  memberRows:any[]=[{user_id:null,role:'PRESIDENT'},{user_id:null,role:'SECRETARY'},{user_id:null,role:'MEMBER'}];
  external={full_name:'',email:'',organization:'',position:'',expertise:'',phone:'',password:''};
  constructor(private api:ApiService,private auth:AuthService,private campaignService:CampaignService,private departmentService:DepartmentService,private toast:ToastService) {}
  ngOnInit() {
    const user=this.auth.getCurrentUser();this.departmentId=user?.departmentId || null;
    if(this.departmentId)this.departmentService.getById(this.departmentId).subscribe(d=>{this.departments=[d];this.departmentService.getChildren(d.id).subscribe(children=>this.departments.push(...children));this.load();});
    else this.departmentService.getDepartments({page:1,limit:100}).subscribe(r=>{this.departments=r.data || [];for(const d of [...this.departments])this.departmentService.getChildren(d.id).subscribe(c=>this.departments.push(...c));});
    this.campaignService.getCampaignOptions().subscribe(c=>{this.campaigns=c;this.campaignId=c[0]?.id || null;this.load();});
  }
  error=(e:any)=>this.toast.error(e.message || 'Không thực hiện được thao tác.');
  load() {
    if(!this.departmentId)return;
    this.api.get<any[]>(`/base/academic/majors?department_id=${this.departmentId}`).subscribe({next:r=>this.majors=r,error:this.error});
    this.api.get<any[]>(`/base/academic/clo-sets?department_id=${this.departmentId}`).subscribe({next:r=>this.sets=r,error:this.error});
    this.search();
    if(!this.campaignId)return;
    this.api.get<any>(`/base/department-campaigns/find?campaign_id=${this.campaignId}&department_id=${this.departmentId}`).subscribe({next:r=>{this.dcId=r.id;this.api.get<any[]>(`/base/councils?department_campaign_id=${r.id}`).subscribe(c=>this.councils=c);},error:this.error});
    this.api.get<any[]>(`/base/academic/cohort-clos?campaign_id=${this.campaignId}&department_id=${this.departmentId}`).subscribe({next:r=>this.bindings=r,error:this.error});
    this.api.get<any>(`/base/student-campaigns?campaign_id=${this.campaignId}&department_id=${this.departmentId}&page=1&limit=1000`).subscribe({next:r=>this.students=(r.data || r.content || []).map((s:any)=>({...s,selected:false})),error:this.error});
  }
  createMajor(){this.api.post('/base/academic/majors',{department_id:this.departmentId,code:this.majorCode,name:this.majorName}).subscribe({next:()=>{this.toast.success('Đã thêm ngành.');this.load();},error:this.error});}
  get matchingSets(){return this.sets.filter(s=>s.major_id===this.majorId && s.cohort===this.cohort);}
  bind(){this.api.post('/base/academic/cohort-clos',{campaign_id:this.campaignId,major_id:this.majorId,cohort:this.cohort,clo_set_id:this.setId}).subscribe({next:()=>{this.toast.success('Đã gán CLO cho ngành/khóa trong đợt.');this.load();},error:this.error});}
  assignClo(s:any){this.api.put(`/base/academic/students/${s.id}/clo`,{}).subscribe({next:()=>{this.toast.success('Đã gán CLO riêng cho SV.');this.load();},error:this.error});}
  setName(id:number){return this.sets.find(s=>s.id===id)?.name || 'Chưa gán';}
  majorLabel(id:number){return this.majors.find(m=>m.id===id)?.name || '';}
  search(){if(this.departmentId)this.api.get<any[]>(`/base/academic/supervisors?department_id=${this.departmentId}&q=${encodeURIComponent(this.query)}`).subscribe({next:r=>this.teachers=r,error:this.error});}
  invite(t:any){this.api.post(`/base/student-campaigns/eligible-teachers/${t.id}?campaign_id=${this.campaignId}&department_id=${this.departmentId}`,{}).subscribe({next:()=>this.toast.success('Đã mời người hướng dẫn; có thể phân công ở danh sách SV.'),error:this.error});}
  addExternal(){this.api.post('/base/academic/external-supervisors',{...this.external,department_id:this.departmentId,campaign_id:this.campaignId}).subscribe({next:()=>{this.external.password='';this.toast.success('Đã tạo tài khoản và mời người hướng dẫn ngoài trường.');this.search();},error:this.error});}
  createCouncil(){this.api.post('/base/councils',{department_campaign_id:this.dcId,name:this.councilName,members:this.memberRows}).subscribe({next:()=>{this.toast.success('Đã tạo hội đồng.');this.load();},error:this.error});}
  assignCouncil(){const ids=this.students.filter(s=>s.selected).map(s=>s.id);if(!ids.length){this.toast.error('Hãy chọn SV trong bảng.');return;}this.api.post(`/base/councils/${this.councilId}/students`,ids).subscribe({next:()=>{this.toast.success('Đã phân công hội đồng.');this.load();},error:this.error});}
}
