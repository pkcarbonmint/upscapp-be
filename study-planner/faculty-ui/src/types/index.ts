// Faculty-specific types
export interface FacultyUser {
  id: number;
  email: string;
  name: string;
  full_name: string;
  phone_number: string;
  is_faculty: boolean;
  user_type: string;
  roles: string[];
  is_active: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface FacultyAuthState {
  user: FacultyUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Plan review types
export interface PlanReviewItem {
  id: number;
  student_id: string;
  student_name: string;
  plan_title: string;
  approval_status: 'draft' | 'review' | 'approved' | 'rejected' | 'published';
  submitted_at: string;
  last_modified: string;
  review_notes?: string;
  approved_by?: number;
  approved_at?: string;
}

export interface PlanReviewFilters {
  status?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface ReviewAction {
  planId: number;
  action: 'approve' | 'reject';
  notes?: string;
}

// Student lookup types
export interface StudentInfo {
  id: number;
  student_id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
  last_login?: string;
  plan_count: number;
  referral_count: number;
}

// Dashboard stats
export interface DashboardStats {
  totalPlans: number;
  pendingReview: number;
  approvedToday: number;
  rejectedToday: number;
  totalStudents: number;
  activeStudents: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface ReviewNotesForm {
  notes: string;
}
