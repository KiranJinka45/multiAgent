#!/usr/bin/env python3
# ZTAN Independent Python Validator Node (v1.2.0-LTS)
# Connects to the local TCP Transport Bus, executes independent JCS parsing,
# performs cryptographic DER pre-flight firewalls, governs epoch transitions natively,
# and implements Hybrid Logical Clock (HLC) causal tracing.

import sys
import os
import socket
import json
import time

def dict_raise_on_duplicates(ordered_pairs):
    """
    Custom JSON decoder hook to strictly reject duplicate keys in Python.
    Standard json.loads ignores duplicates; this hook enforces ZTAN compliance.
    """
    d = {}
    for k, v in ordered_pairs:
        if k in d:
            raise ValueError(f"Duplicate key detected: {k}")
        d[k] = v
    return d

class HybridLogicalClock:
    def __init__(self, l=0, c=0):
        self.l = int(l)
        self.c = int(c)

    def get_physical(self):
        return self.l

    def get_logical(self):
        return self.c

    def increment_local(self, physical_time):
        l_old = self.l
        self.l = max(l_old, int(physical_time))
        if self.l == l_old:
            self.c += 1
        else:
            self.c = 0
        return self.l, self.c

    def update_receive(self, remote_l, remote_c, physical_time):
        l_old = self.l
        self.l = max(l_old, int(remote_l), int(physical_time))
        if self.l == l_old and self.l == int(remote_l):
            self.c = max(self.c, int(remote_c)) + 1
        elif self.l == l_old:
            self.c += 1
        elif self.l == int(remote_l):
            self.c = int(remote_c) + 1
        else:
            self.c = 0
        return self.l, self.c

    def __str__(self):
        return f"{self.l}:{self.c}"

    @staticmethod
    def parse(hlc_str):
        if not hlc_str or ":" not in hlc_str:
            return HybridLogicalClock(0, 0)
        parts = hlc_str.split(":")
        if len(parts) != 2:
            return HybridLogicalClock(0, 0)
        try:
            return HybridLogicalClock(int(parts[0]), int(parts[1]))
        except ValueError:
            return HybridLogicalClock(0, 0)

class PythonValidatorNode:
    def __init__(self, node_id, host, port):
        self.node_id = node_id
        self.host = host
        self.port = int(port)
        self.ledger = []
        self.current_seq = 0
        self.ruleset = "v1.x"
        self.activation_epoch = 50
        self.socket = None
        self.running = True
        
        # Lamport Logical Clock (backwards compatibility)
        self.logical_time = 0

        # Hybrid Logical Clock (HLC)
        self.hlc = HybridLogicalClock(0, 0)

    def increment_clock(self, remote_clock=0):
        self.logical_time = max(self.logical_time, remote_clock) + 1
        return self.logical_time

    def update_hlc(self, remote_hlc_string=None):
        now_ms = int(time.time() * 1000)
        if remote_hlc_string:
            parsed = HybridLogicalClock.parse(remote_hlc_string)
            self.hlc.update_receive(parsed.get_physical(), parsed.get_logical(), now_ms)
        else:
            self.hlc.increment_local(now_ms)
        return str(self.hlc)

    def validate_der_signature(self, signature_hex):
        """
        Natively emulates pre-flight ECDSA secp256r1 DER validations:
        High-S scalar malleability, negative tags, and overlong paddings.
        """
        try:
            sig_bytes = bytes.fromhex(signature_hex)
            if len(sig_bytes) < 8 or sig_bytes[0] != 0x30:
                raise ValueError("Invalid DER signature structure prefix.")
            
            # Check length block
            total_len = sig_bytes[1]
            if len(sig_bytes) != total_len + 2:
                raise ValueError("DER total length field mismatch.")

            # Validate R and S tags
            idx = 2
            # R component
            if sig_bytes[idx] != 0x02:
                raise ValueError("Invalid R-component integer tag.")
            r_len = sig_bytes[idx+1]
            r_val = sig_bytes[idx+2 : idx+2+r_len]
            # Strip and verify overlong leading zero padding
            if len(r_val) > 1 and r_val[0] == 0x00 and (r_val[1] & 0x80) == 0:
                raise ValueError("Overlong padding detected in R-component.")
            # Disallow negative integers (highest bit set without leading 0x00)
            if len(r_val) > 0 and (r_val[0] & 0x80) != 0 and r_val[0] != 0x00:
                raise ValueError("Negative R-component detected.")
            
            idx += 2 + r_len
            # S component
            if sig_bytes[idx] != 0x02:
                raise ValueError("Invalid S-component integer tag.")
            s_len = sig_bytes[idx+1]
            s_val = sig_bytes[idx+2 : idx+2+s_len]
            if len(s_val) > 1 and s_val[0] == 0x00 and (s_val[1] & 0x80) == 0:
                raise ValueError("Overlong padding detected in S-component.")
            if len(s_val) > 0 and (s_val[0] & 0x80) != 0 and s_val[0] != 0x00:
                raise ValueError("Negative S-component detected.")

            # Enforce High-S scalar check (malleability defense)
            # secp256r1 curve order n
            n_order = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
            half_n = n_order // 2
            s_int = int.from_bytes(s_val, byteorder='big')
            if s_int > half_n:
                raise ValueError("High-S scalar variant rejected (malleability risk).")

            return True
        except Exception as e:
            raise ValueError(f"DER Validation Failure: {str(e)}")

    def process_transaction(self, tx):
        seq_id = tx.get("seqId", 0)
        payload = tx.get("payload", "")
        signature = tx.get("signature", "")

        # 1. Update ruleset state based on block epoch height
        if seq_id >= self.activation_epoch:
            self.ruleset = "v2.x"
        else:
            self.ruleset = "v1.x"

        # 2. Independent strict JCS Duplicate Key Check using custom decoder
        decoder = json.JSONDecoder(object_pairs_hook=dict_raise_on_duplicates)
        try:
            decoded_payload = decoder.decode(payload)
        except Exception as e:
            return False, f"Python JCS Parser Reject: {str(e)}"

        # 3. Independent Cryptographic DER validation
        if signature:
            try:
                self.validate_der_signature(signature)
            except Exception as e:
                return False, f"Python Crypto Reject: {str(e)}"

        # 4. Independent Ruleset v2 Casing normalization enforcement
        if self.ruleset == "v2.x":
            for key in decoded_payload.keys():
                if len(key) > 0 and key[0].isupper():
                    return False, f"Python v2 Ruleset Violation: Uppercase key '{key}' is strictly forbidden."

        # Consensus tracking updates
        self.ledger.append(payload)
        self.current_seq = seq_id
        return True, None

    def start(self):
        print(f"[{self.node_id}] Starting Python Native Service with HLC on {self.host}:{self.port}...")
        
        # Connect to the asynchronous TCP transport bus
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            self.socket.connect((self.host, self.port))
            reg_clock = self.increment_clock()
            reg_hlc = self.update_hlc()
            print(f"[{self.node_id}] Connected to TCP Transport Bus. (HLC: {reg_hlc})")
        except Exception as e:
            print(f"[{self.node_id}] Connection to Bus failed: {e}")
            sys.exit(1)

        # Register node metadata with the bus
        reg_payload = json.dumps({
            "type": "REGISTRATION",
            "nodeId": self.node_id,
            "runtime": "Python",
            "logicalClock": reg_clock,
            "hlc": reg_hlc
        }) + "\n"
        self.socket.sendall(reg_payload.encode('utf-8'))

        buffer = ""
        while self.running:
            try:
                data = self.socket.recv(4096)
                if not data:
                    print(f"[{self.node_id}] Connection closed by remote transport bus.")
                    break
                
                buffer += data.decode('utf-8')
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    if not line.strip():
                        continue
                    
                    msg = json.loads(line)
                    current_clock = self.increment_clock(msg.get("logicalClock", 0))
                    current_hlc = self.update_hlc(msg.get("hlc"))

                    if msg.get("type") == "CRASH_TRIGGER":
                        print(f"[{self.node_id}] Received CRASH_TRIGGER at HLC: {current_hlc}. Natively exiting process.")
                        sys.exit(0)
                        
                    if msg.get("type") == "TRANSACTION":
                        tx = msg.get("tx")
                        event_id = msg.get("eventId")
                        start_time = time.time()
                        
                        accepted, error = self.process_transaction(tx)
                        latency = (time.time() - start_time) * 1000 # ms
                        
                        next_clock = self.increment_clock()
                        next_hlc = self.update_hlc()
                        # Send validation response back to the transport bus
                        res = {
                            "type": "VALIDATION_RESPONSE",
                            "nodeId": self.node_id,
                            "eventId": event_id,
                            "seqId": tx.get("seqId", 0),
                            "accepted": accepted,
                            "error": error,
                            "ruleset": self.ruleset,
                            "latencyMs": latency,
                            "logicalClock": next_clock,
                            "hlc": next_hlc
                        }
                        self.socket.sendall((json.dumps(res) + "\n").encode('utf-8'))
            except socket.error as e:
                print(f"[{self.node_id}] TCP Socket Error: {e}")
                break
            except Exception as e:
                print(f"[{self.node_id}] Internal Python error: {e}")
                break
        
        print(f"[{self.node_id}] Native Service terminated.")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python validator-python.py <node_id> <bus_host> <bus_port>")
        sys.exit(1)
    
    node = PythonValidatorNode(sys.argv[1], sys.argv[2], sys.argv[3])
    node.start()
