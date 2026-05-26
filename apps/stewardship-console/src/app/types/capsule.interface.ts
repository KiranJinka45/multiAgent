import { EvidenceEntry } from '../stewardship.service';

export interface ZtanReplayCapsule {
  manifest: {
    version: string;
    epoch: number;
    timestamp: number;
    sequenceRange: [number, number];
    rootHash: string;
    signature: string;
    totalEntries: number;
    checksum: string; // FNV-1a hash of stringified entries for structural integrity
  };
  entries: EvidenceEntry[];
}
