import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private _session: Session | null = null;
  private _user = new BehaviorSubject<User | null>(null);
  private _profile = new BehaviorSubject<{ role: string; hotel_name: string; full_name: string; hotel_id?: string; room_config?: any; column_config?: any } | null>(null);
  private _sessionLoaded = new BehaviorSubject<boolean>(false);

  private _bookingsUpdated = new BehaviorSubject<boolean>(false);
  private _openExtensionRequest = new BehaviorSubject<any>(null);
  private _openCheckoutRequest = new BehaviorSubject<any>(null);

  constructor(private router: Router) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: async (_name, _acquireTimeout, fn) => {
          return await fn();
        }
      }
    });
    this.setupAuthListener();
  }

  get user(): Observable<User | null> {
    return this._user.asObservable();
  }

  get sessionLoaded(): Observable<boolean> {
    return this._sessionLoaded.asObservable();
  }

  get profile(): Observable<{ role: string; hotel_name: string; full_name: string; hotel_id?: string; room_config?: any; column_config?: any } | null> {
    return this._profile.asObservable();
  }

  get bookingsUpdated(): Observable<boolean> {
    return this._bookingsUpdated.asObservable();
  }
  triggerBookingsRefresh() {
    this._bookingsUpdated.next(true);
  }

  get openExtensionRequest(): Observable<any> {
    return this._openExtensionRequest.asObservable();
  }
  requestOpenExtension(booking: any) {
    this._openExtensionRequest.next(booking);
  }

  get openCheckoutRequest(): Observable<any> {
    return this._openCheckoutRequest.asObservable();
  }
  requestOpenCheckout(booking: any) {
    this._openCheckoutRequest.next(booking);
  }

  get currentUser(): User | null {
    return this._user.value;
  }

  get currentProfile() {
    return this._profile.value;
  }

  get session(): Session | null {
    return this._session;
  }

  private setupAuthListener() {
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this._session = session;
      this._user.next(session?.user ?? null);
      if (session?.user) {
        this.fetchUserProfile(session.user.id);
      } else {
        this._profile.next(null);
      }
      this._sessionLoaded.next(true);
    });

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._session = session;
      this._user.next(session?.user ?? null);
      if (session?.user) {
        this.fetchUserProfile(session.user.id);
      } else {
        this._profile.next(null);
      }
      this._sessionLoaded.next(true);
      if (_event === 'SIGNED_OUT') {
        this.router.navigate(['/login']);
      }
    });
  }

  private async fetchUserProfile(userId: string) {
    try {
      const { data: profileData, error: profileError } = await this.supabase
        .from('profiles')
        .select('role, full_name, hotel_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profileData) {
        console.warn('Profile record not found, using default dashboard access profile:', profileError);
        this._profile.next({
          role: 'Staff',
          full_name: 'Default Operator',
          hotel_name: 'Hotelytics System',
          hotel_id: undefined,
          room_config: {},
          column_config: {}
        });
        return;
      }

      const { data: hotelData, error: hotelError } = await this.supabase
        .from('hotels')
        .select('name, room_config, column_config')
        .eq('id', profileData.hotel_id)
        .maybeSingle();

      if (hotelError || !hotelData) {
        console.warn('Linked hotel record not found, using fallback system branding:', hotelError);
        this._profile.next({
          role: profileData.role,
          full_name: profileData.full_name || 'Operator',
          hotel_name: 'Hotelytics System',
          hotel_id: profileData.hotel_id,
          room_config: {},
          column_config: {}
        });
        return;
      }

      this._profile.next({
        role: profileData.role,
        full_name: profileData.full_name || 'Operator',
        hotel_name: hotelData.name,
        hotel_id: profileData.hotel_id,
        room_config: hotelData.room_config || {},
        column_config: hotelData.column_config || {}
      });
    } catch (e) {
      console.error('Exception fetching profile details:', e);
      this._profile.next({
        role: 'Staff',
        full_name: 'Operator',
        hotel_name: 'Hotelytics System',
        room_config: {},
        column_config: {}
      });
    }
  }

  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  async updatePassword(newPassword: string) {
    return this.supabase.auth.updateUser({ password: newPassword });
  }

  async updateUserTheme(theme: string) {
    return this.supabase.auth.updateUser({ data: { theme } });
  }

  async updateHotelColumnConfig(hotelId: string, config: any) {
    const { data, error } = await this.supabase
      .from('hotels')
      .update({ column_config: config })
      .eq('id', hotelId)
      .select();

    if (!error && data && data.length > 0) {
      // Update local profile state
      const current = this._profile.value;
      if (current && current.hotel_id === hotelId) {
        this._profile.next({
          ...current,
          column_config: config
        });
      }
    }
    return { data, error };
  }

  async updateHotelRoomConfig(hotelId: string, config: any) {
    const { data, error } = await this.supabase
      .from('hotels')
      .update({ room_config: config })
      .eq('id', hotelId)
      .select();

    if (!error && data && data.length > 0) {
      // Update local profile state
      const current = this._profile.value;
      if (current && current.hotel_id === hotelId) {
        this._profile.next({
          ...current,
          room_config: config
        });
      }
    }
    return { data, error };
  }
  
  getClient(): SupabaseClient {
    return this.supabase;
  }

  // --- Storage Methods ---
  async uploadHotelDocument(file: File, folder: 'bookings' | 'expenses', recordId: string): Promise<string | null> {
    const profile = this.currentProfile;
    if (!profile || !profile.hotel_id) throw new Error('No hotel context found');

    const fileExt = file.name.split('.').pop();
    const fileName = `${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${profile.hotel_id}/${folder}/${recordId}/${fileName}`;

    const { data, error } = await this.supabase.storage
      .from('hotel-documents')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    return data.path;
  }

  async getSignedDocumentUrl(path: string): Promise<string | null> {
    const { data, error } = await this.supabase.storage
      .from('hotel-documents')
      .createSignedUrl(path, 60 * 60); // 1 hour expiry

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
  }

  async deleteHotelDocument(path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from('hotel-documents')
      .remove([path]);

    if (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // ==========================================
  // SECURITY & TENANT ENFORCEMENT
  // ==========================================
  private getEnforcedHotelId(providedHotelId?: string): string {
    const profileHotelId = this.currentProfile?.hotel_id;
    if (providedHotelId && profileHotelId && providedHotelId !== profileHotelId) {
      console.warn('Security Warning: Attempted cross-tenant data access. Enforcing current tenant context.');
    }
    const finalId = profileHotelId || providedHotelId;
    if (!finalId) throw new Error('Security Error: No hotel_id context available for this operation.');
    return finalId;
  }

  private enforceTenantPayload(payload: any) {
    if (Array.isArray(payload)) {
      return payload.map(p => ({ ...p, hotel_id: this.getEnforcedHotelId() }));
    }
    return { ...payload, hotel_id: this.getEnforcedHotelId() };
  }

  // ==========================================
  // EXPENSES API
  // ==========================================
  
  async getMonthlyExpenses(hotelId?: string, expenseYear?: number, expenseMonth?: number) {
    let query = this.supabase.from('monthly_expenses').select('*').eq('hotel_id', this.getEnforcedHotelId(hotelId));
    if (expenseYear) query = query.eq('expense_year', expenseYear);
    if (expenseMonth) query = query.eq('expense_month', expenseMonth);
    return await query.order('expense_year', { ascending: false }).order('expense_month', { ascending: false });
  }

  async getTotalRevenue(hotelId?: string) {
    return await this.supabase.from('daily_entries').select('total_revenue').eq('hotel_id', this.getEnforcedHotelId(hotelId));
  }

  async insertExpense(payload: any) {
    return await this.supabase.from('monthly_expenses').insert([this.enforceTenantPayload(payload)]).select();
  }

  async insertMultipleExpenses(payloads: any[]) {
    return await this.supabase.from('monthly_expenses').insert(this.enforceTenantPayload(payloads)).select();
  }

  async updateExpenseReceipts(id: string, receipts: string[]) {
    return await this.supabase.from('monthly_expenses').update({ receipts }).eq('id', id).eq('hotel_id', this.getEnforcedHotelId());
  }

  async updateMultipleExpenseReceipts(ids: string[], receipts: string[]) {
    return await this.supabase.from('monthly_expenses').update({ receipts }).in('id', ids).eq('hotel_id', this.getEnforcedHotelId());
  }

  async deleteExpense(id: string) {
    return await this.supabase.from('monthly_expenses').delete().eq('id', id).eq('hotel_id', this.getEnforcedHotelId());
  }

  async deleteExpensesByMonthYear(hotelId: string, month: number, year: number) {
    return await this.supabase.from('monthly_expenses')
      .delete()
      .eq('hotel_id', this.getEnforcedHotelId(hotelId))
      .eq('expense_month', month)
      .eq('expense_year', year);
  }

  // ==========================================
  // DAILY ENTRIES API
  // ==========================================

  async getDailyEntries(hotelId?: string, startDate?: string, endDate?: string) {
    let query = this.supabase.from('daily_entries').select('*').eq('hotel_id', this.getEnforcedHotelId(hotelId));
    if (startDate) query = query.gte('entry_date', startDate);
    if (endDate) query = query.lte('entry_date', endDate);
    return await query.order('entry_date', { ascending: false });
  }

  async getDailyEntryByDate(hotelId: string, date: string) {
    return await this.supabase.from('daily_entries')
      .select('*')
      .eq('hotel_id', this.getEnforcedHotelId(hotelId))
      .eq('entry_date', date)
      .maybeSingle();
  }

  async insertDailyEntry(payload: any) {
    return await this.supabase.from('daily_entries').insert([this.enforceTenantPayload(payload)]);
  }

  async updateDailyEntry(id: string, payload: any) {
    return await this.supabase.from('daily_entries').update(payload).eq('id', id).eq('hotel_id', this.getEnforcedHotelId());
  }

  async deleteDailyEntry(id: string) {
    return await this.supabase.from('daily_entries').delete().eq('id', id).eq('hotel_id', this.getEnforcedHotelId());
  }

  // ==========================================
  // ROOM BOOKINGS API
  // ==========================================

  async getRoomBookings(hotelId?: string) {
    let query = this.supabase.from('room_bookings').select('*').eq('hotel_id', this.getEnforcedHotelId(hotelId));
    return await query.order('created_at', { ascending: false });
  }

  async insertRoomBooking(payload: any) {
    return await this.supabase.from('room_bookings').insert([this.enforceTenantPayload(payload)]).select();
  }

  async updateRoomBooking(id: string, payload: any) {
    return await this.supabase.from('room_bookings').update(payload).eq('id', id).eq('hotel_id', this.getEnforcedHotelId());
  }

  async deleteRoomBooking(id: string) {
    return await this.supabase.from('room_bookings').delete().eq('id', id).eq('hotel_id', this.getEnforcedHotelId());
  }

  // ==========================================
  // GUESTS API
  // ==========================================

  async getGuestByPhone(hotelId: string, phone: string) {
    return await this.supabase.from('guests')
      .select('*')
      .eq('hotel_id', this.getEnforcedHotelId(hotelId))
      .eq('phone_number', phone)
      .maybeSingle();
  }
  async searchGuests(hotelId: string, query: string) {
    return await this.supabase.from('guests')
      .select('*')
      .eq('hotel_id', this.getEnforcedHotelId(hotelId))
      .or(`name.ilike.%${query}%,phone_number.ilike.%${query}%,id_number.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(10);
  }

  async insertGuest(payload: any) {
    return await this.supabase.from('guests').insert([this.enforceTenantPayload(payload)]).select();
  }

  async updateGuest(id: string, payload: any) {
    return await this.supabase.from('guests').update(payload).eq('id', id).eq('hotel_id', this.getEnforcedHotelId());
  }
}
