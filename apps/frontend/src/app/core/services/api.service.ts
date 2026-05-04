import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(url: string): Observable<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    console.debug(`[ApiService] GET ${fullUrl}`);
    console.debug(`[ApiService] Outgoing URL: ${fullUrl}`);
    return this.http.get<T>(fullUrl);
  }

  post<T>(url: string, body: any): Observable<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    console.debug(`[ApiService] POST ${fullUrl}`);
    console.debug(`[ApiService] Outgoing URL: ${fullUrl}`);
    return this.http.post<T>(fullUrl, body);
  }

  put<T>(url: string, body: any): Observable<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    console.debug(`[ApiService] PUT ${fullUrl}`);
    console.debug(`[ApiService] Outgoing URL: ${fullUrl}`);
    return this.http.put<T>(fullUrl, body);
  }

  delete<T>(url: string): Observable<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    console.debug(`[ApiService] DELETE ${fullUrl}`);
    return this.http.delete<T>(fullUrl);
  }

  patch<T>(url: string, body: any): Observable<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    console.debug(`[ApiService] PATCH ${fullUrl}`);
    return this.http.patch<T>(fullUrl, body);
  }
}
