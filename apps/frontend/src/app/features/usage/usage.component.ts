import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { Observable } from 'rxjs';
import { LucideAngularModule, CreditCard, Clock, Layers, BarChart, Zap, ShieldCheck } from 'lucide-angular';

@Component({
  selector: 'app-usage',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './usage.component.html',
  styleUrls: ['./usage.component.css']
})
export class UsageComponent implements OnInit {
  private adminService = inject(AdminService);
  
  // For demonstration, using a hardcoded tenantId. 
  // In a real app, this would come from an AuthService.
  tenantId = 'default-tenant';
  
  billingData$!: Observable<any>;

  ngOnInit() {
    this.billingData$ = this.adminService.getTenantBilling(this.tenantId);
  }
}
