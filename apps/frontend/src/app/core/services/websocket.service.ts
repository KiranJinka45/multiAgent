import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket;
  private eventSubject = new Subject<any>();
  private connectionStatus = new BehaviorSubject<boolean>(false);
  public isConnected$ = this.connectionStatus.asObservable();
  public reconnected$ = new Subject<void>();
  private _lastMessageAt: number = Date.now();

  get lastMessageAt(): number {
    return this._lastMessageAt;
  }

  get isAlive(): boolean {
    // If connected but no message for 30s, consider it stalled
    return this.isConnected && (Date.now() - this._lastMessageAt < 30000);
  }

  get isConnected(): boolean {
    return this.connectionStatus.value;
  }

  constructor() {
    this.socket = io(environment.wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'], // Hybrid transport for production-grade reliability
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('✅ [Websocket] Operational on:', environment.wsUrl);
      this.connectionStatus.next(true);
      this.reconnected$.next();
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('❌ [Websocket] Disconnected:', reason);
      this.connectionStatus.next(false);
    });

    this.socket.on('connect_error', (err) => {
      console.error('🚨 [Websocket] Connection Error:', err.message);
      // Fallback to polling if websocket fails (only if explicitly needed, 
      // but here we stay strict for Level 5 certification)
    });

    // Handle generic events if needed
    this.socket.onAny((eventName, ...args) => {
      this._lastMessageAt = Date.now();
      this.eventSubject.next({ eventName, data: args[0] });
    });
  }

  subscribeToBuild(buildId: string) {
    this.socket.emit('subscribe', buildId);
  }

  emit(eventName: string, data: any) {
    this.socket.emit(eventName, data);
  }

  onEvent<T>(eventName: string): Observable<T> {
    return new Observable<T>(observer => {
      this.socket.on(eventName, (data: T) => {
        observer.next(data);
      });
      return () => this.socket.off(eventName);
    });
  }

  get allEvents() {
    return this.eventSubject.asObservable();
  }
}
