import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { LucideAngularModule, Activity, Gauge, TrendingUp, Sliders, Zap } from 'lucide-angular';
import { importProvidersFrom } from '@angular/core';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([errorInterceptor])
    ),
    importProvidersFrom(LucideAngularModule.pick({ Activity, Gauge, TrendingUp, Sliders, Zap })),
    provideCharts(withDefaultRegisterables())
  ]
};
