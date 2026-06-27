import api from "@lib/axios";
import { ApiResponse, User } from "@types/index";

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  password: string;
  token: string;
}

export interface ValidateInviteResponse {
  email: string;
  role: string;
}

export const authService = {
  login: async (dto: LoginDto): Promise<User> => {
    const res = await api.post<ApiResponse<{ user: User }>>("/auth/login", dto);
    return res.data.data.user;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },

  me: async (): Promise<User> => {
    const res = await api.get<ApiResponse<User>>("/auth/me");
    return res.data.data;
  },

  forgotPassword: async (dto: ForgotPasswordDto): Promise<void> => {
    await api.post("/auth/forgot-password", dto);
  },

  resetPassword: async (dto: ResetPasswordDto): Promise<void> => {
    await api.post("/auth/reset-password", dto);
  },

  validateInvite: async (token: string): Promise<ValidateInviteResponse> => {
    const res = await api.get<ApiResponse<ValidateInviteResponse>>(
      `/auth/invite/${token}`,
    );
    return res.data.data;
  },

  register: async (dto: RegisterDto): Promise<User> => {
    const res = await api.post<ApiResponse<{ user: User }>>(
      "/auth/register",
      dto,
    );
    return res.data.data.user;
  },
};
