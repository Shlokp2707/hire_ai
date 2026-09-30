from django.urls import path, re_path
from . import api_views

urlpatterns = [
    # Auth
    re_path(r"^auth/register/?$", api_views.api_register, name="api_register"),
    re_path(r"^auth/login/?$", api_views.api_login, name="api_login"),
    re_path(r"^auth/send-otp/?$", api_views.api_send_otp, name="api_send_otp"),
    re_path(r"^auth/verify-otp/?$", api_views.api_verify_otp, name="api_verify_otp"),
    re_path(r"^auth/google/?$", api_views.api_google_auth, name="api_google_auth"),
    re_path(r"^auth/config/?$", api_views.api_auth_config, name="api_auth_config"),
    re_path(r"^auth/logout/?$", api_views.api_logout, name="api_logout"),
    re_path(r"^auth/me/?$", api_views.api_me, name="api_me"),
    re_path(r"^auth/profile/?$", api_views.api_profile, name="api_profile"),
    re_path(r"^auth/profile-chat/?$", api_views.api_profile_chat, name="api_profile_chat"),

    # Jobs / Candidate
    re_path(r"^jobs/?$", api_views.api_jobs_list, name="api_jobs_list"),
    re_path(r"^jobs/(?P<job_id>\d+)/?$", api_views.api_job_detail, name="api_job_detail"),
    re_path(r"^jobs/(?P<job_id>\d+)/apply/?$", api_views.api_apply_job, name="api_apply_job"),
    re_path(r"^applications/(?P<application_id>\d+)/?$", api_views.api_application_result, name="api_application_result"),

    # Recruiter
    re_path(r"^recruiter/dashboard/?$", api_views.api_hr_dashboard, name="api_hr_dashboard"),
    re_path(r"^recruiter/create-job/?$", api_views.api_create_job, name="api_create_job"),
    re_path(r"^recruiter/create-mock-job/?$", api_views.api_create_mock_job, name="api_create_mock_job"),
    re_path(r"^recruiter/jobs/(?P<job_id>\d+)/applications/?$", api_views.api_job_applications, name="api_job_applications"),

    # Interview / Proctoring
    re_path(r"^interview/(?P<application_id>\d+)/state/?$", api_views.api_interview_state, name="api_interview_state"),
    re_path(r"^interview/(?P<application_id>\d+)/verify/?$", api_views.api_verify_face, name="api_verify_face"),
    re_path(r"^interview/(?P<application_id>\d+)/submit/?$", api_views.api_submit_answer, name="api_submit_answer"),
    re_path(r"^interview/(?P<application_id>\d+)/proctor/?$", api_views.api_submit_proctoring, name="api_submit_proctoring"),
    re_path(r"^interview/(?P<application_id>\d+)/preload/?$", api_views.api_preload_models, name="api_preload_models"),
    re_path(r"^interview/(?P<application_id>\d+)/start/?$", api_views.api_start_interview, name="api_start_interview"),

    # Student ATS Resume Scorer
    re_path(r"^ats/analyze/?$", api_views.api_ats_analyze, name="api_ats_analyze"),
    re_path(r"^ats/history/?$", api_views.api_ats_history, name="api_ats_history"),
    re_path(r"^ats/analysis/(?P<analysis_id>\d+)/?$", api_views.api_ats_analysis_detail, name="api_ats_analysis_detail"),
    re_path(r"^ats/analysis/(?P<analysis_id>\d+)/fix/?$", api_views.api_ats_fix, name="api_ats_fix"),
    re_path(r"^ats/analysis/(?P<analysis_id>\d+)/chat-fix/?$", api_views.api_ats_chat_fix, name="api_ats_chat_fix"),
    re_path(r"^recruiter/helper-chat/?$", api_views.api_recruiter_helper_chat, name="api_recruiter_helper_chat"),
    
    # AI Interview Passport & Growth Reports
    re_path(r"^interview/(?P<application_id>\d+)/share-feedback/?$", api_views.api_share_growth_feedback, name="api_share_growth_feedback"),
    re_path(r"^interview/(?P<application_id>\d+)/growth-feedback/?$", api_views.api_candidate_growth_feedback, name="api_candidate_growth_feedback"),
    re_path(r"^ats/auto-align/?$", api_views.api_ats_auto_align, name="api_ats_auto_align"),
    re_path(r"^ai/intent-router/?$", api_views.api_ai_intent_router, name="api_ai_intent_router"),

    # Bring Your Own Key (BYOK) Settings
    re_path(r"^user-keys/?$", api_views.api_user_keys, name="api_user_keys"),
    re_path(r"^user-keys/validate/?$", api_views.api_user_key_validate, name="api_user_key_validate"),
    re_path(r"^user-keys/(?P<provider>[^/]+)/?$", api_views.api_user_key_delete, name="api_user_key_delete"),
]


