import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ThemeService, Theme } from '../../../core/services/theme.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    NzButtonModule, 
    NzInputModule, 
    NzFormModule,
    NzIconModule,
    NzDropDownModule
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private themeService: ThemeService,
    private router: Router,
    private message: NzMessageService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  setTheme(theme: Theme) {
    this.themeService.setTheme(theme);
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.loading = true;
      try {
        const { email, password } = this.loginForm.value;
        const { error } = await this.supabaseService.signIn(email, password);
        
        if (error) {
          this.message.error(error.message);
        } else {
          this.message.success('Login successful');
          this.router.navigate(['/dashboard']);
        }
      } catch (error: any) {
        this.message.error(error.message || 'An error occurred during login.');
      } finally {
        this.loading = false;
      }
    } else {
      Object.values(this.loginForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }
}
