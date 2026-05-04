import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Check, Zap, Rocket, Shield } from 'lucide-angular';

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  recommended?: boolean;
  icon: any;
}

@Component({
  selector: 'app-pricing-table',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './pricing-table.component.html',
  styleUrls: ['./pricing-table.component.css']
})
export class PricingTableComponent {
  @Output() planSelected = new EventEmitter<string>();

  tiers: PricingTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for exploring the power of autonomous infrastructure.',
      features: [
        '5 Missions / Day',
        'Standard Worker Fleet',
        'Real-time Timeline',
        'Community Support'
      ],
      cta: 'Start Free',
      icon: 'Zap'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$49',
      period: 'per month',
      description: 'Designed for active developers and small teams.',
      features: [
        '50 Missions / Day',
        'Priority Worker Scaling',
        'ROI & Profitability Metrics',
        '24h Quota Reset',
        'Email Support'
      ],
      cta: 'Go Pro',
      recommended: true,
      icon: 'Rocket'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      period: 'tailored',
      description: 'Institutional-grade scale and dedicated resources.',
      features: [
        'Unlimited Missions',
        'Dedicated Worker Pool',
        'Custom ROI Reports',
        'Advanced Governance / Audit',
        'Priority SLA Support'
      ],
      cta: 'Contact Sales',
      icon: 'Shield'
    }
  ];

  selectPlan(tierId: string) {
    this.planSelected.emit(tierId);
  }
}
