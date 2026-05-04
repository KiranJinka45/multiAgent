import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DebugModeService {
  private debugModeSubject = new BehaviorSubject<boolean>(false);
  public isEnabled$ = this.debugModeSubject.asObservable();
  private auditLog: any[] = [];

  // Placeholder for real authentication check
  private isAdmin() {
    return true; // Assume true for local development
  }

  toggle() {
    if (!this.isAdmin()) {
      this.logAudit('UNAUTHORIZED_ATTEMPT', 'admin');
      return;
    }
    const newState = !this.debugModeSubject.value;
    this.debugModeSubject.next(newState);
    this.logAudit('TOGGLE_DEBUG', 'admin', { enabled: newState });
    console.log(`[DebugMode] ${newState ? 'Enabled' : 'Disabled'}`);
  }

  private logAudit(action: string, user: string, metadata: any = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      user,
      ...metadata
    };
    this.auditLog.push(entry);
    console.log('[Audit Log]', entry);
    // In a real system, we would call: this.api.post('/audit-logs', entry)
  }

  get isEnabled() {
    return this.debugModeSubject.value;
  }
}
