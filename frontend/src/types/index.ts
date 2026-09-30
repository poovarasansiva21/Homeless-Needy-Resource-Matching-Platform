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
  | 'REQUESTED'
  | 'REPORTED'
  | 'SUBMITTED'
  | 'AI_ANALYZED'
  | 'RESOURCE_MATCHED'
  | 'TRANSPORT_CHECK'
  | 'NGO_NOTIFIED'
  | 'NGO_ACCEPTED'
  | 'RESPONDER_ASSIGNED'
  | 'ON_THE_WAY'
  | 'ASSISTANCE_PROVIDED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'MATCHING'
  | 'MATCHED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'ASSISTANCE_STARTED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'UNABLE_TO_ASSIST'
  | 'ESCALATED';

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
  is_help_someone?: boolean;
  has_photo_permission?: boolean;
  voice_transcript?: string;
  is_verified?: boolean;
  latest_verification?: {
    verified_by?: string;
    timestamp?: string;
    notes?: string;
  };
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
  request_id?: number;
  urgent_request_id?: number;
  resource_id?: number;
  resource_name?: string;
  donation_type: string;
  item_category: string;
  item_description?: string;
  quantity: number;
  unit: string;
  notes?: string;
  status: 'PLEDGED' | 'ACCEPTED' | 'ASSIGNED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | string;
  urgent_request_title?: string;
  urgency_level?: string;
  anonymized_location?: string;
  created_at: string;
  updated_at?: string;
}

export interface UrgentDonationRequest {
  id: number;
  resource_id?: number;
  resource_name?: string;
  title: string;
  item_category: string;
  urgency_level: 'CRITICAL' | 'HIGH' | 'NORMAL' | string;
  required_quantity: number;
  fulfilled_quantity: number;
  remaining_quantity: number;
  unit: string;
  description?: string;
  latitude: number;
  longitude: number;
  address: string;
  status: 'ACTIVE' | 'FULFILLED' | 'CANCELLED' | string;
  created_at: string;
}

export interface DonationInventory {
  id: number;
  resource_id?: number;
  resource_name: string;
  item_category: string;
  item_name: string;
  total_quantity: number;
  allocated_quantity: number;
  available_quantity: number;
  unit: string;
  last_updated: string;
}

export interface IntelligentDonationMatch {
  match_id: string;
  match_type: string;
  match_score: number;
  donation: {
    item_category: string;
    quantity: number;
    description: string;
  };
  current_need: {
    urgent_request_id?: number;
    request_id?: number;
    resource_id?: number;
    title: string;
    item_category: string;
    urgency_level: string;
    required_quantity: number;
    fulfilled_quantity?: number;
    description?: string;
  };
  resource: {
    id?: number;
    name: string;
    organization_type: string;
    phone?: string;
    address: string;
  };
  location: {
    distance_km: number;
    locality: string;
    address: string;
  };
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

export interface DonationVisionScanResponse {
  success: boolean;
  prediction: string; // 'clothing' | 'food' | 'hygiene'
  confidence: number;
  confidence_percentage: number;
  all_probabilities: Record<string, number>;
  low_confidence: boolean;
  confidence_threshold: number;
  matched_resources: MatchedResource[];
  model_metadata?: {
    model_name: string;
    framework: string;
    num_classes: number;
    class_names: string[];
  };
}

export interface HumanitarianPipelineResponse {
  success: boolean;
  input_text: string;
  category: string;
  urgency: UrgencyLevel;
  people: number;
  duration: string;
  transport_barrier: boolean;
  transport_reason: string;
  intent: string;
  important_entities: {
    dependents: string[];
    timeframe: string | null;
    barriers: string[];
    landmarks: string[];
  };
  confidence: number;
  confidence_percentage: number;
  confidence_action: 'CONTINUE' | 'ASK_CLARIFICATION' | 'HUMAN_REVIEW';
  action_note: string;
  follow_up_questions: string[];
  model_version: string;
  log_id?: number;
  probabilities: Record<string, number>;
  disclaimer?: string;
  escalation_required: boolean;
  matched_resources: MatchedResource[];
}

export type TransportStatus = 'VERIFIED' | 'NEEDS_VERIFICATION' | 'NEEDS VERIFICATION' | 'UNVERIFIED_REPORTED' | 'REPORTED' | string;

export type TransportBarrierReason =
  | 'cannot_afford_transport'
  | 'too_far'
  | 'no_transport'
  | 'with_children'
  | 'other';

export type TransportReportReason =
  | 'wrong_fare'
  | 'wrong_route'
  | 'wrong_timing'
  | 'fake_driver'
  | 'fake_volunteer'
  | 'unexpected_payment'
  | 'fake_ngo'
  | 'suspicious_information';

export type TripStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'RESPONDER_ASSIGNED'
  | 'ON_THE_WAY'
  | 'PICKUP_CONFIRMED'
  | 'DESTINATION_REACHED'
  | 'COMPLETED';

export interface TransportInfoItem {
  id: number;
  resource_id?: number;
  resource_name?: string;
  provider: string;
  route_name: string;
  fare_amount?: number;
  fare_display: string;
  is_free_or_concession: boolean;
  eligibility: string;
  source: string;
  last_verified?: string;
  review_expiry_date?: string;
  status: TransportStatus;
  safety_notice?: string;
  created_at?: string;
}

export interface TransportReportItem {
  id: number;
  transport_info_id?: number;
  trip_id?: number;
  reason: TransportReportReason;
  details?: string;
  reporter: string;
  created_at: string;
}

export interface AssignedResponderInfo {
  id: number;
  display_name: string;
  role: string;
  organization: string;
  is_verified_responder: boolean;
  phone?: string;
  full_name?: string;
}

export interface AssistanceTrip {
  id: number;
  trip_code: string;
  barrier_reason: TransportBarrierReason;
  pickup_address: string;
  destination_address: string;
  resource_id?: number;
  resource_name?: string;
  people_count: number;
  status: TripStatus;
  assigned_responder?: AssignedResponderInfo | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Phase 6 Humanitarian Intelligence Layer Types
export interface AreaCluster {
  area_name: string;
  latitude: number;
  longitude: number;
  request_count: number;
  people_in_need: number;
  unfulfilled_requests: number;
  avg_urgency_score: number;
  dominant_category: string;
  category_breakdown: Record<string, number>;
  resource_count: number;
  available_capacity: number;
  total_capacity: number;
  resource_categories: Record<string, number>;
}

export interface NeedHeatmapPoint {
  id: number;
  latitude: number;
  longitude: number;
  address: string;
  area: string;
  category: string;
  urgency_level: UrgencyLevel;
  urgency_score: number;
  people_count: number;
  status: string;
  weight: number;
  created_at: string;
}

export interface ResourceHeatmapPoint {
  id: number;
  name: string;
  organization_type: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  area: string;
  availability_status: string;
  capacity_total: number;
  capacity_available: number;
  weight: number;
}

export interface CategoryGapItem {
  category: string;
  need_count: number;
  available_capacity: number;
  gap_amount: number;
  has_shortage: boolean;
}

export interface ResourceGapItem {
  area_name: string;
  latitude: number;
  longitude: number;
  people_in_need: number;
  available_capacity: number;
  overall_gap_score: number;
  gap_level: 'HIGH_GAP' | 'MODERATE_GAP' | 'BALANCED';
  category_gaps: CategoryGapItem[];
  unfulfilled_requests: number;
}

export interface DemandTrendItem {
  category: string;
  request_count: number;
  people_impacted: number;
  percentage_of_total_demand: number;
  avg_urgency_score: number;
  urgency_breakdown: Record<UrgencyLevel, number>;
}

export interface TimeAnalysisData {
  peak_hour: string;
  peak_hour_notice: string;
  by_hour: { hour: string; requests: number }[];
  by_day: { day: string; requests: number }[];
  by_week: { week: string; requests: number }[];
  by_month: { month: string; requests: number }[];
}

export interface UnderservedArea {
  area_name: string;
  latitude: number;
  longitude: number;
  request_count: number;
  people_in_need: number;
  unfulfilled_requests: number;
  available_resources_count: number;
  total_available_capacity: number;
  transport_barrier_count: number;
  underserved_score: number;
  status: 'CRITICALLY_UNDERSERVED' | 'MODERATELY_UNDERSERVED' | 'ADEQUATELY_SERVED';
  dominant_category: string;
}

export interface ShortageAlert {
  id: number;
  area_name: string;
  category: string;
  severity: 'CRITICAL' | 'WARNING';
  demand_request_count: number;
  available_resource_capacity: number;
  shortage_gap: number;
  message: string;
  timestamp: string;
}

export interface DemandForecastCategory {
  category: string;
  historical_count: number;
  estimated_demand_7d: number;
  forecast_range: string;
  confidence_percentage: number;
}

export interface DemandForecastData {
  disclaimer: string;
  forecast_summary: {
    wording_terms_used: string[];
    historical_sample_size: number;
    estimated_demand_next_7_days: number;
    estimated_demand_next_30_days: number;
    forecast_daily_rate: number;
    confidence: string;
    confidence_percentage: number;
    confidence_level: string;
    forecast_range_7d: string;
  };
  category_forecasts: DemandForecastCategory[];
}

export interface NgoPlanningData {
  usage_notice: string;
  planning_summary: {
    high_need_areas_count: number;
    low_resource_areas_count: number;
    transport_barriers_count: number;
    pending_critical_cases_count: number;
  };
  high_need_areas: AreaCluster[];
  low_resource_areas: AreaCluster[];
  transport_barriers: {
    id: string;
    type: string;
    barrier_reason: string;
    pickup_address: string;
    area: string;
    people_count: number;
    status: string;
    created_at: string;
  }[];
  pending_critical_cases: {
    id: number;
    requester_name: string;
    category: string;
    urgency_level: UrgencyLevel;
    urgency_score: number;
    people_count: number;
    area: string;
    description: string;
    status: string;
    created_at: string;
  }[];
}

export interface HumanitarianIntelligenceOverview {
  success: boolean;
  timestamp: string;
  need_heatmap: {
    total_active_needs: number;
    total_people_in_need: number;
    heatmap_points: NeedHeatmapPoint[];
    area_clusters: AreaCluster[];
  };
  resource_heatmap: {
    total_verified_resources: number;
    total_available_capacity: number;
    resource_points: ResourceHeatmapPoint[];
    area_clusters: AreaCluster[];
  };
  resource_gap_map: {
    high_gap_areas_count: number;
    moderate_gap_areas_count: number;
    gap_analysis: ResourceGapItem[];
  };
  demand_trend: {
    total_requests_tracked: number;
    trends: DemandTrendItem[];
  };
  time_analysis: TimeAnalysisData;
  area_analysis: {
    underserved_areas: UnderservedArea[];
  };
  shortage_alerts: {
    active_shortage_alerts_count: number;
    alerts: ShortageAlert[];
  };
  demand_forecast: DemandForecastData;
  ngo_planning: NgoPlanningData;
}


