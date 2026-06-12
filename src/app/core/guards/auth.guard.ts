import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { combineLatest } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  return combineLatest([
    supabaseService.sessionLoaded.pipe(filter(loaded => loaded)),
    supabaseService.user
  ]).pipe(
    take(1),
    map(([_, user]) => {
      if (user) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};
