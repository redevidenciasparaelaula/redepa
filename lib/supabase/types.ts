// Tipos manuales mínimos. Si más adelante usas la CLI de Supabase
// (`supabase gen types typescript`) puedes reemplazar este archivo
// con los tipos generados automáticamente.

export type ResearcherStatus = 'pending' | 'approved' | 'rejected';

export type Institution = {
  id: string;
  name: string;
  name_en: string | null;
  country: string;
  city: string | null;
  website: string | null;
  created_at: string;
};

export type Researcher = {
  id: string;
  full_name: string;
  email: string;
  institution_id: string | null;
  title_es: string | null;
  title_en: string | null;
  phd_year: number | null;
  phd_institution: string | null;
  master_year: number | null;
  master_institution: string | null;
  research_topics: string[];
  methodologies: string[];
  representative_dois: string[];
  country: string | null;
  city: string | null;
  linkedin_url: string | null;
  google_scholar_url: string | null;
  researchgate_url: string | null;
  orcid: string | null;
  website: string | null;
  photo_url: string | null;
  status: ResearcherStatus;
  available_for_review: boolean;
  created_at: string;
  updated_at: string;
};

export type ResearcherWithInstitution = Researcher & {
  institutions: Pick<Institution, 'id' | 'name' | 'name_en' | 'country' | 'city'> | null;
};

export type InstitutionAdmin = {
  user_id: string;
  institution_id: string;
  created_at: string;
};

export type SuperAdmin = {
  user_id: string;
  created_at: string;
};

// =====================================================================
// Congresos (módulo de congreso EPA)
// Las demás tablas (submissions, reviews, sessions, etc.) se agregarán
// a medida que avancemos en las olas de implementación.
// =====================================================================

export type CongressStatus =
  | 'draft'
  | 'cfp_open'
  | 'review'
  | 'program'
  | 'live'
  | 'closed';

export type Congress = {
  id: string;
  year: number;
  name: string;
  slug: string;
  theme: string | null;
  start_date: string;
  end_date: string;
  cfp_open_at: string | null;
  cfp_close_at: string | null;
  notification_at: string | null;
  registration_open_at: string | null;
  status: CongressStatus;
  created_at: string;
  updated_at: string;
};

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export type SubmissionType = 'oral' | 'poster' | 'symposium';

export type Submission = {
  id: string;
  congress_id: string;
  track_id: string | null;
  title: string;
  abs_context: string;
  abs_framework: string;
  abs_methods: string;
  abs_results: string;
  abs_discussion: string;
  keywords: string[];
  methodologies: string[];
  type: SubmissionType;
  status: SubmissionStatus;
  decision_note: string | null;
  created_at: string;
  submitted_at: string | null;
  decision_at: string | null;
  updated_at: string;
};

export type ReviewRecommendation =
  | 'accept'
  | 'minor_revision'
  | 'major_revision'
  | 'reject';

export type Review = {
  id: string;
  assignment_id: string;
  score_originality: number;
  score_methodology: number;
  score_clarity: number;
  score_impact: number;
  comments_to_author: string;
  comments_to_chair: string;
  recommendation: ReviewRecommendation;
  submitted_at: string;
};

export type ReviewAssignmentStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'declined';

export type ReviewAssignment = {
  id: string;
  submission_id: string;
  reviewer_user_id: string;
  assigned_at: string;
  deadline_at: string | null;
  status: ReviewAssignmentStatus;
};

export type SubmissionAuthor = {
  id: string;
  submission_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  institution_id: string | null;
  external_institution_name: string | null;
  is_corresponding: boolean;
  is_presenter: boolean;
  display_order: number;
  created_at: string;
};

export type SavedContact = {
  user_id: string;
  researcher_id: string;
  tags: string[];
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type CongressSubscriber = {
  id: string;
  congress_id: string;
  email: string;
  name: string | null;
  created_at: string;
};

export type CongressTrack = {
  id: string;
  congress_id: string;
  name: string;
  description: string | null;
  chair_user_id: string | null;
  display_order: number;
  created_at: string;
};

// Para Insert: campos requeridos en NOT NULL sin default; el resto, opcionales.
type ResearcherInsert = Partial<Researcher> & {
  full_name: string;
  email: string;
};

type InstitutionInsert = Partial<Institution> & {
  name: string;
  country: string;
};

export type Database = {
  public: {
    Tables: {
      institutions: {
        Row: Institution;
        Insert: InstitutionInsert;
        Update: Partial<Institution>;
        Relationships: [];
      };
      researchers: {
        Row: Researcher;
        Insert: ResearcherInsert;
        Update: Partial<Researcher>;
        Relationships: [
          {
            foreignKeyName: 'researchers_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
        ];
      };
      institution_admins: {
        Row: InstitutionAdmin;
        Insert: Partial<InstitutionAdmin> & {
          user_id: string;
          institution_id: string;
        };
        Update: Partial<InstitutionAdmin>;
        Relationships: [];
      };
      super_admins: {
        Row: SuperAdmin;
        Insert: Partial<SuperAdmin> & { user_id: string };
        Update: Partial<SuperAdmin>;
        Relationships: [];
      };
      congresses: {
        Row: Congress;
        Insert: Partial<Congress> & {
          year: number;
          name: string;
          slug: string;
          start_date: string;
          end_date: string;
        };
        Update: Partial<Congress>;
        Relationships: [];
      };
      congress_tracks: {
        Row: CongressTrack;
        Insert: Partial<CongressTrack> & {
          congress_id: string;
          name: string;
        };
        Update: Partial<CongressTrack>;
        Relationships: [
          {
            foreignKeyName: 'congress_tracks_congress_id_fkey';
            columns: ['congress_id'];
            isOneToOne: false;
            referencedRelation: 'congresses';
            referencedColumns: ['id'];
          },
        ];
      };
      submissions: {
        Row: Submission;
        Insert: Partial<Submission> & {
          congress_id: string;
          title: string;
        };
        Update: Partial<Submission>;
        Relationships: [
          {
            foreignKeyName: 'submissions_congress_id_fkey';
            columns: ['congress_id'];
            isOneToOne: false;
            referencedRelation: 'congresses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'submissions_track_id_fkey';
            columns: ['track_id'];
            isOneToOne: false;
            referencedRelation: 'congress_tracks';
            referencedColumns: ['id'];
          },
        ];
      };
      submission_authors: {
        Row: SubmissionAuthor;
        Insert: Partial<SubmissionAuthor> & {
          submission_id: string;
          full_name: string;
          email: string;
        };
        Update: Partial<SubmissionAuthor>;
        Relationships: [];
      };
      review_assignments: {
        Row: ReviewAssignment;
        Insert: Partial<ReviewAssignment> & {
          submission_id: string;
          reviewer_user_id: string;
        };
        Update: Partial<ReviewAssignment>;
        Relationships: [];
      };
      reviews: {
        Row: Review;
        Insert: Partial<Review> & {
          assignment_id: string;
          score_originality: number;
          score_methodology: number;
          score_clarity: number;
          score_impact: number;
          recommendation: ReviewRecommendation;
        };
        Update: Partial<Review>;
        Relationships: [];
      };
      saved_contacts: {
        Row: SavedContact;
        Insert: Partial<SavedContact> & {
          user_id: string;
          researcher_id: string;
        };
        Update: Partial<SavedContact>;
        Relationships: [
          {
            foreignKeyName: 'saved_contacts_researcher_id_fkey';
            columns: ['researcher_id'];
            isOneToOne: false;
            referencedRelation: 'researchers';
            referencedColumns: ['id'];
          },
        ];
      };
      congress_subscribers: {
        Row: CongressSubscriber;
        Insert: Partial<CongressSubscriber> & {
          congress_id: string;
          email: string;
        };
        Update: Partial<CongressSubscriber>;
        Relationships: [
          {
            foreignKeyName: 'congress_subscribers_congress_id_fkey';
            columns: ['congress_id'];
            isOneToOne: false;
            referencedRelation: 'congresses';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      list_institution_admins: {
        Args: { p_institution_id: string };
        Returns: { user_id: string; email: string; created_at: string }[];
      };
      list_super_admins: {
        Args: Record<string, never>;
        Returns: { user_id: string; email: string; created_at: string }[];
      };
      add_institution_admin_by_email: {
        Args: { p_email: string; p_institution_id: string };
        Returns: string;
      };
      add_super_admin_by_email: {
        Args: { p_email: string };
        Returns: string;
      };
      merge_institutions: {
        Args: { p_source_id: string; p_target_id: string };
        Returns: void;
      };
      list_reviewer_pool: {
        Args: { p_congress_id: string };
        Returns: {
          user_id: string;
          email: string;
          max_load: number;
          topics: string[];
          methodologies: string[];
          active: boolean;
          assignments_count: number;
        }[];
      };
      add_reviewer_pool_entry_by_email: {
        Args: {
          p_email: string;
          p_congress_id: string;
          p_max_load: number;
          p_topics: string[];
          p_methodologies: string[];
        };
        Returns: string;
      };
      update_reviewer_pool_entry: {
        Args: {
          p_user_id: string;
          p_congress_id: string;
          p_max_load: number;
          p_topics: string[];
          p_methodologies: string[];
          p_active: boolean;
        };
        Returns: string;
      };
      remove_reviewer_pool_entry: {
        Args: { p_user_id: string; p_congress_id: string };
        Returns: string;
      };
      subscribe_to_congress: {
        Args: {
          p_congress_id: string;
          p_email: string;
          p_name?: string | null;
        };
        Returns: string;
      };
      create_submission_with_self_as_author: {
        Args: { p_congress_id: string };
        Returns: string;
      };
      add_submission_author_by_email: {
        Args: { p_submission_id: string; p_email: string };
        Returns: string;
      };
      add_external_submission_author: {
        Args: {
          p_submission_id: string;
          p_full_name: string;
          p_email: string;
          p_institution_name: string | null;
        };
        Returns: string;
      };
      submit_submission_atomic: {
        Args: { p_submission_id: string };
        Returns: string;
      };
      withdraw_submission_atomic: {
        Args: { p_submission_id: string };
        Returns: string;
      };
      list_submissions_for_admin: {
        Args: { p_congress_id: string };
        Returns: {
          id: string;
          title: string;
          status: SubmissionStatus;
          type: SubmissionType;
          track_id: string | null;
          track_name: string | null;
          authors_count: number;
          authors_names: string | null;
          assignments_count: number;
          reviews_completed: number;
          updated_at: string;
          submitted_at: string | null;
        }[];
      };
      assign_reviewer_to_submission: {
        Args: {
          p_submission_id: string;
          p_reviewer_user_id: string;
          p_deadline_at?: string | null;
        };
        Returns: string;
      };
      unassign_reviewer_from_submission: {
        Args: { p_assignment_id: string };
        Returns: string;
      };
      list_assignments_for_submission: {
        Args: { p_submission_id: string };
        Returns: {
          assignment_id: string;
          reviewer_user_id: string;
          reviewer_email: string;
          reviewer_name: string;
          status: 'pending' | 'in_progress' | 'submitted' | 'declined';
          assigned_at: string;
          deadline_at: string | null;
          review_submitted: boolean;
        }[];
      };
      submit_review_atomic: {
        Args: {
          p_assignment_id: string;
          p_score_originality: number;
          p_score_methodology: number;
          p_score_clarity: number;
          p_score_impact: number;
          p_comments_to_author: string;
          p_comments_to_chair: string;
          p_recommendation: string;
        };
        Returns: string;
      };
      decline_assignment: {
        Args: { p_assignment_id: string };
        Returns: string;
      };
      mark_assignment_in_progress: {
        Args: { p_assignment_id: string };
        Returns: string;
      };
      decide_submission: {
        Args: {
          p_submission_id: string;
          p_decision: string;
          p_note?: string | null;
        };
        Returns: string;
      };
      list_my_review_assignments: {
        Args: Record<string, never>;
        Returns: {
          assignment_id: string;
          submission_id: string;
          submission_title: string;
          submission_type: SubmissionType;
          track_name: string | null;
          congress_id: string;
          congress_name: string;
          congress_slug: string;
          congress_year: number;
          assignment_status: 'pending' | 'in_progress' | 'submitted' | 'declined';
          deadline_at: string | null;
          review_submitted: boolean;
          recommendation: string | null;
        }[];
      };
      get_review_for_reviewer: {
        Args: { p_assignment_id: string };
        Returns: {
          score_originality: number;
          score_methodology: number;
          score_clarity: number;
          score_impact: number;
          comments_to_author: string;
          comments_to_chair: string;
          recommendation: string;
          submitted_at: string;
        }[];
      };
      list_reviews_for_author: {
        Args: { p_submission_id: string };
        Returns: {
          position: number;
          score_originality: number;
          score_methodology: number;
          score_clarity: number;
          score_impact: number;
          comments_to_author: string;
          recommendation: string;
          submitted_at: string;
        }[];
      };
    };
    Enums: {
      researcher_status: ResearcherStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
