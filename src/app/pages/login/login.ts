import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  account = '';
  password = '';
  errorMsg = '';
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    if (!this.account || !this.password) {
      this.errorMsg = '請輸入帳號與密碼';
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';

    this.authService.login({ account: this.account, password: this.password }).subscribe({
      next: (res) => {
        if (res.success) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err.status === 401 ? '帳號或密碼錯誤' : '登入失敗，請稍後再試';
      }
    });
  }
}