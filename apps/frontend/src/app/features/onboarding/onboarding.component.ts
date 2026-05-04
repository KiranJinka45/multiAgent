import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css']
})
export class OnboardingComponent {
  step = 1;

  constructor(private router: Router) {}

  nextStep() {
    if (this.step < 3) {
      this.step++;
    } else {
      this.router.navigate(['/missions']);
    }
  }
}
