export type UserRole = 'requester' | 'donor' | 'ngo' | 'admin' | 'volunteer';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  organization_name?: string;
  created_at?: string;
}

export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RequestStatus = 
  | 'SUBMITTED'
  | 'AI_ANALYZED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'MATCHING'
  | 'MATCHED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REJECTED';

export interface RequestItem {
  id: number;
  requester_id?: number;
  full_name: string;
  phone: string;
  description: string;
  category: string;
  dnn_category?: string;
  dnn_confidence?: number;
  urgency_level: UrgencyLevel;
  urgency_score: number;
  people_count: number;
  current_situation?: string;
  latitude: number;
  longitude: number;
  address: string;
  contact_method: string;
  photo_url?: string;
  status: RequestStatus;
  is_flagged_duplicate?: boolean;
  duplicate_notes?: string;
  assigned_ngo_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: number;
  name: string;
  organization_type: string;
  category: string;
  description?: string;
  phone: string;
  email?: string;
  latitude: number;
  longitude: number;
  address: string;
  availability_status: 'Available' | 'Limited' | 'Unavailable' | string;
  capacity_total: number;
  capacity_available: number;
  verified: boolean;
  is_demo: boolean;
  distance_km?: number;
  created_at?: string;
}

export interface MatchScoreBreakdown {
  category_compatibility: string;
  distance: string;
  availability: string;
  capacity: string;
}

export interface MatchedResource {
  resource_id: number;
  resource_name: string;
  organization_type: string;
  resource_category: string;
  address: string;
  phone: string;
  distance_km: number;
  match_score: number;
  breakdown: MatchScoreBreakdown;
}

export interface Donation {
  id: number;
  donor_id: number;
  donor_name: string;
  request_id: number;
  donation_type: string;
  notes?: string;
  status: string;
  created_at: string;
}

export interface StatusHistory {
  id: number;
  request_id: number;
  previous_status?: string;
  new_status: string;
  changed_by: string;
  notes?: string;
  timestamp: string;
}

export interface AppNotification {
  id: number;
  user_id?: number;
  role_target?: string;
  title: string;
  message: string;
  notification_type: 'info' | 'success' | 'warning' | 'alert';
  is_read: boolean;
  created_at: string;
}

export interface AiClassificationResponse {
  success: boolean;
  input_text: string;
  category: string;
  confidence: number;
  confidence_percentage: number;
  probabilities: Record<string, number>;
  urgency: UrgencyLevel;
  urgency_score: number;
  indicators: string[];
  disclaimer?: string;
  escalation_required: boolean;
  matched_resources: MatchedResource[];
}
