import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, ROIMetrics, ScalingDecision, IntelligenceState } from '../../core/services/admin.service';
import { Observable, forkJoin } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
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
    BaseChartDirective, 
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

  // Chart Configurations
  public roiChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Efficiency', 'Remaining'],
    datasets: [{
      data: [0, 100],
      backgroundColor: ['#2ae500', '#1b1c1e'],
      borderWidth: 0,
      circumference: 180,
      rotation: 270,
    }]
  };

  public timelineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'ROI %',
        borderColor: '#00e3fd',
        backgroundColor: 'rgba(0, 227, 253, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  public timelineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    scales: {
      y: { display: false },
      x: { display: false }
    },
    plugins: {
      legend: { display: false }
    }
  };

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

    this.roiMetrics$.subscribe(m => {
      this.roiChartData.datasets[0].data = [m.efficiencyGain, 100 - m.efficiencyGain];
    });

    this.timeline$.subscribe(t => {
      this.timelineChartData.labels = t.map(d => new Date(d.createdAt).toLocaleTimeString()).reverse();
      this.timelineChartData.datasets[0].data = t.map(d => d.improvementPct || 0).reverse();
    });
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
