import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';

export type Theme = 'theme-gold-black-red' | 'theme-cream-white';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private readonly storageKey = 'rk-residency-theme';
  private currentThemeSubject = new BehaviorSubject<Theme>('theme-cream-white');
  public currentTheme$ = this.currentThemeSubject.asObservable();

  constructor(rendererFactory: RendererFactory2, private supabaseService: SupabaseService) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.loadInitialTheme();

    // Listen to user auth state to apply their preferred theme from DB
    this.supabaseService.user.subscribe(user => {
      if (user && user.user_metadata && user.user_metadata['theme']) {
        const userTheme = user.user_metadata['theme'];
        if (['theme-gold-black-red', 'theme-cream-white'].includes(userTheme)) {
          this.setThemeLocalOnly(userTheme as Theme);
        }
      }
    });
  }

  private loadInitialTheme() {
    const savedTheme = localStorage.getItem(this.storageKey) as Theme;
    if (savedTheme && ['theme-gold-black-red', 'theme-cream-white'].includes(savedTheme)) {
      this.setThemeLocalOnly(savedTheme);
    } else {
      this.setThemeLocalOnly('theme-cream-white');
    }
  }

  public async setTheme(theme: Theme) {
    this.setThemeLocalOnly(theme);
    
    // Save to backend if user is logged in
    if (this.supabaseService.currentUser) {
      this.supabaseService.updateUserTheme(theme).catch(e => console.error('Failed to sync theme:', e));
    }
  }

  private setThemeLocalOnly(theme: Theme) {
    // Remove all possible theme classes from the body
    this.renderer.removeClass(document.body, 'theme-gold-black-red');
    this.renderer.removeClass(document.body, 'theme-cream-white');

    // Add the new theme class
    this.renderer.addClass(document.body, theme);
    
    // Save to local storage and update state
    localStorage.setItem(this.storageKey, theme);
    this.currentThemeSubject.next(theme);
  }

  public getActiveTheme(): Theme {
    return this.currentThemeSubject.value;
  }
}
