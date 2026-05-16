import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, ROIMetrics, ScalingDecision, IntelligenceState } from '../../core/services/admin.service';
import { Observable, forkJoin } from 'rxjs';
import { LucideAngularModule, Activity, Gauge, TrendingUp, Sliders, Zap, Check, Info, AlertCircle } from 'lucide-angular';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { DecisionExplainabilityComponent } from './components/decision-explainability.component';
import { TenantOverviewComponent } from './components/tenant-overview.component';
import { AlertCenterComponent } from './components/alert-center.component';
import { debounceTime, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ReactiveFormsModule,
    DecisionExplainabilityComponent,
    TenantOverviewComponent,
    AlertCenterComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);

  policyForm!: FormGroup;
  savingPolicy = false;
  saveSuccess = false;

  roiMetrics$!: Observable<ROIMetrics>;
  timeline$!: Observable<ScalingDecision[]>;
  intelligenceState$!: Observable<IntelligenceState>;

  selectedDecision: ScalingDecision | null = null;
  expectedImpact = { cost: 0, latency: 0 };

  // Chart Configurations removed for architecture cleanup

  ngOnInit() {
    this.roiMetrics$ = this.adminService.getROIMetrics();
    this.timeline$ = this.adminService.getScalingTimeline();
    this.intelligenceState$ = this.adminService.getIntelligenceState();

    this.policyForm = this.fb.group({
      performance: [0.33],
      cost: [0.33],
      reliability: [0.34]
    });

    // Policy Impact Preview Logic
    this.policyForm.valueChanges.pipe(
      debounceTime(200),
      startWith(this.policyForm.value)
    ).subscribe(weights => {
      const perfDelta = weights.performance - 0.33;
      this.expectedImpact = {
        cost: perfDelta * 40, // +1% perf costs +0.4%
        latency: perfDelta * -60 // +1% perf drops latency -0.6%
      };
    });

    // Metric updates handled without local charting
  }

  savePolicy() {
    this.savingPolicy = true;
    this.saveSuccess = false;

    const weights = this.policyForm.value;
    // Normalize weights to sum to 1.0
    const total = weights.performance + weights.cost + weights.reliability;
    const normalized = {
      performanceWeight: weights.performance / total,
      costWeight: weights.cost / total,
      reliabilityWeight: weights.reliability / total
    };

    this.adminService.updatePolicy('platform-admin', normalized).subscribe({
      next: () => {
        this.savingPolicy = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: () => {
        this.savingPolicy = false;
      }
    });
  }
}
