export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'HR_ADMIN' | 'HR_MANAGER' | 'FINANCE_ADMIN' | 'READONLY';
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}
