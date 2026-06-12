import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { LayoutComponent } from './core/layout/layout.component';
import { authGuard } from './core/guards/auth.guard';

import { DailyEntriesComponent } from './features/daily-entries/daily-entries.component';
import { BookingsComponent } from './features/bookings/bookings.component';
import { ExpensesComponent } from './features/expenses/expenses.component';
import { AnalyticsComponent } from './features/analytics/analytics.component';
import { ReportsComponent } from './features/reports/reports.component';
import { SettingsComponent } from './features/settings/settings.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', redirectTo: 'analytics', pathMatch: 'full' },
      { path: 'daily-entries', component: DailyEntriesComponent },
      { path: 'bookings', component: BookingsComponent },
      { path: 'expenses', component: ExpensesComponent },
      { path: 'analytics', component: AnalyticsComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'settings', component: SettingsComponent },
      { path: '', redirectTo: 'analytics', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
