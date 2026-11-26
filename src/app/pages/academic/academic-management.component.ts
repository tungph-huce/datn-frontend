import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CampaignService } from '../../core/services/campaign.service';
import { DepartmentService } from '../../core/services/department.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-academic-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './academic-management.component.html',
  styleUrls: ['./academic-management.component.scss']
})
export class AcademicManagementComponent implements OnInit {
  departments:any[]=[];campaigns:any[]=[];majors:any[]=[];sets:any[]=[];bindings:any[]=[];students:any[]=[];teachers:any[]=[];councils:any[]=[];
  departmentId:number|null=null;campaignId:number|null=null;dcId:number|null=null;majorId:number|null=null;cohort='68';setId:number|null=null;
  majorCode='';majorName='';query='';councilName='';councilId:number|null=null;
  memberRows:any[]=[{user_id:null,role:'PRESIDENT',weight:null},{user_id:null,role:'SECRETARY',weight:null},{user_id:null,role:'MEMBER',weight:null}];
  councilDate='';councilRoom='';rescheduleDate='';rescheduleRoom='';
  external={full_name:'',email:'',organization:'',position:'',expertise:'',phone:'',password:'',academic_degree:'THAC_SI'};
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
  /** datetime-local "2026-10-20T08:00" → định dạng backend "2026-10-20 08:00:00". */
  private toApiDate(value:string){return value?value.replace('T',' ')+(value.length===16?':00':''):null;}
  degreeLabel(d:string|null){return d==='TIEN_SI'?'TS':d==='THAC_SI'?'ThS':d==='DAI_HOC'?'ĐH':'chưa khai báo trình độ';}
  roleLabel(r:string){return r==='PRESIDENT'?'Chủ tịch':r==='SECRETARY'?'Thư ký':'Ủy viên';}
  weightTotal(){const w=this.memberRows.filter(m=>m.weight!==null && m.weight!=='' && m.weight!==undefined);return w.length?w.reduce((s,m)=>s+Number(m.weight),0):null;}
  createCouncil(){
    const members=this.memberRows.map(m=>({user_id:m.user_id,role:m.role,weight:m.weight===''||m.weight===undefined?null:m.weight}));
    this.api.post('/base/councils',{department_campaign_id:this.dcId,name:this.councilName,members,evaluation_date:this.toApiDate(this.councilDate),room:this.councilRoom||null}).subscribe({next:()=>{this.toast.success('Đã tạo hội đồng.');this.load();},error:this.error});
  }
  reschedule(){this.api.put(`/base/councils/${this.councilId}/schedule`,{evaluation_date:this.toApiDate(this.rescheduleDate),room:this.rescheduleRoom}).subscribe({next:()=>{this.toast.success('Đã cập nhật lịch và gửi thông báo.');this.load();},error:this.error});}
  assignCouncil(){const ids=this.students.filter(s=>s.selected).map(s=>s.id);if(!ids.length){this.toast.error('Hãy chọn SV trong bảng.');return;}this.api.post(`/base/councils/${this.councilId}/students`,ids).subscribe({next:()=>{this.toast.success('Đã phân công hội đồng.');this.load();},error:this.error});}
}
