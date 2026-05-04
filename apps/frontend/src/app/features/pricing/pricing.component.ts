import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PricingTableComponent } from '../../shared/components/pricing-table/pricing-table.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [CommonModule, PricingTableComponent],
  template: `
    <div class="pricing-page">
      <div class="header-section">
        <h1>Scale Your Intelligence</h1>
        <p>Unlock higher quotas, priority workers, and advanced ROI metrics.</p>
      </div>
      
      <app-pricing-table (planSelected)="onPlanSelected($event)"></app-pricing-table>
      
      <div class="footer-section">
        <p>Beta Program: All Pro features are currently 100% free for invited testers.</p>
      </div>
    </div>
  `,
  styles: [`
    .pricing-page {
      min-height: 100vh;
      background: #0d0e10;
      color: white;
      padding-top: 4rem;
    }
    .header-section {
      text-align: center;
      margin-bottom: 2rem;
    }
    h1 {
      font-size: 3.5rem;
      font-weight: 800;
      background: linear-gradient(to right, #fff, #909094);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 1rem;
    }
    p {
      color: #909094;
      font-size: 1.1rem;
    }
    .footer-section {
      text-align: center;
      padding: 4rem 2rem;
      color: #4b5563;
      font-size: 0.9rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      max-width: 800px;
      margin: 0 auto;
    }
  `]
})
export class PricingComponent {
  private router = inject(Router);

  onPlanSelected(planId: string) {
    console.log(`Plan selected: ${planId}`);
    // In Beta, we just redirect back with a "Thank you" or similar
    // Or we could implement a "Beta Provisioning" step here
    this.router.navigate(['/missions']);
  }
}
