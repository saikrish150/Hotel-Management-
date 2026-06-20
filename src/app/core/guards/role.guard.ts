import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { map, take, filter } from 'rxjs/operators';

export const roleGuard: CanActivateFn = (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  return supabaseService.profile.pipe(
    filter(profile => profile !== null),
    take(1),
    map(profile => {
      const allowedRoles = route.data?.['allowedRoles'] as string[];
      if (profile && allowedRoles.includes(profile.role)) {
        return true;
      }
      
      // Fallback redirect for unauthorized users
      const fallback = profile?.role === 'Admin' ? '/analytics' : '/bookings';
      return router.createUrlTree([fallback]);
    })
  );
};
