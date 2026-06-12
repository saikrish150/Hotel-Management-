import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'theme-gold-black-red' | 'theme-cream-white';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private currentThemeSubject = new BehaviorSubject<Theme>('theme-gold-black-red');
  public currentTheme$ = this.currentThemeSubject.asObservable();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.loadInitialTheme();
  }

  private loadInitialTheme() {
    const savedTheme = localStorage.getItem('hotelytics-theme') as Theme;
    if (savedTheme && ['theme-gold-black-red', 'theme-cream-white'].includes(savedTheme)) {
      this.setTheme(savedTheme);
    } else {
      this.setTheme('theme-gold-black-red');
    }
  }

  public setTheme(theme: Theme) {
    // Remove all possible theme classes from the body
    this.renderer.removeClass(document.body, 'theme-gold-black-red');
    this.renderer.removeClass(document.body, 'theme-cream-white');

    // Add the new theme class
    this.renderer.addClass(document.body, theme);
    
    // Save to local storage and update state
    localStorage.setItem('hotelytics-theme', theme);
    this.currentThemeSubject.next(theme);
  }

  public getActiveTheme(): Theme {
    return this.currentThemeSubject.value;
  }
}
