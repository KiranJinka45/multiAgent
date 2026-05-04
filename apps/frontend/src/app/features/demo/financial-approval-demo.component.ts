import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZtanService, CeremonyState } from '../../core/services/ztan.service';
import { ThresholdCrypto } from '@packages/ztan-crypto';

interface ApprovalRole {
  id: string;
  name: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  icon: string;
}

@Component({
  selector: 'app-financial-approval-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './financial-approval-demo.component.html',
  styleUrls: ['./financial-approval-demo.component.css']
})
export class FinancialApprovalDemoComponent implements OnInit {
  request = {
    amount: 50000,
    payee: 'Global Logistics Solutions Inc.',
    reason: 'Quarterly Infrastructure Lease - Region: US-East-1',
    id: `REQ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
  };

  roles: ApprovalRole[] = [
    { id: 'CFO-01', name: 'Chief Financial Officer', description: 'Financial feasibility & budget alignment', status: 'PENDING', icon: 'payments' },
    { id: 'COMPLIANCE-02', name: 'Compliance Officer', description: 'Regulatory & KYC verification', status: 'PENDING', icon: 'gavel' },
    { id: 'CEO-03', name: 'Chief Executive Officer', description: 'Strategic oversight (Optional if threshold met)', status: 'PENDING', icon: 'auto_graph' }
  ];

  ceremonyState: CeremonyState | null = null;
  isLoading: boolean = false;
  error: string | null = null;
  
  step: 'DRAFT' | 'INITIALIZING' | 'DKG' | 'SIGNING' | 'AUTHORIZED' = 'DRAFT';

  constructor(private ztan: ZtanService) {}

  ngOnInit() {
    this.checkActiveCeremony();
  }

  async checkActiveCeremony() {
    this.ceremonyState = await this.ztan.getActiveCeremony();
    if (this.ceremonyState) {
      this.syncStateWithCeremony();
    }
  }

  syncStateWithCeremony() {
    if (!this.ceremonyState) return;

    if (this.ceremonyState.status === 'DKG_ROUND_1' || this.ceremonyState.status === 'DKG_ROUND_2') {
      this.step = 'DKG';
    } else if (this.ceremonyState.status === 'ACTIVE') {
      this.step = 'SIGNING';
    } else if (this.ceremonyState.status === 'COMPLETED') {
      this.step = 'AUTHORIZED';
    }

    // Sync role statuses based on ceremony participants
    this.roles.forEach(role => {
      const p = this.ceremonyState?.participants.find(p => p.nodeId === role.id);
      if (p && p.status === 'SIGNED') {
        role.status = 'APPROVED';
      }
    });
  }

  async submitRequest() {
    try {
      this.isLoading = true;
      this.error = null;
      this.step = 'INITIALIZING';

      const payload = JSON.stringify(this.request);
      const messageHash = await ThresholdCrypto.hashPayload({ boundPayloadBytes: new TextEncoder().encode(payload) });

      const participants = this.roles.map(r => r.id);
      const threshold = 2;

      this.ceremonyState = await this.ztan.initCeremony(threshold, participants, messageHash);
      this.step = 'DKG';
      
      // Auto-run DKG rounds for the simulation
      await this.runDKG();
    } catch (e: any) {
      this.error = e.message;
      this.step = 'DRAFT';
    } finally {
      this.isLoading = false;
    }
  }

  async runDKG() {
    if (!this.ceremonyState) return;

    try {
      this.isLoading = true;
      
      // Round 1
      for (const role of this.roles) {
        const authMsg = await ThresholdCrypto.signProtocolMessage(
          role.id, 
          this.ceremonyState.ceremonyId, 
          'DKG_ROUND_1', 
          JSON.stringify([])
        );
        await this.ztan.submitCommitments(authMsg);
      }

      // Round 2
      for (const role of this.roles) {
        const authMsg = await ThresholdCrypto.signProtocolMessage(
          role.id, 
          this.ceremonyState.ceremonyId, 
          'DKG_ROUND_2', 
          JSON.stringify({})
        );
        this.ceremonyState = await this.ztan.submitShares(authMsg);
      }

      this.step = 'SIGNING';
    } catch (e: any) {
      this.error = `DKG Failure: ${e.message}`;
    } finally {
      this.isLoading = false;
    }
  }

  async approve(roleId: string) {
    if (!this.ceremonyState || this.step !== 'SIGNING') return;

    try {
      this.isLoading = true;
      this.error = null;

      this.ceremonyState = await this.ztan.simulateSign(roleId);
      
      const role = this.roles.find(r => r.id === roleId);
      if (role) role.status = 'APPROVED';

      if (this.ceremonyState.status === 'COMPLETED') {
        this.step = 'AUTHORIZED';
      }
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.isLoading = false;
    }
  }

  async reset() {
    await this.ztan.reset();
    this.ceremonyState = null;
    this.step = 'DRAFT';
    this.roles.forEach(r => r.status = 'PENDING');
    this.error = null;
  }

  get progressPercentage(): number {
    switch (this.step) {
      case 'DRAFT': return 0;
      case 'INITIALIZING': return 20;
      case 'DKG': return 50;
      case 'SIGNING': return 75;
      case 'AUTHORIZED': return 100;
      default: return 0;
    }
  }
}
