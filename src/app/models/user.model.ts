export interface User {
  id: number;
  name: string;
  account: string;
  role: 'admin' | 'employee';
  dept: string;
}

export interface LoginRequest {
  account: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}