create type "public"."match_format_enum" as enum ('round_robin_3', 'round_robin_4', 'elimination_3', 'king_court', 'pool_play', 'bracket_single', 'bracket_double');

create type "public"."match_status_enum" as enum ('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled');

create type "public"."score_permission_enum" as enum ('admin', 'facilitator', 'captain', 'none');

create sequence "public"."league_standings_id_seq";

create sequence "public"."match_sets_id_seq";

create sequence "public"."matches_id_seq";

create sequence "public"."schedule_templates_id_seq";

create sequence "public"."tier_history_id_seq";

drop trigger if exists "on_user_league_registration" on "public"."users";

drop trigger if exists "on_user_league_registration_insert" on "public"."users";

drop policy "Service role can manage notifications" on "public"."individual_registration_notifications";

drop policy "Admins can manage all schedules" on "public"."league_schedules";

drop policy "Authenticated users can view schedules" on "public"."league_schedules";

revoke delete on table "public"."attendance" from "anon";

revoke insert on table "public"."attendance" from "anon";

revoke references on table "public"."attendance" from "anon";

revoke select on table "public"."attendance" from "anon";

revoke trigger on table "public"."attendance" from "anon";

revoke truncate on table "public"."attendance" from "anon";

revoke update on table "public"."attendance" from "anon";

revoke delete on table "public"."attendance" from "authenticated";

revoke insert on table "public"."attendance" from "authenticated";

revoke references on table "public"."attendance" from "authenticated";

revoke select on table "public"."attendance" from "authenticated";

revoke trigger on table "public"."attendance" from "authenticated";

revoke truncate on table "public"."attendance" from "authenticated";

revoke update on table "public"."attendance" from "authenticated";

revoke delete on table "public"."attendance" from "service_role";

revoke insert on table "public"."attendance" from "service_role";

revoke references on table "public"."attendance" from "service_role";

revoke select on table "public"."attendance" from "service_role";

revoke trigger on table "public"."attendance" from "service_role";

revoke truncate on table "public"."attendance" from "service_role";

revoke update on table "public"."attendance" from "service_role";

revoke delete on table "public"."balances" from "anon";

revoke insert on table "public"."balances" from "anon";

revoke references on table "public"."balances" from "anon";

revoke select on table "public"."balances" from "anon";

revoke trigger on table "public"."balances" from "anon";

revoke truncate on table "public"."balances" from "anon";

revoke update on table "public"."balances" from "anon";

revoke delete on table "public"."balances" from "authenticated";

revoke insert on table "public"."balances" from "authenticated";

revoke references on table "public"."balances" from "authenticated";

revoke select on table "public"."balances" from "authenticated";

revoke trigger on table "public"."balances" from "authenticated";

revoke truncate on table "public"."balances" from "authenticated";

revoke update on table "public"."balances" from "authenticated";

revoke delete on table "public"."balances" from "service_role";

revoke insert on table "public"."balances" from "service_role";

revoke references on table "public"."balances" from "service_role";

revoke select on table "public"."balances" from "service_role";

revoke trigger on table "public"."balances" from "service_role";

revoke truncate on table "public"."balances" from "service_role";

revoke update on table "public"."balances" from "service_role";

revoke delete on table "public"."contact_submissions" from "anon";

revoke insert on table "public"."contact_submissions" from "anon";

revoke references on table "public"."contact_submissions" from "anon";

revoke select on table "public"."contact_submissions" from "anon";

revoke trigger on table "public"."contact_submissions" from "anon";

revoke truncate on table "public"."contact_submissions" from "anon";

revoke update on table "public"."contact_submissions" from "anon";

revoke delete on table "public"."contact_submissions" from "authenticated";

revoke insert on table "public"."contact_submissions" from "authenticated";

revoke references on table "public"."contact_submissions" from "authenticated";

revoke select on table "public"."contact_submissions" from "authenticated";

revoke trigger on table "public"."contact_submissions" from "authenticated";

revoke truncate on table "public"."contact_submissions" from "authenticated";

revoke update on table "public"."contact_submissions" from "authenticated";

revoke delete on table "public"."contact_submissions" from "service_role";

revoke insert on table "public"."contact_submissions" from "service_role";

revoke references on table "public"."contact_submissions" from "service_role";

revoke select on table "public"."contact_submissions" from "service_role";

revoke trigger on table "public"."contact_submissions" from "service_role";

revoke truncate on table "public"."contact_submissions" from "service_role";

revoke update on table "public"."contact_submissions" from "service_role";

revoke delete on table "public"."game_results" from "anon";

revoke insert on table "public"."game_results" from "anon";

revoke references on table "public"."game_results" from "anon";

revoke select on table "public"."game_results" from "anon";

revoke trigger on table "public"."game_results" from "anon";

revoke truncate on table "public"."game_results" from "anon";

revoke update on table "public"."game_results" from "anon";

revoke delete on table "public"."game_results" from "authenticated";

revoke insert on table "public"."game_results" from "authenticated";

revoke references on table "public"."game_results" from "authenticated";

revoke select on table "public"."game_results" from "authenticated";

revoke trigger on table "public"."game_results" from "authenticated";

revoke truncate on table "public"."game_results" from "authenticated";

revoke update on table "public"."game_results" from "authenticated";

revoke delete on table "public"."game_results" from "service_role";

revoke insert on table "public"."game_results" from "service_role";

revoke references on table "public"."game_results" from "service_role";

revoke select on table "public"."game_results" from "service_role";

revoke trigger on table "public"."game_results" from "service_role";

revoke truncate on table "public"."game_results" from "service_role";

revoke update on table "public"."game_results" from "service_role";

revoke delete on table "public"."gyms" from "anon";

revoke insert on table "public"."gyms" from "anon";

revoke references on table "public"."gyms" from "anon";

revoke select on table "public"."gyms" from "anon";

revoke trigger on table "public"."gyms" from "anon";

revoke truncate on table "public"."gyms" from "anon";

revoke update on table "public"."gyms" from "anon";

revoke delete on table "public"."gyms" from "authenticated";

revoke insert on table "public"."gyms" from "authenticated";

revoke references on table "public"."gyms" from "authenticated";

revoke select on table "public"."gyms" from "authenticated";

revoke trigger on table "public"."gyms" from "authenticated";

revoke truncate on table "public"."gyms" from "authenticated";

revoke update on table "public"."gyms" from "authenticated";

revoke delete on table "public"."gyms" from "service_role";

revoke insert on table "public"."gyms" from "service_role";

revoke references on table "public"."gyms" from "service_role";

revoke select on table "public"."gyms" from "service_role";

revoke trigger on table "public"."gyms" from "service_role";

revoke truncate on table "public"."gyms" from "service_role";

revoke update on table "public"."gyms" from "service_role";

revoke delete on table "public"."individual_registration_notifications" from "anon";

revoke insert on table "public"."individual_registration_notifications" from "anon";

revoke references on table "public"."individual_registration_notifications" from "anon";

revoke select on table "public"."individual_registration_notifications" from "anon";

revoke trigger on table "public"."individual_registration_notifications" from "anon";

revoke truncate on table "public"."individual_registration_notifications" from "anon";

revoke update on table "public"."individual_registration_notifications" from "anon";

revoke delete on table "public"."individual_registration_notifications" from "authenticated";

revoke insert on table "public"."individual_registration_notifications" from "authenticated";

revoke references on table "public"."individual_registration_notifications" from "authenticated";

revoke select on table "public"."individual_registration_notifications" from "authenticated";

revoke trigger on table "public"."individual_registration_notifications" from "authenticated";

revoke truncate on table "public"."individual_registration_notifications" from "authenticated";

revoke update on table "public"."individual_registration_notifications" from "authenticated";

revoke delete on table "public"."individual_registration_notifications" from "service_role";

revoke insert on table "public"."individual_registration_notifications" from "service_role";

revoke references on table "public"."individual_registration_notifications" from "service_role";

revoke select on table "public"."individual_registration_notifications" from "service_role";

revoke trigger on table "public"."individual_registration_notifications" from "service_role";

revoke truncate on table "public"."individual_registration_notifications" from "service_role";

revoke update on table "public"."individual_registration_notifications" from "service_role";

revoke delete on table "public"."individual_transfer_history" from "anon";

revoke insert on table "public"."individual_transfer_history" from "anon";

revoke references on table "public"."individual_transfer_history" from "anon";

revoke select on table "public"."individual_transfer_history" from "anon";

revoke trigger on table "public"."individual_transfer_history" from "anon";

revoke truncate on table "public"."individual_transfer_history" from "anon";

revoke update on table "public"."individual_transfer_history" from "anon";

revoke delete on table "public"."individual_transfer_history" from "authenticated";

revoke insert on table "public"."individual_transfer_history" from "authenticated";

revoke references on table "public"."individual_transfer_history" from "authenticated";

revoke select on table "public"."individual_transfer_history" from "authenticated";

revoke trigger on table "public"."individual_transfer_history" from "authenticated";

revoke truncate on table "public"."individual_transfer_history" from "authenticated";

revoke update on table "public"."individual_transfer_history" from "authenticated";

revoke delete on table "public"."individual_transfer_history" from "service_role";

revoke insert on table "public"."individual_transfer_history" from "service_role";

revoke references on table "public"."individual_transfer_history" from "service_role";

revoke select on table "public"."individual_transfer_history" from "service_role";

revoke trigger on table "public"."individual_transfer_history" from "service_role";

revoke truncate on table "public"."individual_transfer_history" from "service_role";

revoke update on table "public"."individual_transfer_history" from "service_role";

revoke delete on table "public"."league_payments" from "anon";

revoke insert on table "public"."league_payments" from "anon";

revoke references on table "public"."league_payments" from "anon";

revoke select on table "public"."league_payments" from "anon";

revoke trigger on table "public"."league_payments" from "anon";

revoke truncate on table "public"."league_payments" from "anon";

revoke update on table "public"."league_payments" from "anon";

revoke delete on table "public"."league_payments" from "authenticated";

revoke insert on table "public"."league_payments" from "authenticated";

revoke references on table "public"."league_payments" from "authenticated";

revoke select on table "public"."league_payments" from "authenticated";

revoke trigger on table "public"."league_payments" from "authenticated";

revoke truncate on table "public"."league_payments" from "authenticated";

revoke update on table "public"."league_payments" from "authenticated";

revoke delete on table "public"."league_payments" from "service_role";

revoke insert on table "public"."league_payments" from "service_role";

revoke references on table "public"."league_payments" from "service_role";

revoke select on table "public"."league_payments" from "service_role";

revoke trigger on table "public"."league_payments" from "service_role";

revoke truncate on table "public"."league_payments" from "service_role";

revoke update on table "public"."league_payments" from "service_role";

revoke delete on table "public"."league_schedules" from "anon";

revoke insert on table "public"."league_schedules" from "anon";

revoke references on table "public"."league_schedules" from "anon";

revoke select on table "public"."league_schedules" from "anon";

revoke trigger on table "public"."league_schedules" from "anon";

revoke truncate on table "public"."league_schedules" from "anon";

revoke update on table "public"."league_schedules" from "anon";

revoke delete on table "public"."league_schedules" from "authenticated";

revoke insert on table "public"."league_schedules" from "authenticated";

revoke references on table "public"."league_schedules" from "authenticated";

revoke select on table "public"."league_schedules" from "authenticated";

revoke trigger on table "public"."league_schedules" from "authenticated";

revoke truncate on table "public"."league_schedules" from "authenticated";

revoke update on table "public"."league_schedules" from "authenticated";

revoke delete on table "public"."league_schedules" from "service_role";

revoke insert on table "public"."league_schedules" from "service_role";

revoke references on table "public"."league_schedules" from "service_role";

revoke select on table "public"."league_schedules" from "service_role";

revoke trigger on table "public"."league_schedules" from "service_role";

revoke truncate on table "public"."league_schedules" from "service_role";

revoke update on table "public"."league_schedules" from "service_role";

revoke delete on table "public"."leagues" from "anon";

revoke insert on table "public"."leagues" from "anon";

revoke references on table "public"."leagues" from "anon";

revoke select on table "public"."leagues" from "anon";

revoke trigger on table "public"."leagues" from "anon";

revoke truncate on table "public"."leagues" from "anon";

revoke update on table "public"."leagues" from "anon";

revoke delete on table "public"."leagues" from "authenticated";

revoke insert on table "public"."leagues" from "authenticated";

revoke references on table "public"."leagues" from "authenticated";

revoke select on table "public"."leagues" from "authenticated";

revoke trigger on table "public"."leagues" from "authenticated";

revoke truncate on table "public"."leagues" from "authenticated";

revoke update on table "public"."leagues" from "authenticated";

revoke delete on table "public"."leagues" from "service_role";

revoke insert on table "public"."leagues" from "service_role";

revoke references on table "public"."leagues" from "service_role";

revoke select on table "public"."leagues" from "service_role";

revoke trigger on table "public"."leagues" from "service_role";

revoke truncate on table "public"."leagues" from "service_role";

revoke update on table "public"."leagues" from "service_role";

revoke delete on table "public"."page_content" from "anon";

revoke insert on table "public"."page_content" from "anon";

revoke references on table "public"."page_content" from "anon";

revoke select on table "public"."page_content" from "anon";

revoke trigger on table "public"."page_content" from "anon";

revoke truncate on table "public"."page_content" from "anon";

revoke update on table "public"."page_content" from "anon";

revoke delete on table "public"."page_content" from "authenticated";

revoke insert on table "public"."page_content" from "authenticated";

revoke references on table "public"."page_content" from "authenticated";

revoke select on table "public"."page_content" from "authenticated";

revoke trigger on table "public"."page_content" from "authenticated";

revoke truncate on table "public"."page_content" from "authenticated";

revoke update on table "public"."page_content" from "authenticated";

revoke delete on table "public"."page_content" from "service_role";

revoke insert on table "public"."page_content" from "service_role";

revoke references on table "public"."page_content" from "service_role";

revoke select on table "public"."page_content" from "service_role";

revoke trigger on table "public"."page_content" from "service_role";

revoke truncate on table "public"."page_content" from "service_role";

revoke update on table "public"."page_content" from "service_role";

revoke delete on table "public"."registrations" from "anon";

revoke insert on table "public"."registrations" from "anon";

revoke references on table "public"."registrations" from "anon";

revoke select on table "public"."registrations" from "anon";

revoke trigger on table "public"."registrations" from "anon";

revoke truncate on table "public"."registrations" from "anon";

revoke update on table "public"."registrations" from "anon";

revoke delete on table "public"."registrations" from "authenticated";

revoke insert on table "public"."registrations" from "authenticated";

revoke references on table "public"."registrations" from "authenticated";

revoke select on table "public"."registrations" from "authenticated";

revoke trigger on table "public"."registrations" from "authenticated";

revoke truncate on table "public"."registrations" from "authenticated";

revoke update on table "public"."registrations" from "authenticated";

revoke delete on table "public"."registrations" from "service_role";

revoke insert on table "public"."registrations" from "service_role";

revoke references on table "public"."registrations" from "service_role";

revoke select on table "public"."registrations" from "service_role";

revoke trigger on table "public"."registrations" from "service_role";

revoke truncate on table "public"."registrations" from "service_role";

revoke update on table "public"."registrations" from "service_role";

revoke delete on table "public"."seasons" from "anon";

revoke insert on table "public"."seasons" from "anon";

revoke references on table "public"."seasons" from "anon";

revoke select on table "public"."seasons" from "anon";

revoke trigger on table "public"."seasons" from "anon";

revoke truncate on table "public"."seasons" from "anon";

revoke update on table "public"."seasons" from "anon";

revoke delete on table "public"."seasons" from "authenticated";

revoke insert on table "public"."seasons" from "authenticated";

revoke references on table "public"."seasons" from "authenticated";

revoke select on table "public"."seasons" from "authenticated";

revoke trigger on table "public"."seasons" from "authenticated";

revoke truncate on table "public"."seasons" from "authenticated";

revoke update on table "public"."seasons" from "authenticated";

revoke delete on table "public"."seasons" from "service_role";

revoke insert on table "public"."seasons" from "service_role";

revoke references on table "public"."seasons" from "service_role";

revoke select on table "public"."seasons" from "service_role";

revoke trigger on table "public"."seasons" from "service_role";

revoke truncate on table "public"."seasons" from "service_role";

revoke update on table "public"."seasons" from "service_role";

revoke delete on table "public"."site_announcements" from "anon";

revoke insert on table "public"."site_announcements" from "anon";

revoke references on table "public"."site_announcements" from "anon";

revoke select on table "public"."site_announcements" from "anon";

revoke trigger on table "public"."site_announcements" from "anon";

revoke truncate on table "public"."site_announcements" from "anon";

revoke update on table "public"."site_announcements" from "anon";

revoke delete on table "public"."site_announcements" from "authenticated";

revoke insert on table "public"."site_announcements" from "authenticated";

revoke references on table "public"."site_announcements" from "authenticated";

revoke select on table "public"."site_announcements" from "authenticated";

revoke trigger on table "public"."site_announcements" from "authenticated";

revoke truncate on table "public"."site_announcements" from "authenticated";

revoke update on table "public"."site_announcements" from "authenticated";

revoke delete on table "public"."site_announcements" from "service_role";

revoke insert on table "public"."site_announcements" from "service_role";

revoke references on table "public"."site_announcements" from "service_role";

revoke select on table "public"."site_announcements" from "service_role";

revoke trigger on table "public"."site_announcements" from "service_role";

revoke truncate on table "public"."site_announcements" from "service_role";

revoke update on table "public"."site_announcements" from "service_role";

revoke delete on table "public"."skills" from "anon";

revoke insert on table "public"."skills" from "anon";

revoke references on table "public"."skills" from "anon";

revoke select on table "public"."skills" from "anon";

revoke trigger on table "public"."skills" from "anon";

revoke truncate on table "public"."skills" from "anon";

revoke update on table "public"."skills" from "anon";

revoke delete on table "public"."skills" from "authenticated";

revoke insert on table "public"."skills" from "authenticated";

revoke references on table "public"."skills" from "authenticated";

revoke select on table "public"."skills" from "authenticated";

revoke trigger on table "public"."skills" from "authenticated";

revoke truncate on table "public"."skills" from "authenticated";

revoke update on table "public"."skills" from "authenticated";

revoke delete on table "public"."skills" from "service_role";

revoke insert on table "public"."skills" from "service_role";

revoke references on table "public"."skills" from "service_role";

revoke select on table "public"."skills" from "service_role";

revoke trigger on table "public"."skills" from "service_role";

revoke truncate on table "public"."skills" from "service_role";

revoke update on table "public"."skills" from "service_role";

revoke delete on table "public"."spares" from "anon";

revoke insert on table "public"."spares" from "anon";

revoke references on table "public"."spares" from "anon";

revoke select on table "public"."spares" from "anon";

revoke trigger on table "public"."spares" from "anon";

revoke truncate on table "public"."spares" from "anon";

revoke update on table "public"."spares" from "anon";

revoke delete on table "public"."spares" from "authenticated";

revoke insert on table "public"."spares" from "authenticated";

revoke references on table "public"."spares" from "authenticated";

revoke select on table "public"."spares" from "authenticated";

revoke trigger on table "public"."spares" from "authenticated";

revoke truncate on table "public"."spares" from "authenticated";

revoke update on table "public"."spares" from "authenticated";

revoke delete on table "public"."spares" from "service_role";

revoke insert on table "public"."spares" from "service_role";

revoke references on table "public"."spares" from "service_role";

revoke select on table "public"."spares" from "service_role";

revoke trigger on table "public"."spares" from "service_role";

revoke truncate on table "public"."spares" from "service_role";

revoke update on table "public"."spares" from "service_role";

revoke delete on table "public"."sports" from "anon";

revoke insert on table "public"."sports" from "anon";

revoke references on table "public"."sports" from "anon";

revoke select on table "public"."sports" from "anon";

revoke trigger on table "public"."sports" from "anon";

revoke truncate on table "public"."sports" from "anon";

revoke update on table "public"."sports" from "anon";

revoke delete on table "public"."sports" from "authenticated";

revoke insert on table "public"."sports" from "authenticated";

revoke references on table "public"."sports" from "authenticated";

revoke select on table "public"."sports" from "authenticated";

revoke trigger on table "public"."sports" from "authenticated";

revoke truncate on table "public"."sports" from "authenticated";

revoke update on table "public"."sports" from "authenticated";

revoke delete on table "public"."sports" from "service_role";

revoke insert on table "public"."sports" from "service_role";

revoke references on table "public"."sports" from "service_role";

revoke select on table "public"."sports" from "service_role";

revoke trigger on table "public"."sports" from "service_role";

revoke truncate on table "public"."sports" from "service_role";

revoke update on table "public"."sports" from "service_role";

revoke delete on table "public"."standings" from "anon";

revoke insert on table "public"."standings" from "anon";

revoke references on table "public"."standings" from "anon";

revoke select on table "public"."standings" from "anon";

revoke trigger on table "public"."standings" from "anon";

revoke truncate on table "public"."standings" from "anon";

revoke update on table "public"."standings" from "anon";

revoke delete on table "public"."standings" from "authenticated";

revoke insert on table "public"."standings" from "authenticated";

revoke references on table "public"."standings" from "authenticated";

revoke select on table "public"."standings" from "authenticated";

revoke trigger on table "public"."standings" from "authenticated";

revoke truncate on table "public"."standings" from "authenticated";

revoke update on table "public"."standings" from "authenticated";

revoke delete on table "public"."standings" from "service_role";

revoke insert on table "public"."standings" from "service_role";

revoke references on table "public"."standings" from "service_role";

revoke select on table "public"."standings" from "service_role";

revoke trigger on table "public"."standings" from "service_role";

revoke truncate on table "public"."standings" from "service_role";

revoke update on table "public"."standings" from "service_role";

revoke delete on table "public"."stripe_customers" from "anon";

revoke insert on table "public"."stripe_customers" from "anon";

revoke references on table "public"."stripe_customers" from "anon";

revoke select on table "public"."stripe_customers" from "anon";

revoke trigger on table "public"."stripe_customers" from "anon";

revoke truncate on table "public"."stripe_customers" from "anon";

revoke update on table "public"."stripe_customers" from "anon";

revoke delete on table "public"."stripe_customers" from "authenticated";

revoke insert on table "public"."stripe_customers" from "authenticated";

revoke references on table "public"."stripe_customers" from "authenticated";

revoke select on table "public"."stripe_customers" from "authenticated";

revoke trigger on table "public"."stripe_customers" from "authenticated";

revoke truncate on table "public"."stripe_customers" from "authenticated";

revoke update on table "public"."stripe_customers" from "authenticated";

revoke delete on table "public"."stripe_customers" from "service_role";

revoke insert on table "public"."stripe_customers" from "service_role";

revoke references on table "public"."stripe_customers" from "service_role";

revoke select on table "public"."stripe_customers" from "service_role";

revoke trigger on table "public"."stripe_customers" from "service_role";

revoke truncate on table "public"."stripe_customers" from "service_role";

revoke update on table "public"."stripe_customers" from "service_role";

revoke delete on table "public"."stripe_orders" from "anon";

revoke insert on table "public"."stripe_orders" from "anon";

revoke references on table "public"."stripe_orders" from "anon";

revoke select on table "public"."stripe_orders" from "anon";

revoke trigger on table "public"."stripe_orders" from "anon";

revoke truncate on table "public"."stripe_orders" from "anon";

revoke update on table "public"."stripe_orders" from "anon";

revoke delete on table "public"."stripe_orders" from "authenticated";

revoke insert on table "public"."stripe_orders" from "authenticated";

revoke references on table "public"."stripe_orders" from "authenticated";

revoke select on table "public"."stripe_orders" from "authenticated";

revoke trigger on table "public"."stripe_orders" from "authenticated";

revoke truncate on table "public"."stripe_orders" from "authenticated";

revoke update on table "public"."stripe_orders" from "authenticated";

revoke delete on table "public"."stripe_orders" from "service_role";

revoke insert on table "public"."stripe_orders" from "service_role";

revoke references on table "public"."stripe_orders" from "service_role";

revoke select on table "public"."stripe_orders" from "service_role";

revoke trigger on table "public"."stripe_orders" from "service_role";

revoke truncate on table "public"."stripe_orders" from "service_role";

revoke update on table "public"."stripe_orders" from "service_role";

revoke delete on table "public"."stripe_products" from "anon";

revoke insert on table "public"."stripe_products" from "anon";

revoke references on table "public"."stripe_products" from "anon";

revoke select on table "public"."stripe_products" from "anon";

revoke trigger on table "public"."stripe_products" from "anon";

revoke truncate on table "public"."stripe_products" from "anon";

revoke update on table "public"."stripe_products" from "anon";

revoke delete on table "public"."stripe_products" from "authenticated";

revoke insert on table "public"."stripe_products" from "authenticated";

revoke references on table "public"."stripe_products" from "authenticated";

revoke select on table "public"."stripe_products" from "authenticated";

revoke trigger on table "public"."stripe_products" from "authenticated";

revoke truncate on table "public"."stripe_products" from "authenticated";

revoke update on table "public"."stripe_products" from "authenticated";

revoke delete on table "public"."stripe_products" from "service_role";

revoke insert on table "public"."stripe_products" from "service_role";

revoke references on table "public"."stripe_products" from "service_role";

revoke select on table "public"."stripe_products" from "service_role";

revoke trigger on table "public"."stripe_products" from "service_role";

revoke truncate on table "public"."stripe_products" from "service_role";

revoke update on table "public"."stripe_products" from "service_role";

revoke delete on table "public"."stripe_subscriptions" from "anon";

revoke insert on table "public"."stripe_subscriptions" from "anon";

revoke references on table "public"."stripe_subscriptions" from "anon";

revoke select on table "public"."stripe_subscriptions" from "anon";

revoke trigger on table "public"."stripe_subscriptions" from "anon";

revoke truncate on table "public"."stripe_subscriptions" from "anon";

revoke update on table "public"."stripe_subscriptions" from "anon";

revoke delete on table "public"."stripe_subscriptions" from "authenticated";

revoke insert on table "public"."stripe_subscriptions" from "authenticated";

revoke references on table "public"."stripe_subscriptions" from "authenticated";

revoke select on table "public"."stripe_subscriptions" from "authenticated";

revoke trigger on table "public"."stripe_subscriptions" from "authenticated";

revoke truncate on table "public"."stripe_subscriptions" from "authenticated";

revoke update on table "public"."stripe_subscriptions" from "authenticated";

revoke delete on table "public"."stripe_subscriptions" from "service_role";

revoke insert on table "public"."stripe_subscriptions" from "service_role";

revoke references on table "public"."stripe_subscriptions" from "service_role";

revoke select on table "public"."stripe_subscriptions" from "service_role";

revoke trigger on table "public"."stripe_subscriptions" from "service_role";

revoke truncate on table "public"."stripe_subscriptions" from "service_role";

revoke update on table "public"."stripe_subscriptions" from "service_role";

revoke delete on table "public"."team_invites" from "anon";

revoke insert on table "public"."team_invites" from "anon";

revoke references on table "public"."team_invites" from "anon";

revoke select on table "public"."team_invites" from "anon";

revoke trigger on table "public"."team_invites" from "anon";

revoke truncate on table "public"."team_invites" from "anon";

revoke update on table "public"."team_invites" from "anon";

revoke delete on table "public"."team_invites" from "authenticated";

revoke insert on table "public"."team_invites" from "authenticated";

revoke references on table "public"."team_invites" from "authenticated";

revoke select on table "public"."team_invites" from "authenticated";

revoke trigger on table "public"."team_invites" from "authenticated";

revoke truncate on table "public"."team_invites" from "authenticated";

revoke update on table "public"."team_invites" from "authenticated";

revoke delete on table "public"."team_invites" from "service_role";

revoke insert on table "public"."team_invites" from "service_role";

revoke references on table "public"."team_invites" from "service_role";

revoke select on table "public"."team_invites" from "service_role";

revoke trigger on table "public"."team_invites" from "service_role";

revoke truncate on table "public"."team_invites" from "service_role";

revoke update on table "public"."team_invites" from "service_role";

revoke delete on table "public"."team_registration_notifications" from "anon";

revoke insert on table "public"."team_registration_notifications" from "anon";

revoke references on table "public"."team_registration_notifications" from "anon";

revoke select on table "public"."team_registration_notifications" from "anon";

revoke trigger on table "public"."team_registration_notifications" from "anon";

revoke truncate on table "public"."team_registration_notifications" from "anon";

revoke update on table "public"."team_registration_notifications" from "anon";

revoke delete on table "public"."team_registration_notifications" from "authenticated";

revoke insert on table "public"."team_registration_notifications" from "authenticated";

revoke references on table "public"."team_registration_notifications" from "authenticated";

revoke select on table "public"."team_registration_notifications" from "authenticated";

revoke trigger on table "public"."team_registration_notifications" from "authenticated";

revoke truncate on table "public"."team_registration_notifications" from "authenticated";

revoke update on table "public"."team_registration_notifications" from "authenticated";

revoke delete on table "public"."team_registration_notifications" from "service_role";

revoke insert on table "public"."team_registration_notifications" from "service_role";

revoke references on table "public"."team_registration_notifications" from "service_role";

revoke select on table "public"."team_registration_notifications" from "service_role";

revoke trigger on table "public"."team_registration_notifications" from "service_role";

revoke truncate on table "public"."team_registration_notifications" from "service_role";

revoke update on table "public"."team_registration_notifications" from "service_role";

revoke delete on table "public"."team_transfer_history" from "anon";

revoke insert on table "public"."team_transfer_history" from "anon";

revoke references on table "public"."team_transfer_history" from "anon";

revoke select on table "public"."team_transfer_history" from "anon";

revoke trigger on table "public"."team_transfer_history" from "anon";

revoke truncate on table "public"."team_transfer_history" from "anon";

revoke update on table "public"."team_transfer_history" from "anon";

revoke delete on table "public"."team_transfer_history" from "authenticated";

revoke insert on table "public"."team_transfer_history" from "authenticated";

revoke references on table "public"."team_transfer_history" from "authenticated";

revoke select on table "public"."team_transfer_history" from "authenticated";

revoke trigger on table "public"."team_transfer_history" from "authenticated";

revoke truncate on table "public"."team_transfer_history" from "authenticated";

revoke update on table "public"."team_transfer_history" from "authenticated";

revoke delete on table "public"."team_transfer_history" from "service_role";

revoke insert on table "public"."team_transfer_history" from "service_role";

revoke references on table "public"."team_transfer_history" from "service_role";

revoke select on table "public"."team_transfer_history" from "service_role";

revoke trigger on table "public"."team_transfer_history" from "service_role";

revoke truncate on table "public"."team_transfer_history" from "service_role";

revoke update on table "public"."team_transfer_history" from "service_role";

revoke delete on table "public"."teams" from "anon";

revoke insert on table "public"."teams" from "anon";

revoke references on table "public"."teams" from "anon";

revoke select on table "public"."teams" from "anon";

revoke trigger on table "public"."teams" from "anon";

revoke truncate on table "public"."teams" from "anon";

revoke update on table "public"."teams" from "anon";

revoke delete on table "public"."teams" from "authenticated";

revoke insert on table "public"."teams" from "authenticated";

revoke references on table "public"."teams" from "authenticated";

revoke select on table "public"."teams" from "authenticated";

revoke trigger on table "public"."teams" from "authenticated";

revoke truncate on table "public"."teams" from "authenticated";

revoke update on table "public"."teams" from "authenticated";

revoke delete on table "public"."teams" from "service_role";

revoke insert on table "public"."teams" from "service_role";

revoke references on table "public"."teams" from "service_role";

revoke select on table "public"."teams" from "service_role";

revoke trigger on table "public"."teams" from "service_role";

revoke truncate on table "public"."teams" from "service_role";

revoke update on table "public"."teams" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

revoke delete on table "public"."waiver_acceptances" from "anon";

revoke insert on table "public"."waiver_acceptances" from "anon";

revoke references on table "public"."waiver_acceptances" from "anon";

revoke select on table "public"."waiver_acceptances" from "anon";

revoke trigger on table "public"."waiver_acceptances" from "anon";

revoke truncate on table "public"."waiver_acceptances" from "anon";

revoke update on table "public"."waiver_acceptances" from "anon";

revoke delete on table "public"."waiver_acceptances" from "authenticated";

revoke insert on table "public"."waiver_acceptances" from "authenticated";

revoke references on table "public"."waiver_acceptances" from "authenticated";

revoke select on table "public"."waiver_acceptances" from "authenticated";

revoke trigger on table "public"."waiver_acceptances" from "authenticated";

revoke truncate on table "public"."waiver_acceptances" from "authenticated";

revoke update on table "public"."waiver_acceptances" from "authenticated";

revoke delete on table "public"."waiver_acceptances" from "service_role";

revoke insert on table "public"."waiver_acceptances" from "service_role";

revoke references on table "public"."waiver_acceptances" from "service_role";

revoke select on table "public"."waiver_acceptances" from "service_role";

revoke trigger on table "public"."waiver_acceptances" from "service_role";

revoke truncate on table "public"."waiver_acceptances" from "service_role";

revoke update on table "public"."waiver_acceptances" from "service_role";

revoke delete on table "public"."waivers" from "anon";

revoke insert on table "public"."waivers" from "anon";

revoke references on table "public"."waivers" from "anon";

revoke select on table "public"."waivers" from "anon";

revoke trigger on table "public"."waivers" from "anon";

revoke truncate on table "public"."waivers" from "anon";

revoke update on table "public"."waivers" from "anon";

revoke delete on table "public"."waivers" from "authenticated";

revoke insert on table "public"."waivers" from "authenticated";

revoke references on table "public"."waivers" from "authenticated";

revoke select on table "public"."waivers" from "authenticated";

revoke trigger on table "public"."waivers" from "authenticated";

revoke truncate on table "public"."waivers" from "authenticated";

revoke update on table "public"."waivers" from "authenticated";

revoke delete on table "public"."waivers" from "service_role";

revoke insert on table "public"."waivers" from "service_role";

revoke references on table "public"."waivers" from "service_role";

revoke select on table "public"."waivers" from "service_role";

revoke trigger on table "public"."waivers" from "service_role";

revoke truncate on table "public"."waivers" from "service_role";

revoke update on table "public"."waivers" from "service_role";

revoke delete on table "public"."weekly_schedules" from "anon";

revoke insert on table "public"."weekly_schedules" from "anon";

revoke references on table "public"."weekly_schedules" from "anon";

revoke select on table "public"."weekly_schedules" from "anon";

revoke trigger on table "public"."weekly_schedules" from "anon";

revoke truncate on table "public"."weekly_schedules" from "anon";

revoke update on table "public"."weekly_schedules" from "anon";

revoke delete on table "public"."weekly_schedules" from "authenticated";

revoke insert on table "public"."weekly_schedules" from "authenticated";

revoke references on table "public"."weekly_schedules" from "authenticated";

revoke select on table "public"."weekly_schedules" from "authenticated";

revoke trigger on table "public"."weekly_schedules" from "authenticated";

revoke truncate on table "public"."weekly_schedules" from "authenticated";

revoke update on table "public"."weekly_schedules" from "authenticated";

revoke delete on table "public"."weekly_schedules" from "service_role";

revoke insert on table "public"."weekly_schedules" from "service_role";

revoke references on table "public"."weekly_schedules" from "service_role";

revoke select on table "public"."weekly_schedules" from "service_role";

revoke trigger on table "public"."weekly_schedules" from "service_role";

revoke truncate on table "public"."weekly_schedules" from "service_role";

revoke update on table "public"."weekly_schedules" from "service_role";

alter table "public"."individual_registration_notifications" drop constraint "individual_registration_notifications_league_id_fkey";

alter table "public"."individual_registration_notifications" drop constraint "individual_registration_notifications_user_id_fkey";

drop function if exists "public"."calculate_standings"(p_league_id integer);

drop function if exists "public"."get_standings_with_adjustments"(p_league_id integer);

drop function if exists "public"."register_spare"(p_sport_id bigint, p_skill_level text, p_share_phone boolean, p_available_monday boolean, p_available_tuesday boolean, p_available_wednesday boolean, p_available_thursday boolean, p_available_friday boolean, p_available_saturday boolean, p_available_sunday boolean, p_gender_identity text, p_gender_identity_other text, p_volleyball_positions text[]);

alter table "public"."contact_submissions" drop constraint "contact_submissions_pkey";

alter table "public"."individual_registration_notifications" drop constraint "individual_registration_notifications_pkey";

drop index if exists "public"."contact_submissions_pkey";

drop index if exists "public"."idx_contact_submissions_ip_created";

drop index if exists "public"."idx_individual_notifications_unsent";

drop index if exists "public"."idx_unique_user_league_payment";

drop index if exists "public"."individual_registration_notifications_pkey";

drop table "public"."contact_submissions";

drop table "public"."individual_registration_notifications";

create table "public"."league_standings" (
    "id" bigint not null default nextval('league_standings_id_seq'::regclass),
    "league_id" bigint not null,
    "team_id" bigint not null,
    "week_number" integer not null,
    "current_tier" integer not null default 1,
    "tier_rank" integer not null default 1,
    "matches_played" integer default 0,
    "matches_won" integer default 0,
    "matches_lost" integer default 0,
    "sets_played" integer default 0,
    "sets_won" integer default 0,
    "sets_lost" integer default 0,
    "points_for" integer default 0,
    "points_against" integer default 0,
    "point_differential" integer default 0,
    "match_win_percentage" numeric(5,3) default 0.000,
    "set_win_percentage" numeric(5,3) default 0.000,
    "previous_tier" integer,
    "tier_movement" integer default 0,
    "calculated_at" timestamp with time zone default now()
);


alter table "public"."league_standings" enable row level security;

create table "public"."match_sets" (
    "id" bigint not null default nextval('match_sets_id_seq'::regclass),
    "match_id" bigint not null,
    "set_number" integer not null,
    "team_a_score" integer default 0,
    "team_b_score" integer default 0,
    "team_c_score" integer default 0,
    "duration_minutes" integer,
    "is_tie_break" boolean default false,
    "notes" text,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone default now()
);


alter table "public"."match_sets" enable row level security;

create table "public"."matches" (
    "id" bigint not null default nextval('matches_id_seq'::regclass),
    "league_id" bigint not null,
    "week_number" integer not null,
    "match_date" date not null,
    "tier" integer not null default 1,
    "position_a" bigint,
    "position_b" bigint,
    "position_c" bigint,
    "gym_id" bigint,
    "court" text,
    "time_slot" time without time zone,
    "match_format" match_format_enum default 'round_robin_3'::match_format_enum,
    "template_id" bigint,
    "status" match_status_enum default 'scheduled'::match_status_enum,
    "facilitator_id" text,
    "team_a_total_points" integer default 0,
    "team_b_total_points" integer default 0,
    "team_c_total_points" integer default 0,
    "team_a_sets_won" integer default 0,
    "team_b_sets_won" integer default 0,
    "team_c_sets_won" integer default 0,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone
);


alter table "public"."matches" enable row level security;

create table "public"."schedule_templates" (
    "id" bigint not null default nextval('schedule_templates_id_seq'::regclass),
    "name" text not null,
    "description" text,
    "match_format" match_format_enum not null,
    "teams_per_match" integer not null default 3,
    "sets_per_match" integer not null default 3,
    "points_per_set" integer not null default 25,
    "min_point_difference" integer not null default 2,
    "max_sets" integer,
    "tie_break_points" integer default 15,
    "active" boolean default true,
    "created_at" timestamp with time zone default now()
);


alter table "public"."schedule_templates" enable row level security;

create table "public"."tier_history" (
    "id" bigint not null default nextval('tier_history_id_seq'::regclass),
    "league_id" bigint not null,
    "team_id" bigint not null,
    "week_number" integer not null,
    "previous_tier" integer,
    "new_tier" integer not null,
    "movement_type" text,
    "final_rank" integer,
    "win_percentage" numeric(5,3),
    "point_differential" integer,
    "reason" text,
    "moved_by" text,
    "automated" boolean default true,
    "effective_date" date not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."tier_history" enable row level security;

alter table "public"."game_results" add column "game_end_time" timestamp with time zone;

alter table "public"."game_results" add column "game_start_time" timestamp with time zone;

alter table "public"."game_results" add column "match_notes" text;

alter table "public"."game_results" add column "recorded_by" text;

alter table "public"."team_registration_notifications" add column "league_skill_level" text;

alter table "public"."team_transfer_history" alter column "from_league_id" set not null;

alter table "public"."team_transfer_history" alter column "id" set default gen_random_uuid();

alter table "public"."team_transfer_history" alter column "id" drop identity;

alter table "public"."team_transfer_history" alter column "id" set data type uuid using "id"::uuid;

alter table "public"."team_transfer_history" alter column "metadata" set default '{}'::jsonb;

alter table "public"."team_transfer_history" alter column "to_league_id" set not null;

alter table "public"."team_transfer_history" alter column "transferred_at" drop not null;

alter table "public"."team_transfer_history" enable row level security;

CREATE INDEX idx_game_results_completion_time ON public.game_results USING btree (game_end_time) WHERE (game_end_time IS NOT NULL);

CREATE INDEX idx_spares_share_phone ON public.spares USING btree (share_phone, is_active);

CREATE INDEX idx_spares_sport_active ON public.spares USING btree (sport_id, is_active);

CREATE INDEX idx_team_transfer_history_date ON public.team_transfer_history USING btree (transferred_at DESC);

CREATE INDEX idx_weekly_schedules_completion_status ON public.weekly_schedules USING btree (is_completed, week_number);

CREATE INDEX idx_weekly_schedules_format ON public.weekly_schedules USING btree (format);

CREATE INDEX idx_weekly_schedules_league_week_tier ON public.weekly_schedules USING btree (league_id, week_number, tier_number);

CREATE INDEX idx_weekly_schedules_playoff_status ON public.weekly_schedules USING btree (is_playoff) WHERE (is_playoff = true);

CREATE INDEX league_standings_league_week_idx ON public.league_standings USING btree (league_id, week_number);

CREATE UNIQUE INDEX league_standings_pkey ON public.league_standings USING btree (id);

CREATE INDEX league_standings_team_idx ON public.league_standings USING btree (team_id);

CREATE INDEX league_standings_tier_rank_idx ON public.league_standings USING btree (current_tier, tier_rank);

CREATE UNIQUE INDEX league_standings_unique_team_week ON public.league_standings USING btree (league_id, team_id, week_number);

CREATE INDEX match_sets_match_id_idx ON public.match_sets USING btree (match_id);

CREATE UNIQUE INDEX match_sets_pkey ON public.match_sets USING btree (id);

CREATE UNIQUE INDEX match_sets_unique_set ON public.match_sets USING btree (match_id, set_number);

CREATE INDEX matches_date_idx ON public.matches USING btree (match_date);

CREATE INDEX matches_facilitator_idx ON public.matches USING btree (facilitator_id);

CREATE INDEX matches_league_week_idx ON public.matches USING btree (league_id, week_number);

CREATE UNIQUE INDEX matches_pkey ON public.matches USING btree (id);

CREATE INDEX matches_status_idx ON public.matches USING btree (status);

CREATE INDEX matches_tier_idx ON public.matches USING btree (tier);

CREATE UNIQUE INDEX schedule_templates_pkey ON public.schedule_templates USING btree (id);

CREATE UNIQUE INDEX spares_user_sport_active_unique ON public.spares USING btree (user_id, sport_id) WHERE (is_active = true);

CREATE INDEX tier_history_effective_date_idx ON public.tier_history USING btree (effective_date);

CREATE INDEX tier_history_league_team_idx ON public.tier_history USING btree (league_id, team_id);

CREATE UNIQUE INDEX tier_history_pkey ON public.tier_history USING btree (id);

CREATE INDEX tier_history_week_idx ON public.tier_history USING btree (week_number);

CREATE INDEX weekly_schedules_league_week_idx ON public.weekly_schedules USING btree (league_id, week_number, tier_number);

alter table "public"."league_standings" add constraint "league_standings_pkey" PRIMARY KEY using index "league_standings_pkey";

alter table "public"."match_sets" add constraint "match_sets_pkey" PRIMARY KEY using index "match_sets_pkey";

alter table "public"."matches" add constraint "matches_pkey" PRIMARY KEY using index "matches_pkey";

alter table "public"."schedule_templates" add constraint "schedule_templates_pkey" PRIMARY KEY using index "schedule_templates_pkey";

alter table "public"."tier_history" add constraint "tier_history_pkey" PRIMARY KEY using index "tier_history_pkey";

alter table "public"."league_standings" add constraint "league_standings_league_id_fkey" FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE not valid;

alter table "public"."league_standings" validate constraint "league_standings_league_id_fkey";

alter table "public"."league_standings" add constraint "league_standings_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE not valid;

alter table "public"."league_standings" validate constraint "league_standings_team_id_fkey";

alter table "public"."league_standings" add constraint "league_standings_unique_team_week" UNIQUE using index "league_standings_unique_team_week";

alter table "public"."match_sets" add constraint "match_sets_match_id_fkey" FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE not valid;

alter table "public"."match_sets" validate constraint "match_sets_match_id_fkey";

alter table "public"."match_sets" add constraint "match_sets_unique_set" UNIQUE using index "match_sets_unique_set";

alter table "public"."matches" add constraint "matches_facilitator_id_fkey" FOREIGN KEY (facilitator_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."matches" validate constraint "matches_facilitator_id_fkey";

alter table "public"."matches" add constraint "matches_gym_id_fkey" FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL not valid;

alter table "public"."matches" validate constraint "matches_gym_id_fkey";

alter table "public"."matches" add constraint "matches_league_id_fkey" FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE not valid;

alter table "public"."matches" validate constraint "matches_league_id_fkey";

alter table "public"."matches" add constraint "matches_position_a_fkey" FOREIGN KEY (position_a) REFERENCES teams(id) ON DELETE SET NULL not valid;

alter table "public"."matches" validate constraint "matches_position_a_fkey";

alter table "public"."matches" add constraint "matches_position_b_fkey" FOREIGN KEY (position_b) REFERENCES teams(id) ON DELETE SET NULL not valid;

alter table "public"."matches" validate constraint "matches_position_b_fkey";

alter table "public"."matches" add constraint "matches_position_c_fkey" FOREIGN KEY (position_c) REFERENCES teams(id) ON DELETE SET NULL not valid;

alter table "public"."matches" validate constraint "matches_position_c_fkey";

alter table "public"."matches" add constraint "matches_template_id_fkey" FOREIGN KEY (template_id) REFERENCES schedule_templates(id) ON DELETE SET NULL not valid;

alter table "public"."matches" validate constraint "matches_template_id_fkey";

alter table "public"."spares" add constraint "spares_skill_level_check" CHECK ((skill_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text, 'competitive'::text, 'elite'::text]))) not valid;

alter table "public"."spares" validate constraint "spares_skill_level_check";

alter table "public"."spares" add constraint "spares_sport_id_fkey" FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE not valid;

alter table "public"."spares" validate constraint "spares_sport_id_fkey";

alter table "public"."spares" add constraint "spares_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."spares" validate constraint "spares_user_id_fkey";

alter table "public"."team_transfer_history" add constraint "team_transfer_history_transferred_by_fkey" FOREIGN KEY (transferred_by) REFERENCES auth.users(id) not valid;

alter table "public"."team_transfer_history" validate constraint "team_transfer_history_transferred_by_fkey";

alter table "public"."tier_history" add constraint "tier_history_league_id_fkey" FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE not valid;

alter table "public"."tier_history" validate constraint "tier_history_league_id_fkey";

alter table "public"."tier_history" add constraint "tier_history_moved_by_fkey" FOREIGN KEY (moved_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."tier_history" validate constraint "tier_history_moved_by_fkey";

alter table "public"."tier_history" add constraint "tier_history_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE not valid;

alter table "public"."tier_history" validate constraint "tier_history_team_id_fkey";

alter table "public"."weekly_schedules" add constraint "check_tier_number_positive" CHECK ((tier_number > 0)) not valid;

alter table "public"."weekly_schedules" validate constraint "check_tier_number_positive";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.apply_week_bump(p_league_id integer, p_from_week integer, p_to_week integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  r RECORD;
BEGIN
  IF p_from_week = p_to_week THEN
    RETURN;
  END IF;

  PERFORM 1;
  -- Clear duplicates in destination for any names that will be copied
  -- Collect names first (including D/E/F positions for 4-team and 6-team formats)
  CREATE TEMP TABLE tmp_names(name text) ON COMMIT DROP;
  INSERT INTO tmp_names(name)
  SELECT DISTINCT unnest(ARRAY[ws.team_a_name, ws.team_b_name, ws.team_c_name,
                                ws.team_d_name, ws.team_e_name, ws.team_f_name])
  FROM weekly_schedules ws
  WHERE ws.league_id = p_league_id AND ws.week_number = p_from_week;

  -- Remove nulls
  DELETE FROM tmp_names WHERE name IS NULL;

  -- Clear any matching names in destination week (A..F)
  UPDATE weekly_schedules d
  SET team_a_name = CASE WHEN d.team_a_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_a_name END,
      team_a_ranking = CASE WHEN d.team_a_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_a_ranking END,
      team_b_name = CASE WHEN d.team_b_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_b_name END,
      team_b_ranking = CASE WHEN d.team_b_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_b_ranking END,
      team_c_name = CASE WHEN d.team_c_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_c_name END,
      team_c_ranking = CASE WHEN d.team_c_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_c_ranking END,
      team_d_name = CASE WHEN d.team_d_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_d_name END,
      team_d_ranking = CASE WHEN d.team_d_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_d_ranking END,
      team_e_name = CASE WHEN d.team_e_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_e_name END,
      team_e_ranking = CASE WHEN d.team_e_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_e_ranking END,
      team_f_name = CASE WHEN d.team_f_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_f_name END,
      team_f_ranking = CASE WHEN d.team_f_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_f_ranking END
  WHERE d.league_id = p_league_id AND d.week_number = p_to_week;

  -- Ensure destination rows exist for all tiers present in source
  INSERT INTO weekly_schedules (
    league_id, week_number, tier_number,
    location, time_slot, court, format,
    team_a_name, team_a_ranking,
    team_b_name, team_b_ranking,
    team_c_name, team_c_ranking,
    team_d_name, team_d_ranking,
    team_e_name, team_e_ranking,
    team_f_name, team_f_ranking,
    is_completed, no_games, is_playoff
  )
  SELECT s.league_id, p_to_week, s.tier_number,
         s.location, s.time_slot, s.court, s.format,
         NULL, NULL,
         NULL, NULL,
         NULL, NULL,
         NULL, NULL,
         NULL, NULL,
         NULL, NULL,
         FALSE, FALSE, COALESCE(s.is_playoff, FALSE)
  FROM weekly_schedules s
  WHERE s.league_id = p_league_id AND s.week_number = p_from_week
    AND NOT EXISTS (
      SELECT 1 FROM weekly_schedules d
      WHERE d.league_id = p_league_id AND d.week_number = p_to_week AND d.tier_number = s.tier_number
    );

  -- Copy all team positions (A/B/C/D/E/F) to destination same tier
  -- Also preserve the format to ensure compatibility with 4-team and 6-team formats
  UPDATE weekly_schedules d
  SET team_a_name = s.team_a_name,
      team_a_ranking = s.team_a_ranking,
      team_b_name = s.team_b_name,
      team_b_ranking = s.team_b_ranking,
      team_c_name = s.team_c_name,
      team_c_ranking = s.team_c_ranking,
      team_d_name = s.team_d_name,
      team_d_ranking = s.team_d_ranking,
      team_e_name = s.team_e_name,
      team_e_ranking = s.team_e_ranking,
      team_f_name = s.team_f_name,
      team_f_ranking = s.team_f_ranking,
      format = COALESCE(s.format, d.format)  -- Preserve source format if it exists
  FROM weekly_schedules s
  WHERE s.league_id = p_league_id AND s.week_number = p_from_week
    AND d.league_id = p_league_id AND d.week_number = p_to_week AND d.tier_number = s.tier_number;

  -- Clear all team positions (A/B/C/D/E/F) in source after copy
  UPDATE weekly_schedules s
  SET team_a_name = NULL, team_a_ranking = NULL,
      team_b_name = NULL, team_b_ranking = NULL,
      team_c_name = NULL, team_c_ranking = NULL,
      team_d_name = NULL, team_d_ranking = NULL,
      team_e_name = NULL, team_e_ranking = NULL,
      team_f_name = NULL, team_f_ranking = NULL
  WHERE s.league_id = p_league_id AND s.week_number = p_from_week;

END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_fix_user_profile(p_auth_id text, p_email text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  user_exists BOOLEAN;
  user_id TEXT;
  now_timestamp TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Convert auth_id to text if it's a UUID
  user_id := p_auth_id;
  
  -- Check if user exists in public.users
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE auth_id = user_id::uuid
  ) INTO user_exists;
  
  -- If user doesn't exist, create it
  IF NOT user_exists THEN
    -- Insert a new record into public.users
    BEGIN
      INSERT INTO public.users (
        id,
        auth_id,
        name,
        email,
        phone,
        date_created,
        date_modified,
        is_admin
      ) VALUES (
        user_id,
        user_id::uuid,
        COALESCE(p_name, ''),
        COALESCE(p_email, ''),
        COALESCE(p_phone, ''),
        now_timestamp,
        now_timestamp,
        false
      );
      
      RETURN TRUE;
    EXCEPTION
      WHEN unique_violation THEN
        -- If there's a unique violation, try to update the existing record
        UPDATE public.users
        SET 
          auth_id = user_id::uuid,
          name = COALESCE(p_name, name),
          email = COALESCE(p_email, email),
          phone = COALESCE(p_phone, phone),
          date_modified = now_timestamp
        WHERE id = user_id OR email = p_email;
        
        RETURN TRUE;
      WHEN others THEN
        -- Log errors but don't fail
        RAISE WARNING 'Error in check_and_fix_user_profile: %', SQLERRM;
        RETURN FALSE;
    END;
  END IF;
  
  RETURN FALSE;
EXCEPTION
  WHEN others THEN
    -- Log errors but don't fail
    RAISE WARNING 'Error in check_and_fix_user_profile: %', SQLERRM;
    RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_fix_user_profile_simple(p_auth_id text, p_email text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  user_exists boolean;
  user_id text;
  now_timestamp timestamp with time zone := now();
BEGIN
  -- Convert auth_id to text
  user_id := p_auth_id;
  
  -- Check if user exists in public.users by auth_id
  BEGIN
    SELECT EXISTS(
      SELECT 1 FROM public.users WHERE auth_id = user_id::uuid
    ) INTO user_exists;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Invalid UUID format for auth_id: %', user_id;
      RETURN false;
  END;
  
  -- If user exists, we're done
  IF user_exists THEN
    RETURN true;
  END IF;
  
  -- Create new user
  BEGIN
    INSERT INTO public.users (
      id,
      auth_id,
      name,
      email,
      phone,
      date_created,
      date_modified,
      is_admin,
      team_ids,
      user_sports_skills
    ) VALUES (
      user_id,
      user_id::uuid,
      COALESCE(p_name, ''),
      COALESCE(p_email, ''),
      COALESCE(p_phone, ''),
      now_timestamp::text,
      now_timestamp::text,
      false,
      '{}'::bigint[],
      '[]'::jsonb
    );
    
    RETURN true;
  EXCEPTION
    WHEN unique_violation THEN
      -- If there's a unique violation, the user already exists somehow
      RETURN true;
    WHEN others THEN
      RAISE NOTICE 'Error creating user profile: %', SQLERRM;
      RETURN false;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_fix_user_profile_v2(p_auth_id text, p_email text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  user_exists BOOLEAN;
  user_id TEXT;
  now_timestamp TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Convert auth_id to text if it's a UUID
  user_id := p_auth_id;
  
  -- Check if user exists in public.users
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE auth_id = user_id::uuid
  ) INTO user_exists;
  
  -- If user doesn't exist, create it
  IF NOT user_exists THEN
    -- Insert a new record into public.users
    BEGIN
      INSERT INTO public.users (
        id,
        auth_id,
        name,
        email,
        phone,
        date_created,
        date_modified,
        is_admin
      ) VALUES (
        user_id,
        user_id::uuid,
        COALESCE(p_name, ''),
        COALESCE(p_email, ''),
        COALESCE(p_phone, ''),
        now_timestamp,
        now_timestamp,
        false
      );
      
      RETURN TRUE;
    EXCEPTION
      WHEN unique_violation THEN
        -- If there's a unique violation, try to update the existing record
        UPDATE public.users
        SET 
          auth_id = user_id::uuid,
          name = COALESCE(p_name, name),
          email = COALESCE(p_email, email),
          phone = COALESCE(p_phone, phone),
          date_modified = now_timestamp
        WHERE id = user_id OR email = p_email;
        
        RETURN TRUE;
      WHEN others THEN
        -- Log errors but don't fail
        RAISE WARNING 'Error in check_and_fix_user_profile_v2: %', SQLERRM;
        RETURN FALSE;
    END;
  END IF;
  
  RETURN FALSE;
EXCEPTION
  WHEN others THEN
    -- Log errors but don't fail
    RAISE WARNING 'Error in check_and_fix_user_profile_v2: %', SQLERRM;
    RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_fix_user_profile_v2(p_auth_id uuid, p_email text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  existing_user RECORD;
  new_user_id TEXT;
BEGIN
  -- Check if user already exists
  SELECT * INTO existing_user
  FROM users
  WHERE auth_id = p_auth_id;
  
  -- If user doesn't exist, create them
  IF NOT FOUND THEN
    -- Generate a new user ID (using timestamp + random for uniqueness)
    new_user_id := EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
    
    INSERT INTO users (
      id,
      auth_id,
      email,
      name,
      phone,
      date_created,
      date_modified,
      is_admin,
      team_ids,
      user_sports_skills
    ) VALUES (
      new_user_id,
      p_auth_id,
      COALESCE(p_email, ''),
      COALESCE(p_name, ''),
      COALESCE(p_phone, ''),
      NOW()::TEXT,
      NOW()::TEXT,
      FALSE,
      '{}',
      '[]'::JSONB
    );
    
    RETURN TRUE;
  ELSE
    -- User exists, update if needed
    UPDATE users
    SET 
      email = COALESCE(NULLIF(p_email, ''), email),
      name = COALESCE(NULLIF(p_name, ''), name),
      phone = COALESCE(NULLIF(p_phone, ''), phone),
      date_modified = NOW()::TEXT
    WHERE auth_id = p_auth_id
    AND (
      (p_email IS NOT NULL AND p_email != '' AND email != p_email) OR
      (p_name IS NOT NULL AND p_name != '' AND name != p_name) OR
      (p_phone IS NOT NULL AND p_phone != '' AND phone != p_phone)
    );
    
    RETURN TRUE;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_fix_user_profile_v4(p_auth_id text, p_email text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_exists BOOLEAN;
  user_id TEXT;
  now_timestamp TIMESTAMP WITH TIME ZONE := now();
  v_result BOOLEAN := FALSE;
  rows_affected INTEGER;
  auth_uuid UUID;
  clean_phone TEXT;
BEGIN
  -- Convert auth_id to UUID
  BEGIN
    auth_uuid := p_auth_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Invalid auth_id format: %', p_auth_id;
    RETURN FALSE;
  END;
  
  -- Clean phone number - use NULL instead of empty string to avoid unique constraint issues
  clean_phone := CASE 
    WHEN p_phone IS NULL OR p_phone = '' THEN NULL 
    ELSE p_phone 
  END;
  
  -- Log the function call for debugging
  RAISE NOTICE 'check_and_fix_user_profile_v4 called for auth_id: %, email: %', p_auth_id, p_email;
  
  -- Check if user exists in public.users by auth_id
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE auth_id = auth_uuid
  ) INTO user_exists;
  
  IF user_exists THEN
    RAISE NOTICE 'User already exists with auth_id: %', p_auth_id;
    
    -- Update the existing user with any new information
    -- Only update fields if the provided value is not NULL and not empty
    UPDATE public.users
    SET 
      name = CASE 
        WHEN p_name IS NOT NULL AND p_name != '' AND (name IS NULL OR name = '') 
        THEN p_name 
        ELSE name 
      END,
      email = CASE 
        WHEN p_email IS NOT NULL AND p_email != '' AND (email IS NULL OR email = '') 
        THEN p_email 
        ELSE email 
      END,
      phone = CASE 
        WHEN clean_phone IS NOT NULL AND (phone IS NULL OR phone = '') 
        THEN clean_phone 
        ELSE phone 
      END,
      date_modified = now_timestamp::TEXT
    WHERE auth_id = auth_uuid;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RAISE NOTICE 'Updated existing user, rows affected: %', rows_affected;
    
    RETURN TRUE;
  END IF;
  
  -- Check if user exists by email (for linking existing accounts)
  IF p_email IS NOT NULL AND p_email != '' THEN
    DECLARE
      existing_user_id TEXT;
    BEGIN
      SELECT id INTO existing_user_id FROM public.users 
      WHERE email = p_email AND email != ''
      LIMIT 1;
      
      IF existing_user_id IS NOT NULL THEN
        -- Update existing user with auth_id
        RAISE NOTICE 'Found existing user by email, updating auth_id. Email: %, ID: %', p_email, existing_user_id;
        
        UPDATE public.users
        SET 
          auth_id = auth_uuid,
          name = CASE 
            WHEN p_name IS NOT NULL AND p_name != '' AND (name IS NULL OR name = '') 
            THEN p_name 
            ELSE name 
          END,
          phone = CASE 
            WHEN clean_phone IS NOT NULL AND (phone IS NULL OR phone = '') 
            THEN clean_phone 
            ELSE phone 
          END,
          date_modified = now_timestamp::TEXT
        WHERE id = existing_user_id;
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        RAISE NOTICE 'Updated existing user by email, rows affected: %', rows_affected;
        
        RETURN TRUE;
      END IF;
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Error checking for existing user by email: %', SQLERRM;
    END;
  END IF;
  
  -- Create new user if no existing user found
  BEGIN
    -- Generate a unique user ID (timestamp + random for uniqueness)
    user_id := EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
    
    RAISE NOTICE 'Creating new user profile. Auth ID: %, Email: %, Name: %, Generated ID: %', p_auth_id, p_email, p_name, user_id;
    
    INSERT INTO public.users (
      id,
      auth_id,
      name,
      email,
      phone,
      date_created,
      date_modified,
      is_admin,
      team_ids,
      user_sports_skills
    ) VALUES (
      user_id,  -- Use generated unique ID instead of auth_id
      auth_uuid,
      COALESCE(p_name, ''),
      COALESCE(p_email, ''),
      clean_phone,  -- Use cleaned phone (NULL instead of empty string)
      now_timestamp::TEXT,
      now_timestamp::TEXT,
      false,
      '{}'::bigint[],
      '[]'::jsonb
    );
    
    v_result := TRUE;
    RAISE NOTICE 'Successfully created new user profile for % with ID %', p_email, user_id;
  EXCEPTION
    WHEN unique_violation THEN
      -- If there's a unique violation, try to update the existing record
      RAISE NOTICE 'Unique violation when creating user, attempting to update. Auth ID: %', p_auth_id;
      
      BEGIN
        -- Try to update by auth_id
        UPDATE public.users
        SET 
          name = CASE 
            WHEN p_name IS NOT NULL AND p_name != '' 
            THEN p_name 
            ELSE name 
          END,
          email = CASE 
            WHEN p_email IS NOT NULL AND p_email != '' 
            THEN p_email 
            ELSE email 
          END,
          phone = CASE 
            WHEN clean_phone IS NOT NULL 
            THEN clean_phone 
            ELSE phone 
          END,
          date_modified = now_timestamp::TEXT
        WHERE auth_id = auth_uuid;
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        
        -- If no rows affected, try by email
        IF rows_affected = 0 AND p_email IS NOT NULL AND p_email != '' THEN
          UPDATE public.users
          SET 
            auth_id = auth_uuid,
            name = CASE 
              WHEN p_name IS NOT NULL AND p_name != '' 
              THEN p_name 
              ELSE name 
            END,
            phone = CASE 
              WHEN clean_phone IS NOT NULL 
              THEN clean_phone 
              ELSE phone 
            END,
            date_modified = now_timestamp::TEXT
          WHERE email = p_email AND email != '';
          
          GET DIAGNOSTICS rows_affected = ROW_COUNT;
        END IF;
        
        v_result := rows_affected > 0;
        RAISE NOTICE 'Update result: %, rows affected: %', v_result, rows_affected;
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Error updating existing user: %', SQLERRM;
          v_result := FALSE;
      END;
    WHEN others THEN
      -- Log errors but don't fail
      RAISE NOTICE 'Error creating user profile: %', SQLERRM;
      v_result := FALSE;
  END;
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_table_exists(p_table_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = p_table_name
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_or_update_user_profile(p_id text, p_auth_id uuid, p_name text, p_email text, p_phone text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  now_timestamp TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Check if user already exists by auth_id
  IF EXISTS (SELECT 1 FROM public.users WHERE auth_id = p_auth_id) THEN
    -- Update existing user
    UPDATE public.users
    SET 
      name = COALESCE(p_name, name),
      email = COALESCE(p_email, email),
      phone = COALESCE(p_phone, phone),
      date_modified = now_timestamp
    WHERE auth_id = p_auth_id;
    
    RAISE NOTICE 'Updated existing user profile for %', p_email;
  ELSE
    -- Also check by email as a fallback
    IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email AND email != '') THEN
      -- Update existing user with auth_id if found by email
      UPDATE public.users
      SET 
        auth_id = p_auth_id,
        name = COALESCE(p_name, name),
        phone = COALESCE(p_phone, phone),
        date_modified = now_timestamp
      WHERE email = p_email AND email != '';
      
      RAISE NOTICE 'Updated existing user by email with auth_id for %', p_email;
    ELSE
      -- Insert a new record into public.users
      INSERT INTO public.users (
        id,
        auth_id,
        name,
        email,
        phone,
        date_created,
        date_modified,
        is_admin
      ) VALUES (
        p_id,
        p_auth_id,
        p_name,
        p_email,
        p_phone,
        now_timestamp,
        now_timestamp,
        false
      );
      
      RAISE NOTICE 'Created new user profile for %', p_email;
    END IF;
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle unique constraint violations gracefully
    RAISE NOTICE 'User profile already exists (unique violation) for %', p_email;
  WHEN others THEN
    -- Log other errors but don't fail the transaction
    RAISE NOTICE 'Error creating/updating user profile: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.deactivate_spare(p_registration_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id TEXT;
BEGIN
    -- Get the user ID from auth
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Update the registration to inactive
    UPDATE spares 
    SET is_active = false, 
        updated_at = now()
    WHERE id = p_registration_id 
    AND user_id = v_user_id 
    AND is_active = true;

    -- Return true if a row was updated
    RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.debug_invite_access(user_email text)
 RETURNS TABLE(invite_id uuid, team_name text, league_name text, invite_email text, auth_email text, jwt_email text, emails_match boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id,
    ti.team_name,
    ti.league_name,
    ti.email,
    au.email,
    auth.jwt() ->> 'email',
    LOWER(ti.email) = LOWER(COALESCE(auth.jwt() ->> 'email', au.email))
  FROM team_invites ti
  LEFT JOIN auth.users au ON au.id = auth.uid()
  WHERE LOWER(ti.email) = LOWER(user_email)
    AND ti.status = 'pending'
    AND ti.expires_at > NOW();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_user_completely(p_user_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_auth_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT is_admin INTO v_is_admin FROM users WHERE auth_id = auth.uid();
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission denied: Only admins can delete users';
    RETURN FALSE;
  END IF;
  
  -- Get the auth_id for the user
  SELECT auth_id INTO v_auth_id FROM users WHERE id = p_user_id;
  
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'User not found or auth_id is null';
    RETURN FALSE;
  END IF;
  
  -- Remove user from all team rosters
  UPDATE teams 
  SET roster = array_remove(roster, p_user_id)
  WHERE p_user_id = ANY(roster);
  
  -- Delete from public.users first (this will cascade to related tables)
  DELETE FROM users WHERE id = p_user_id;
  
  -- Delete from auth.users
  -- This requires superuser privileges, so it's done via a trigger or external process
  -- For now, we'll mark this as a step that needs to be handled by the application
  
  RETURN TRUE;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in delete_user_completely: %', SQLERRM;
    RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  now_timestamp TIMESTAMP WITH TIME ZONE := now();
  user_name TEXT;
  user_phone TEXT;
  user_email TEXT;
  provider TEXT;
  result BOOLEAN;
BEGIN
  -- Get the authentication provider
  provider := COALESCE(NEW.app_metadata->>'provider', 'email');
  
  -- Log the provider and metadata for debugging
  RAISE NOTICE 'Auth provider: %, User ID: %, Email: %', 
    provider, NEW.id, NEW.email;
  
  -- Extract user information from metadata based on provider
  IF provider = 'google' THEN
    -- Google-specific metadata extraction
    user_name := COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->'name',
      NEW.email,
      ''
    );
    
    -- Google doesn't typically provide phone
    user_phone := '';
  ELSE
    -- Email sign-up metadata extraction
    user_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    );
    
    user_phone := COALESCE(
      NEW.raw_user_meta_data->>'phone',
      ''
    );
  END IF;
  
  -- Email should be consistent across providers
  user_email := COALESCE(NEW.email, '');
  
  -- Use the enhanced v3 function to create or update the user profile
  SELECT check_and_fix_user_profile_v3(
    NEW.id::text,
    user_email,
    user_name,
    user_phone
  ) INTO result;
  
  IF result THEN
    RAISE NOTICE 'Successfully created or updated user profile for %', user_email;
  ELSE
    RAISE NOTICE 'Failed to create or update user profile for %', user_email;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log errors but don't fail the transaction
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_accepted_invites_for_user(user_email text, user_id text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  invite_record RECORD;
BEGIN
  -- Find all accepted invites for this user
  FOR invite_record IN 
    SELECT team_id, id 
    FROM team_invites 
    WHERE email = LOWER(user_email) 
    AND status = 'accepted'
  LOOP
    -- Add user to team roster if not already there
    UPDATE teams 
    SET roster = array_append(roster, user_id)
    WHERE id = invite_record.team_id 
    AND NOT (user_id = ANY(roster));
    
    -- Add team to user's team_ids if not already there
    UPDATE users
    SET team_ids = array_append(team_ids, invite_record.team_id)
    WHERE id = user_id
    AND NOT (invite_record.team_id = ANY(team_ids));
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_pending_invites_for_user(user_email text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  processed_count int := 0;
  user_record RECORD;
  pending_invite RECORD;
  current_roster text[];
  result_teams text[] := ARRAY[]::text[];
BEGIN
  -- Find the user by email
  SELECT * INTO user_record 
  FROM users 
  WHERE LOWER(email) = LOWER(user_email)
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Process all pending invites
  FOR pending_invite IN 
    SELECT ti.*, t.roster, t.active, t.name as team_name
    FROM team_invites ti
    JOIN teams t ON t.id = ti.team_id
    WHERE LOWER(ti.email) = LOWER(user_email)
      AND ti.status = 'pending'
      AND ti.expires_at > NOW()
      AND t.active = true
  LOOP
    -- Get current roster
    current_roster := COALESCE(pending_invite.roster, ARRAY[]::text[]);
    
    -- Check if user is already in the roster
    IF NOT (user_record.id = ANY(current_roster)) THEN
      -- Add user to team roster
      UPDATE teams 
      SET roster = array_append(current_roster, user_record.id)
      WHERE id = pending_invite.team_id;
      
      -- Mark invite as accepted
      UPDATE team_invites
      SET status = 'accepted',
          accepted_at = NOW(),
          updated_at = NOW()
      WHERE id = pending_invite.id;
      
      processed_count := processed_count + 1;
      result_teams := array_append(result_teams, pending_invite.team_name);
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'processed_count', processed_count,
    'teams', result_teams
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_user_team_invites(p_user_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_email text;
  v_processed_count int := 0;
  v_invite record;
  v_current_roster text[];
  v_result_teams text[] := ARRAY[]::text[];
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM users
  WHERE id = p_user_id;
  
  IF v_user_email IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Process each pending invite
  FOR v_invite IN 
    SELECT ti.*, t.roster, t.active, t.name as team_name
    FROM team_invites ti
    JOIN teams t ON t.id = ti.team_id
    WHERE LOWER(ti.email) = LOWER(v_user_email)
      AND ti.status = 'pending'
      AND ti.expires_at > NOW()
      AND t.active = true
  LOOP
    -- Get current roster
    v_current_roster := COALESCE(v_invite.roster, ARRAY[]::text[]);
    
    -- Check if user is already in the roster
    IF NOT (p_user_id = ANY(v_current_roster)) THEN
      -- Add user to team roster
      UPDATE teams 
      SET roster = array_append(v_current_roster, p_user_id)
      WHERE id = v_invite.team_id;
      
      -- Mark invite as accepted
      UPDATE team_invites
      SET status = 'accepted',
          accepted_at = NOW(),
          updated_at = NOW()
      WHERE id = v_invite.id;
      
      v_processed_count := v_processed_count + 1;
      v_result_teams := array_append(v_result_teams, v_invite.team_name);
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'teams', v_result_teams
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.register_spare(p_sport_id bigint, p_skill_level text, p_availability_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_spare_id UUID;
    v_sport_exists BOOLEAN;
    v_user_id TEXT;
BEGIN
    -- Get the user ID from auth
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Validate sport exists and is active
    SELECT EXISTS(SELECT 1 FROM sports WHERE id = p_sport_id AND active = true) INTO v_sport_exists;
    
    IF NOT v_sport_exists THEN
        RAISE EXCEPTION 'Sport does not exist or is not active';
    END IF;

    -- Validate skill level
    IF p_skill_level NOT IN ('beginner', 'intermediate', 'advanced') THEN
        RAISE EXCEPTION 'Invalid skill level. Must be beginner, intermediate, or advanced';
    END IF;

    -- Check if user already has an active registration for this sport
    IF EXISTS(
        SELECT 1 FROM spares 
        WHERE user_id = v_user_id 
        AND sport_id = p_sport_id 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'User already registered as spare for this sport';
    END IF;

    -- Insert new spare registration
    INSERT INTO spares (
        user_id, 
        sport_id, 
        skill_level, 
        availability_notes,
        is_active
    ) VALUES (
        v_user_id, 
        p_sport_id, 
        p_skill_level, 
        p_availability_notes,
        true
    )
    RETURNING id INTO v_spare_id;

    RETURN v_spare_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.register_spare(p_sport_id bigint, p_skill_level text, p_availability_notes text DEFAULT NULL::text, p_share_phone boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_spare_id UUID;
    v_sport_exists BOOLEAN;
    v_user_id TEXT;
BEGIN
    -- Get the user ID from auth
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Validate sport exists and is active
    SELECT EXISTS(SELECT 1 FROM sports WHERE id = p_sport_id AND active = true) INTO v_sport_exists;
    
    IF NOT v_sport_exists THEN
        RAISE EXCEPTION 'Sport does not exist or is not active';
    END IF;

    -- Validate skill level (allow all 5 levels)
    IF p_skill_level NOT IN ('beginner', 'intermediate', 'advanced', 'competitive', 'elite') THEN
        RAISE EXCEPTION 'Invalid skill level. Must be beginner, intermediate, advanced, competitive, or elite';
    END IF;

    -- Check if user already has an active registration for this sport
    IF EXISTS(
        SELECT 1 FROM spares 
        WHERE user_id = v_user_id 
        AND sport_id = p_sport_id 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'User already registered as spare for this sport';
    END IF;

    -- Insert new spare registration with phone sharing preference
    INSERT INTO spares (
        user_id, 
        sport_id, 
        skill_level, 
        availability_notes,
        share_phone,
        is_active
    ) VALUES (
        v_user_id, 
        p_sport_id, 
        p_skill_level, 
        p_availability_notes,
        p_share_phone,
        true
    )
    RETURNING id INTO v_spare_id;

    RETURN v_spare_id;
END;
$function$
;

create or replace view "public"."stripe_user_orders" as  SELECT c.customer_id,
    o.id AS order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status AS order_status,
    o.created_at AS order_date
   FROM (stripe_customers c
     LEFT JOIN stripe_orders o ON ((c.customer_id = o.customer_id)))
  WHERE ((c.user_id = auth.uid()) AND (c.deleted_at IS NULL) AND (o.deleted_at IS NULL));


create or replace view "public"."stripe_user_subscriptions" as  SELECT c.customer_id,
    s.subscription_id,
    s.status AS subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
   FROM (stripe_customers c
     LEFT JOIN stripe_subscriptions s ON ((c.customer_id = s.customer_id)))
  WHERE ((c.user_id = auth.uid()) AND (c.deleted_at IS NULL) AND (s.deleted_at IS NULL));


CREATE OR REPLACE FUNCTION public.update_match_totals()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Recalculate match totals from all sets
    UPDATE matches SET
        team_a_total_points = COALESCE((
            SELECT SUM(team_a_score) FROM match_sets WHERE match_id = NEW.match_id
        ), 0),
        team_b_total_points = COALESCE((
            SELECT SUM(team_b_score) FROM match_sets WHERE match_id = NEW.match_id
        ), 0),
        team_c_total_points = COALESCE((
            SELECT SUM(team_c_score) FROM match_sets WHERE match_id = NEW.match_id
        ), 0),
        team_a_sets_won = COALESCE((
            SELECT COUNT(*) FROM match_sets 
            WHERE match_id = NEW.match_id 
            AND team_a_score > team_b_score 
            AND team_a_score > COALESCE(team_c_score, 0)
        ), 0),
        team_b_sets_won = COALESCE((
            SELECT COUNT(*) FROM match_sets 
            WHERE match_id = NEW.match_id 
            AND team_b_score > team_a_score 
            AND team_b_score > COALESCE(team_c_score, 0)
        ), 0),
        team_c_sets_won = COALESCE((
            SELECT COUNT(*) FROM match_sets 
            WHERE match_id = NEW.match_id 
            AND team_c_score > team_a_score 
            AND team_c_score > COALESCE(team_b_score, 0)
        ), 0),
        updated_at = now()
    WHERE id = NEW.match_id;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_spares_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.add_tier_optimized(p_league_id integer, p_current_week integer, p_after_tier integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_max_week INTEGER;
  v_new_tier INTEGER;
BEGIN
  SELECT COALESCE(MAX(week_number), p_current_week)
  INTO v_max_week
  FROM weekly_schedules
  WHERE league_id = p_league_id;

  v_new_tier := p_after_tier + 1;

  UPDATE weekly_schedules
  SET tier_number = tier_number + 1000
  WHERE league_id = p_league_id
    AND week_number >= p_current_week
    AND tier_number > p_after_tier;

  INSERT INTO weekly_schedules (
    league_id, week_number, tier_number, location, time_slot, court,
    team_a_name, team_b_name, team_c_name, team_a_ranking, team_b_ranking, team_c_ranking,
    is_completed, no_games, format
  )
  SELECT
    p_league_id,
    generate_series(p_current_week, v_max_week) AS week_number,
    v_new_tier,
    'SET_LOCATION',
    'SET_TIME',
    'SET_COURT',
    NULL, NULL, NULL, NULL, NULL, NULL,
    FALSE, FALSE, '3-teams-6-sets';

  UPDATE weekly_schedules
  SET tier_number = tier_number - 1000 + 1
  WHERE league_id = p_league_id
    AND week_number >= p_current_week
    AND tier_number > 1000;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_week_bump_auto(p_league_id integer, p_from_week integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_to_week INTEGER;
BEGIN
  v_to_week := get_next_playable_week(p_league_id, p_from_week + 1);
  PERFORM apply_week_bump(p_league_id, p_from_week, v_to_week);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_week_rewind_auto(p_league_id integer, p_to_week integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_from_week INTEGER;
BEGIN
  v_from_week := get_first_future_week_with_rows(p_league_id, p_to_week);
  PERFORM apply_week_bump(p_league_id, v_from_week, p_to_week);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_set_waitlist_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.team_id IS NULL THEN
        IF is_individual_league_full(NEW.league_id) THEN
            NEW.is_waitlisted := true;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_user_outstanding_balance(p_user_id text)
 RETURNS numeric
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT COALESCE(SUM(amount_due - amount_paid), 0.00)
  FROM league_payments
  WHERE user_id = p_user_id
  AND status IN ('pending', 'partial', 'overdue');
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_volleyball_spares()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.teams t ON t.captain_id = u.id OR u.id = ANY(COALESCE(t.co_captains, ARRAY[]::text[]))
    JOIN public.leagues l ON l.id = t.league_id
    WHERE u.auth_id = auth.uid()
      AND l.sport_id = 1  -- Volleyball
      AND t.active = true
      AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_fix_user_profile_v3(p_auth_id text, p_email text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_exists BOOLEAN;
  user_id TEXT;
  now_timestamp TIMESTAMPTZ := now();
  v_result BOOLEAN := FALSE;
BEGIN
  user_id := p_auth_id;

  SELECT EXISTS(
    SELECT 1
    FROM public.users
    WHERE auth_id = user_id::uuid
  )
  INTO user_exists;

  IF user_exists THEN
    RETURN FALSE;
  END IF;

  IF p_email IS NOT NULL AND p_email != '' THEN
    DECLARE
      existing_user_id TEXT;
    BEGIN
      SELECT id
      INTO existing_user_id
      FROM public.users
      WHERE email = p_email
        AND email != ''
        AND auth_id IS NULL
      LIMIT 1;

      IF existing_user_id IS NOT NULL THEN
        UPDATE public.users
        SET
          auth_id = user_id::uuid,
          name = COALESCE(NULLIF(p_name, ''), name),
          phone = COALESCE(NULLIF(p_phone, ''), phone),
          date_modified = now_timestamp
        WHERE id = existing_user_id;

        RETURN TRUE;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error checking for existing user by email: %', SQLERRM;
    END;
  END IF;

  BEGIN
    INSERT INTO public.users (
      id,
      auth_id,
      name,
      email,
      phone,
      date_created,
      date_modified,
      is_admin
    ) VALUES (
      user_id,
      user_id::uuid,
      COALESCE(p_name, ''),
      COALESCE(p_email, ''),
      COALESCE(p_phone, ''),
      now_timestamp,
      now_timestamp,
      FALSE
    );

    v_result := TRUE;
  EXCEPTION
    WHEN unique_violation THEN
      BEGIN
        UPDATE public.users
        SET
          auth_id = user_id::uuid,
          name = COALESCE(NULLIF(p_name, ''), name),
          email = COALESCE(NULLIF(p_email, ''), email),
          phone = COALESCE(NULLIF(p_phone, ''), phone),
          date_modified = now_timestamp
        WHERE id = user_id
           OR (email = p_email AND email != '');

        v_result := TRUE;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Error updating existing user: %', SQLERRM;
          v_result := FALSE;
      END;
    WHEN OTHERS THEN
      RAISE NOTICE 'Error creating user profile: %', SQLERRM;
      v_result := FALSE;
  END;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_invalid_schedule_entries()
 RETURNS TABLE(cleaned_entries integer, issues_found text[])
 LANGUAGE plpgsql
AS $function$
DECLARE
  cleanup_count INTEGER := 0;
  found_issues TEXT[] := ARRAY[]::TEXT[];
BEGIN
  WITH invalid_teams AS (
    SELECT id, 'Inconsistent team/ranking data' AS issue
    FROM weekly_schedules
    WHERE (
      (team_a_name IS NULL) != (team_a_ranking IS NULL) OR
      (team_b_name IS NULL) != (team_b_ranking IS NULL) OR
      (team_c_name IS NULL) != (team_c_ranking IS NULL) OR
      (team_d_name IS NULL) != (team_d_ranking IS NULL) OR
      (team_e_name IS NULL) != (team_e_ranking IS NULL) OR
      (team_f_name IS NULL) != (team_f_ranking IS NULL)
    )
  )
  SELECT array_agg(issue) INTO found_issues FROM invalid_teams;

  RETURN QUERY SELECT cleanup_count, COALESCE(found_issues, ARRAY[]::TEXT[]);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_contact_submissions()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM contact_submissions 
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_schedule_after_team_transfer(p_league_id bigint, p_team_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Clear the team from any weekly schedule entries in the source league
  UPDATE weekly_schedules
  SET
    team_a_name = CASE WHEN LOWER(team_a_name) = LOWER(p_team_name) THEN NULL ELSE team_a_name END,
    team_a_ranking = CASE WHEN LOWER(team_a_name) = LOWER(p_team_name) THEN NULL ELSE team_a_ranking END,
    team_b_name = CASE WHEN LOWER(team_b_name) = LOWER(p_team_name) THEN NULL ELSE team_b_name END,
    team_b_ranking = CASE WHEN LOWER(team_b_name) = LOWER(p_team_name) THEN NULL ELSE team_b_ranking END,
    team_c_name = CASE WHEN LOWER(team_c_name) = LOWER(p_team_name) THEN NULL ELSE team_c_name END,
    team_c_ranking = CASE WHEN LOWER(team_c_name) = LOWER(p_team_name) THEN NULL ELSE team_c_ranking END,
    team_d_name = CASE WHEN LOWER(team_d_name) = LOWER(p_team_name) THEN NULL ELSE team_d_name END,
    team_d_ranking = CASE WHEN LOWER(team_d_name) = LOWER(p_team_name) THEN NULL ELSE team_d_ranking END,
    team_e_name = CASE WHEN LOWER(team_e_name) = LOWER(p_team_name) THEN NULL ELSE team_e_name END,
    team_e_ranking = CASE WHEN LOWER(team_e_name) = LOWER(p_team_name) THEN NULL ELSE team_e_ranking END,
    team_f_name = CASE WHEN LOWER(team_f_name) = LOWER(p_team_name) THEN NULL ELSE team_f_name END,
    team_f_ranking = CASE WHEN LOWER(team_f_name) = LOWER(p_team_name) THEN NULL ELSE team_f_ranking END
  WHERE league_id = p_league_id
    AND (
      LOWER(team_a_name) = LOWER(p_team_name) OR
      LOWER(team_b_name) = LOWER(p_team_name) OR
      LOWER(team_c_name) = LOWER(p_team_name) OR
      LOWER(team_d_name) = LOWER(p_team_name) OR
      LOWER(team_e_name) = LOWER(p_team_name) OR
      LOWER(team_f_name) = LOWER(p_team_name)
    );

  -- Remove any cached results for the team in the source league
  DELETE FROM game_results
  WHERE league_id = p_league_id
    AND LOWER(team_name) = LOWER(p_team_name);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_league_payment_for_team()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- When a new team is created, create a league payment record for the captain
  IF TG_OP = 'INSERT' AND NEW.captain_id IS NOT NULL AND NEW.league_id IS NOT NULL THEN
    INSERT INTO league_payments (
      user_id,
      team_id,
      league_id,
      amount_due,
      due_date,
      status
    )
    SELECT 
      NEW.captain_id,
      NEW.id,
      NEW.league_id,
      effective_league_cost(l),
      COALESCE(l.payment_due_date, (CURRENT_DATE + INTERVAL '30 days')::date),
      'pending'
    FROM leagues l
    WHERE l.id = NEW.league_id
      AND COALESCE(effective_league_cost(l), 0.00) > 0; -- Only create if there's a cost
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.effective_league_cost(l leagues)
 RETURNS numeric
 LANGUAGE sql
AS $function$
  SELECT COALESCE(
    CASE 
      WHEN l.early_bird_due_date IS NOT NULL 
           AND l.early_bird_cost IS NOT NULL 
           AND CURRENT_DATE <= l.early_bird_due_date 
        THEN l.early_bird_cost
      ELSE l.cost
    END,
    0.00
  )::numeric(10,2);
$function$
;

CREATE OR REPLACE FUNCTION public.get_all_users_admin()
 RETURNS TABLE(profile_id uuid, auth_id uuid, name text, email text, phone text, is_admin boolean, is_facilitator boolean, date_created timestamp with time zone, date_modified timestamp with time zone, auth_created_at timestamp with time zone, team_ids text[], league_ids bigint[], user_sports_skills jsonb, status text, confirmed_at timestamp with time zone, last_sign_in_at timestamp with time zone, preferred_position text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can access this function';
  END IF;

  RETURN QUERY
  WITH auth_users AS (
    SELECT 
      au.id as auth_id,
      au.email,
      au.email_confirmed_at,
      au.created_at as auth_created_at,
      au.last_sign_in_at
    FROM auth.users au
  ),
  user_profiles AS (
    SELECT 
      u.id as profile_id,
      u.auth_id,
      u.name,
      u.email,
      u.phone,
      u.is_admin,
      u.is_facilitator,
      u.date_created,
      u.date_modified,
      u.team_ids,
      u.league_ids,
      u.user_sports_skills,
      u.preferred_position,
      u.profile_completed
    FROM users u
  )
  SELECT 
    up.profile_id,
    au.auth_id,
    up.name,
    COALESCE(up.email, au.email) as email,
    up.phone,
    up.is_admin,
    up.is_facilitator,
    COALESCE(up.date_created, au.auth_created_at) as date_created,
    up.date_modified,
    au.auth_created_at,
    up.team_ids,
    up.league_ids,
    up.user_sports_skills,
    CASE 
      WHEN up.profile_id IS NULL AND au.email_confirmed_at IS NULL THEN 'unconfirmed'
      WHEN up.profile_id IS NULL AND au.email_confirmed_at IS NOT NULL THEN 'confirmed_no_profile'
      WHEN up.profile_completed = false THEN 'profile_incomplete'
      ELSE 'active'
    END as status,
    au.email_confirmed_at as confirmed_at,
    au.last_sign_in_at,
    up.preferred_position
  FROM auth_users au
  LEFT JOIN user_profiles up ON au.auth_id = up.auth_id
  ORDER BY date_created DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_user_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_id TEXT;
BEGIN
  SELECT id INTO user_id
  FROM users
  WHERE auth_id = auth.uid();
  
  RETURN user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_first_future_week_with_rows(p_league_id integer, p_after_week integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_candidate INTEGER := p_after_week + 1;
  v_count INTEGER;
  i INTEGER := 0;
BEGIN
  LOOP
    i := i + 1;
    IF i > 104 THEN
      RETURN p_after_week + 1;
    END IF;

    SELECT COUNT(*)
    INTO v_count
    FROM weekly_schedules
    WHERE league_id = p_league_id
      AND week_number = v_candidate;

    IF v_count > 0 THEN
      RETURN v_candidate;
    END IF;

    v_candidate := v_candidate + 1;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_next_playable_week(p_league_id integer, p_start_week integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_candidate INTEGER := p_start_week;
  v_all_no_games BOOLEAN;
  v_count INTEGER;
  i INTEGER := 0;
BEGIN
  LOOP
    i := i + 1;
    IF i > 104 THEN
      RETURN v_candidate;
    END IF;

    SELECT COUNT(*), BOOL_AND(COALESCE(no_games, FALSE))
    INTO v_count, v_all_no_games
    FROM weekly_schedules
    WHERE league_id = p_league_id
      AND week_number = v_candidate;

    IF v_count = 0 THEN
      RETURN v_candidate;
    ELSIF v_all_no_games = FALSE THEN
      RETURN v_candidate;
    ELSE
      v_candidate := v_candidate + 1;
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_tier_team_history(p_league_id integer, p_tier_number integer)
 RETURNS TABLE(week_number integer, team_name text, team_ranking integer, "position" text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ws.week_number,
    team.name::TEXT,
    team.ranking::INTEGER,
    team."position"::TEXT
  FROM weekly_schedules ws
  CROSS JOIN LATERAL (
    VALUES
      (ws.team_a_name, ws.team_a_ranking, 'A'),
      (ws.team_b_name, ws.team_b_ranking, 'B'),
      (ws.team_c_name, ws.team_c_ranking, 'C'),
      (ws.team_d_name, ws.team_d_ranking, 'D'),
      (ws.team_e_name, ws.team_e_ranking, 'E'),
      (ws.team_f_name, ws.team_f_ranking, 'F')
  ) AS team(name, ranking, "position")
  WHERE ws.league_id = p_league_id
    AND ws.tier_number = p_tier_number
    AND team.name IS NOT NULL
  ORDER BY ws.week_number, team."position";
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_sports_skills(p_user_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id TEXT;
  v_sports_skills JSONB;
BEGIN
  -- If no user_id provided, use the current user
  IF p_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();
  ELSE
    v_user_id := p_user_id;
  END IF;
  
  -- Get the user's sports and skills preferences
  SELECT user_sports_skills INTO v_sports_skills
  FROM users
  WHERE id = v_user_id;
  
  RETURN COALESCE(v_sports_skills, '[]'::jsonb);
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error getting user sports and skills: %', SQLERRM;
    RETURN '[]'::jsonb;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_users_paginated_admin(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_search text DEFAULT ''::text, p_sort_field text DEFAULT 'date_created'::text, p_sort_direction text DEFAULT 'desc'::text, p_administrator boolean DEFAULT false, p_facilitator boolean DEFAULT false, p_active_player boolean DEFAULT false, p_pending_users boolean DEFAULT false, p_players_not_in_league boolean DEFAULT false, p_sports_in_league integer[] DEFAULT '{}'::integer[], p_sports_has_skill integer[] DEFAULT '{}'::integer[], p_league_ids bigint[] DEFAULT '{}'::bigint[], p_team_ids bigint[] DEFAULT '{}'::bigint[], p_league_tier_filters text[] DEFAULT '{}'::text[])
 RETURNS TABLE(profile_id text, auth_id uuid, name text, email text, phone text, is_admin boolean, is_facilitator boolean, date_created timestamp with time zone, date_modified timestamp with time zone, team_ids text[], league_ids bigint[], user_sports_skills jsonb, status text, confirmed_at timestamp with time zone, last_sign_in_at timestamp with time zone, auth_created_at timestamp with time zone, total_count bigint, total_owed numeric, total_paid numeric, current_registrations jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_search_term TEXT := LOWER('%' || p_search || '%');
    v_sort_sql TEXT;
    v_where_conditions TEXT[] := ARRAY[]::TEXT[];
    v_final_query TEXT;
    v_tier_conditions TEXT;
    v_filter TEXT;
    v_league_filter BIGINT;
    v_tier_filter INT;
    v_tier_clause TEXT;
    v_first BOOLEAN;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can access this function';
    END IF;

    IF p_search <> '' THEN
        v_where_conditions := array_append(v_where_conditions,
            '(LOWER(cd.name) LIKE ' || quote_literal(v_search_term) || ' OR LOWER(cd.email) LIKE ' || quote_literal(v_search_term) || ')');
    END IF;
    IF p_administrator THEN v_where_conditions := array_append(v_where_conditions, 'cd.is_admin = true'); END IF;
    IF p_facilitator THEN v_where_conditions := array_append(v_where_conditions, 'cd.is_facilitator = true'); END IF;
    IF p_pending_users THEN v_where_conditions := array_append(v_where_conditions, 'cd.status IN (''unconfirmed'', ''confirmed_no_profile'', ''profile_incomplete'')'); END IF;
    IF p_active_player THEN v_where_conditions := array_append(v_where_conditions, 'cd.status = ''active'''); END IF;
    IF p_players_not_in_league THEN v_where_conditions := array_append(v_where_conditions, 'NOT EXISTS (SELECT 1 FROM league_payments lp WHERE lp.user_id = cd.profile_id AND COALESCE(lp.is_waitlisted,false) = false)'); END IF;

    -- Sport filters
    IF array_length(p_sports_in_league, 1) IS NOT NULL AND array_length(p_sports_in_league, 1) > 0 THEN
        v_where_conditions := array_append(
            v_where_conditions,
            '(
             EXISTS (
               SELECT 1
               FROM teams t
               JOIN leagues l ON l.id = t.league_id
               WHERE (t.captain_id = cd.profile_id OR cd.profile_id = ANY(COALESCE(t.co_captains, ARRAY[]::text[])) OR cd.profile_id = ANY(COALESCE(t.roster, ARRAY[]::text[])))
                 AND t.active = true
                 AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
                 AND l.sport_id = ANY(ARRAY[' || array_to_string(p_sports_in_league, ',') || '])
             )
             OR EXISTS (
               SELECT 1
               FROM league_payments lp
               JOIN leagues l2 ON l2.id = lp.league_id
               WHERE lp.user_id = cd.profile_id
                 AND lp.team_id IS NULL
                 AND l2.sport_id = ANY(ARRAY[' || array_to_string(p_sports_in_league, ',') || '])
             )
           )'
        );
    END IF;

    IF array_length(p_sports_has_skill, 1) IS NOT NULL AND array_length(p_sports_has_skill, 1) > 0 THEN
        v_where_conditions := array_append(v_where_conditions,
            'EXISTS (
               SELECT 1
               FROM jsonb_array_elements(COALESCE(cd.user_sports_skills, ''[]''::jsonb)) AS e
               WHERE (e->>''sport_id'')::int = ANY(ARRAY[' || array_to_string(p_sports_has_skill, ',') || '])
            )'
        );
    END IF;

    -- League filters
    IF array_length(p_league_ids, 1) IS NOT NULL AND array_length(p_league_ids, 1) > 0 THEN
        v_where_conditions := array_append(v_where_conditions,
            '(
               EXISTS (
                 SELECT 1
                 FROM league_payments lp
                 WHERE lp.user_id = cd.profile_id
                   AND lp.league_id = ANY(ARRAY[' || array_to_string(p_league_ids, ',') || ']::bigint[])
               )
               OR EXISTS (
                 SELECT 1
                 FROM teams t
                 WHERE t.league_id = ANY(ARRAY[' || array_to_string(p_league_ids, ',') || ']::bigint[])
                   AND (t.captain_id = cd.profile_id OR cd.profile_id = ANY(COALESCE(t.co_captains, ARRAY[]::text[])) OR cd.profile_id = ANY(COALESCE(t.roster, ARRAY[]::text[])))
               )
            )'
        );
    END IF;

    -- Team filters
    IF array_length(p_team_ids, 1) IS NOT NULL AND array_length(p_team_ids, 1) > 0 THEN
        v_where_conditions := array_append(v_where_conditions,
            'EXISTS (
               SELECT 1
               FROM teams t
               WHERE t.id = ANY(ARRAY[' || array_to_string(p_team_ids, ',') || ']::bigint[])
                 AND (t.captain_id = cd.profile_id OR cd.profile_id = ANY(COALESCE(t.co_captains, ARRAY[]::text[])) OR cd.profile_id = ANY(COALESCE(t.roster, ARRAY[]::text[])))
            )'
        );
    END IF;

    -- Tier filters
    IF array_length(p_league_tier_filters, 1) IS NOT NULL AND array_length(p_league_tier_filters, 1) > 0 THEN
        v_tier_conditions := '';
        v_first := TRUE;
        FOREACH v_filter IN ARRAY p_league_tier_filters LOOP
            BEGIN
                v_league_filter := NULLIF(split_part(v_filter, ':', 1), '')::bigint;
                v_tier_filter := NULLIF(split_part(v_filter, ':', 2), '')::int;
            EXCEPTION WHEN OTHERS THEN
                v_league_filter := NULL;
                v_tier_filter := NULL;
            END;

            IF v_league_filter IS NULL OR v_tier_filter IS NULL THEN
                CONTINUE;
            END IF;

            v_tier_clause := 'EXISTS (
                SELECT 1
                FROM weekly_schedules ws
                JOIN LATERAL (
                    VALUES (ws.team_a_name), (ws.team_b_name), (ws.team_c_name),
                           (ws.team_d_name), (ws.team_e_name), (ws.team_f_name)
                ) AS wt(team_name) ON wt.team_name IS NOT NULL AND btrim(wt.team_name) <> ''''
                JOIN teams t ON LOWER(t.name) = LOWER(wt.team_name)
                WHERE ws.league_id = ' || v_league_filter || '
                  AND ws.tier_number = ' || v_tier_filter || '
                  AND t.league_id = ws.league_id
                  AND (
                    t.captain_id = cd.profile_id
                    OR cd.profile_id = ANY(COALESCE(t.co_captains, ARRAY[]::text[]))
                    OR cd.profile_id = ANY(COALESCE(t.roster, ARRAY[]::text[]))
                  )
            )';

            IF v_first THEN
                v_tier_conditions := v_tier_clause;
                v_first := FALSE;
            ELSE
                v_tier_conditions := v_tier_conditions || ' OR ' || v_tier_clause;
            END IF;
        END LOOP;

        IF v_first = FALSE THEN
            v_where_conditions := array_append(v_where_conditions, '(' || v_tier_conditions || ')');
        END IF;
    END IF;

    CASE p_sort_field
        WHEN 'name' THEN v_sort_sql := 'name';
        WHEN 'email' THEN v_sort_sql := 'email';
        WHEN 'date_created' THEN v_sort_sql := 'date_created';
        WHEN 'last_sign_in_at' THEN v_sort_sql := 'last_sign_in_at';
        WHEN 'status' THEN v_sort_sql := 'status';
        WHEN 'total_owed' THEN v_sort_sql := 'total_owed';
        WHEN 'total_paid' THEN v_sort_sql := 'total_paid';
        WHEN 'team_count' THEN v_sort_sql := 'reg_count';
        ELSE v_sort_sql := 'date_created';
    END CASE;
    IF UPPER(p_sort_direction) = 'ASC' THEN
        v_sort_sql := v_sort_sql || ' ASC NULLS LAST';
    ELSE
        v_sort_sql := v_sort_sql || ' DESC NULLS LAST';
    END IF;

    v_final_query := '
    WITH auth_users AS (
        SELECT au.id AS auth_user_id, au.email AS auth_email, au.email_confirmed_at, au.created_at AS auth_created_at, au.last_sign_in_at
        FROM auth.users au
    ),
    user_profiles AS (
        SELECT u.id AS profile_id, u.auth_id AS profile_auth_id, u.name, u.email AS profile_email, u.phone, u.is_admin, u.is_facilitator,
               u.date_created::timestamptz AS date_created, u.date_modified::timestamptz AS date_modified,
               u.team_ids::text[] AS team_ids, u.league_ids, u.user_sports_skills, u.profile_completed
        FROM users u
    ),
    combined_data AS (
        SELECT 
               COALESCE(up.profile_id::text, NULL) AS profile_id,
               COALESCE(up.profile_auth_id, au.auth_user_id) AS combined_auth_id,
               up.name,
               COALESCE(up.profile_email, au.auth_email) AS email,
               up.phone,
               up.is_admin,
               up.is_facilitator,
               COALESCE(up.date_created, au.auth_created_at) AS date_created,
               up.date_modified,
               au.auth_created_at,
               up.team_ids,
               up.league_ids,
               up.user_sports_skills,
               CASE 
                 WHEN up.profile_id IS NULL AND au.email_confirmed_at IS NULL THEN ''unconfirmed''
                 WHEN up.profile_id IS NULL AND au.email_confirmed_at IS NOT NULL THEN ''confirmed_no_profile''
                 WHEN up.profile_completed = false THEN ''profile_incomplete''
                 ELSE ''active''
               END AS status,
               au.email_confirmed_at AS confirmed_at,
               au.last_sign_in_at
        FROM user_profiles up
        FULL OUTER JOIN auth_users au ON au.auth_user_id = up.profile_auth_id
    ),
    payment_totals AS (
        SELECT lp.user_id,
               SUM(lp.amount_due) AS total_owed,
               SUM(lp.amount_paid) AS total_paid
        FROM league_payments lp
        GROUP BY lp.user_id
    ),
    team_memberships AS (
        SELECT t.captain_id AS user_id, t.id AS team_id, l.id AS league_id, l.name AS league_name, ''captain''::text AS role
        FROM teams t
        JOIN leagues l ON l.id = t.league_id
        WHERE t.active = true AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
        UNION ALL
        SELECT co_cap AS user_id, t.id, l.id, l.name, ''co_captain''::text AS role
        FROM teams t
        JOIN leagues l ON l.id = t.league_id
        CROSS JOIN LATERAL UNNEST(COALESCE(t.co_captains, ARRAY[]::text[])) AS co_cap
        WHERE t.active = true AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
        UNION ALL
        SELECT roster_user AS user_id, t.id, l.id, l.name, ''player''::text AS role
        FROM teams t
        JOIN leagues l ON l.id = t.league_id
        CROSS JOIN LATERAL UNNEST(COALESCE(t.roster, ARRAY[]::text[])) AS roster_user
        WHERE t.active = true AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
    ),
    individual_regs AS (
        SELECT lp.user_id, NULL::bigint AS team_id, l.id AS league_id, l.name AS league_name, ''individual''::text AS role
        FROM league_payments lp
        JOIN leagues l ON l.id = lp.league_id
        WHERE lp.team_id IS NULL
        GROUP BY lp.user_id, l.id, l.name
    ),
    combined_regs AS (
        SELECT user_id,
               JSONB_AGG(
                 JSONB_BUILD_OBJECT(
                   ''league_id'', league_id,
                   ''league_name'', league_name,
                   ''team_id'', team_id,
                   ''role'', role,
                   ''registration_type'', CASE WHEN role = ''individual'' THEN ''individual'' ELSE ''team'' END
                 )
                 ORDER BY league_name
               ) AS current_registrations,
               COUNT(*) AS reg_count
        FROM (
          SELECT * FROM team_memberships
          UNION ALL
          SELECT * FROM individual_regs
        ) all_regs
        GROUP BY user_id
    ),
    filtered_data AS (
        SELECT cd.profile_id,
               cd.combined_auth_id AS auth_id,
               cd.name,
               cd.email,
               cd.phone,
               cd.is_admin,
               cd.is_facilitator,
               cd.date_created,
               cd.date_modified,
               cd.team_ids,
               cd.league_ids,
               cd.user_sports_skills,
               cd.status,
               cd.confirmed_at,
               cd.last_sign_in_at,
               cd.auth_created_at,
               COALESCE(pt.total_owed, 0) AS total_owed,
               COALESCE(pt.total_paid, 0) AS total_paid,
               COALESCE(cr.current_registrations, ''[]''::jsonb) AS current_registrations,
               COALESCE(cr.reg_count, 0) AS reg_count,
               COUNT(*) OVER() AS total_count
        FROM combined_data cd
        LEFT JOIN payment_totals pt ON cd.profile_id = pt.user_id
        LEFT JOIN combined_regs cr ON cd.profile_id = cr.user_id';

    IF array_length(v_where_conditions, 1) > 0 THEN
        v_final_query := v_final_query || ' WHERE ' || array_to_string(v_where_conditions, ' AND ');
    END IF;

    v_final_query := v_final_query || ' ORDER BY ' || v_sort_sql || ' LIMIT ' || p_limit || ' OFFSET ' || p_offset || ')';

    v_final_query := v_final_query || '
    SELECT profile_id, auth_id, name, email, phone, is_admin, is_facilitator, date_created, date_modified, team_ids, league_ids,
           user_sports_skills, status, confirmed_at, last_sign_in_at, auth_created_at, total_count, total_owed, total_paid, current_registrations
    FROM filtered_data';

    RETURN QUERY EXECUTE v_final_query;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_week_settings(p_league_id integer, p_week_number integer)
 RETURNS TABLE(no_games boolean)
 LANGUAGE plpgsql
AS $function$
  BEGIN
      RETURN QUERY
      SELECT COALESCE(
          (SELECT ws.no_games
           FROM weekly_schedules ws
           WHERE ws.league_id = p_league_id
           AND ws.week_number = p_week_number
           LIMIT 1),
          FALSE
      ) as no_games;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.handle_registration_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.team_id IS NULL AND OLD.is_waitlisted = false THEN
        PERFORM promote_from_waitlist(OLD.league_id);
    END IF;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_user_signup_and_add_to_teams()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  invite RECORD;
  current_roster text[];
BEGIN
  -- Only process for new user inserts
  IF TG_OP = 'INSERT' THEN
    -- Process each pending invite for this user's email
    FOR invite IN 
      SELECT ti.id as invite_id, ti.team_id, t.roster
      FROM team_invites ti
      JOIN teams t ON t.id = ti.team_id
      WHERE LOWER(ti.email) = LOWER(NEW.email)
        AND ti.status = 'pending'
        AND ti.expires_at > NOW()
        AND t.active = true
    LOOP
      -- Get current roster
      current_roster := COALESCE(invite.roster, ARRAY[]::text[]);
      
      -- Add user to team if not already in roster
      IF NOT (NEW.id = ANY(current_roster)) THEN
        -- Update team roster
        UPDATE teams 
        SET roster = array_append(current_roster, NEW.id)
        WHERE id = invite.team_id;
        
        -- Mark invite as accepted
        UPDATE team_invites
        SET status = 'accepted',
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = invite.invite_id;
        
        RAISE NOTICE 'Added user % to team %', NEW.id, invite.team_id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE auth_id = auth.uid() 
    AND is_admin = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_individual_league_full(p_league_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_max_spots INTEGER;
    v_current_registrations INTEGER;
BEGIN
    SELECT max_teams INTO v_max_spots
    FROM leagues
    WHERE id = p_league_id
      AND team_registration = false;

    IF v_max_spots IS NULL THEN
        RETURN false;
    END IF;

    SELECT COUNT(*) INTO v_current_registrations
    FROM league_payments
    WHERE league_id = p_league_id
      AND team_id IS NULL
      AND is_waitlisted = false;

    RETURN v_current_registrations >= v_max_spots;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.promote_from_waitlist(p_league_id bigint)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_promoted_count INTEGER := 0;
    v_available_spots INTEGER;
    v_waitlist_record RECORD;
BEGIN
    SELECT 
        l.max_teams - COUNT(lp.id) INTO v_available_spots
    FROM leagues l
    LEFT JOIN league_payments lp ON lp.league_id = l.id 
        AND lp.team_id IS NULL 
        AND lp.is_waitlisted = false
    WHERE l.id = p_league_id 
        AND l.team_registration = false
    GROUP BY l.max_teams;

    IF v_available_spots > 0 THEN
        FOR v_waitlist_record IN
            SELECT id
            FROM league_payments
            WHERE league_id = p_league_id
              AND team_id IS NULL
              AND is_waitlisted = true
            ORDER BY created_at ASC
            LIMIT v_available_spots
        LOOP
            UPDATE league_payments
            SET is_waitlisted = false
            WHERE id = v_waitlist_record.id;
            v_promoted_count := v_promoted_count + 1;
        END LOOP;
    END IF;

    RETURN v_promoted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.queue_team_registration_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    captain_record RECORD;
    league_name TEXT;
    league_primary_skill_id BIGINT;
    league_skill_ids BIGINT[];
    league_skill_name TEXT;
    selected_skill_name TEXT;
BEGIN
    -- Only proceed for new teams (on INSERT)
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Get captain information
    SELECT name, email, phone INTO captain_record
    FROM users
    WHERE id = NEW.captain_id;

    -- Get league information including skill references
    SELECT name, skill_id, skill_ids INTO league_name, league_primary_skill_id, league_skill_ids
    FROM leagues
    WHERE id = NEW.league_id;

    -- Determine the skill level name
    IF NEW.skill_level_id IS NOT NULL THEN
        SELECT name INTO selected_skill_name FROM skills WHERE id = NEW.skill_level_id;
    END IF;

    IF selected_skill_name IS NULL AND league_primary_skill_id IS NOT NULL THEN
        SELECT name INTO league_skill_name FROM skills WHERE id = league_primary_skill_id;
    END IF;

    IF selected_skill_name IS NULL AND league_skill_name IS NULL AND league_skill_ids IS NOT NULL AND array_length(league_skill_ids, 1) > 0 THEN
        SELECT name INTO league_skill_name FROM skills WHERE id = league_skill_ids[1];
    END IF;

    -- Insert notification record
    INSERT INTO team_registration_notifications (
        team_id,
        team_name,
        captain_name,
        captain_email,
        captain_phone,
        league_name,
        registered_at,
        roster_count,
        league_skill_level
    ) VALUES (
        NEW.id,
        NEW.name,
        COALESCE(captain_record.name, 'Unknown'),
        COALESCE(captain_record.email, 'Unknown'),
        captain_record.phone,
        COALESCE(league_name, 'Unknown League'),
        NEW.created_at,
        COALESCE(array_length(NEW.roster, 1), 1),
        COALESCE(selected_skill_name, league_skill_name, 'Not specified')
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the team creation
        RAISE WARNING 'Failed to queue team registration notification: %', SQLERRM;
        RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalculate_standings_positions(p_league_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    team_record RECORD;
    position_counter INTEGER := 1;
BEGIN
    FOR team_record IN (
        WITH team_rankings AS (
            SELECT
                team_attrs.value->>'name' AS team_name,
                MIN(
                    CASE
                        WHEN (team_attrs.value->>'ranking') ~ '^-?\\d+$'
                            THEN (team_attrs.value->>'ranking')::INTEGER
                        ELSE NULL
                    END
                ) AS schedule_ranking
            FROM league_schedules ls
            CROSS JOIN LATERAL jsonb_array_elements(ls.schedule_data->'tiers') AS tier(tier_json)
            CROSS JOIN LATERAL jsonb_each(tier.tier_json->'teams') AS team_attrs(key, value)
            WHERE ls.league_id = p_league_id
            GROUP BY team_attrs.value->>'name'
        )
        SELECT
            s.id,
            s.team_id,
            t.name AS team_name,
            s.points + COALESCE(s.manual_points_adjustment, 0) AS total_points,
            s.wins + COALESCE(s.manual_wins_adjustment, 0) AS total_wins,
            s.point_differential + COALESCE(s.manual_differential_adjustment, 0) AS total_differential,
            t.created_at,
            COALESCE(tr.schedule_ranking, 999) AS schedule_ranking
        FROM standings s
        JOIN teams t ON t.id = s.team_id
        LEFT JOIN team_rankings tr ON tr.team_name = t.name
        WHERE s.league_id = p_league_id
        ORDER BY
            total_points DESC,
            total_wins DESC,
            total_differential DESC,
            COALESCE(tr.schedule_ranking, 999) ASC,
            t.created_at ASC
    ) LOOP
        UPDATE standings
        SET current_position = position_counter
        WHERE id = team_record.id;

        position_counter := position_counter + 1;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_league_schedule_summary()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY league_schedule_summary;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.register_spare(p_sport_id bigint, p_skill_level text, p_share_phone boolean DEFAULT false, p_available_monday boolean DEFAULT false, p_available_tuesday boolean DEFAULT false, p_available_wednesday boolean DEFAULT false, p_available_thursday boolean DEFAULT false, p_available_friday boolean DEFAULT false, p_available_saturday boolean DEFAULT false, p_available_sunday boolean DEFAULT false, p_gender_identity text DEFAULT NULL::text, p_gender_identity_other text DEFAULT NULL::text, p_volleyball_positions text[] DEFAULT NULL::text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_spare_id UUID;
    v_sport_name TEXT;
    v_user_id TEXT;
    v_allowed_skill_levels CONSTANT TEXT[] := ARRAY['beginner', 'intermediate', 'advanced', 'competitive', 'elite'];
    v_allowed_genders CONSTANT TEXT[] := ARRAY[
      'woman',
      'man',
      'non-binary',
      'genderqueer',
      'genderfluid',
      'two-spirit',
      'agender',
      'transgender',
      'prefer-not-to-say',
      'self-described'
    ];
    v_gender TEXT;
    v_gender_other TEXT;
    v_allowed_positions CONSTANT TEXT[] := ARRAY[
      'setter',
      'opposite',
      'outside-hitter',
      'middle-blocker',
      'libero',
      'defensive-specialist',
      'serving-specialist',
      'utility'
    ];
    v_positions TEXT[];
    v_position TEXT;
BEGIN
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    SELECT name INTO v_sport_name FROM sports WHERE id = p_sport_id AND active = true;
    IF v_sport_name IS NULL THEN
        RAISE EXCEPTION 'Sport does not exist or is not active';
    END IF;

    IF p_skill_level NOT IN (SELECT UNNEST(v_allowed_skill_levels)) THEN
        RAISE EXCEPTION 'Invalid skill level. Must be: %', array_to_string(v_allowed_skill_levels, ', ');
    END IF;

    IF EXISTS(
        SELECT 1 FROM spares 
        WHERE user_id = v_user_id 
        AND sport_id = p_sport_id 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'User already registered as spare for this sport';
    END IF;

    v_gender := NULL;
    v_gender_other := NULL;
    IF p_gender_identity IS NOT NULL THEN
        v_gender := regexp_replace(lower(trim(p_gender_identity)), '\\s+', '-', 'g');
        IF v_gender = '' THEN
          v_gender := NULL;
        ELSIF v_gender NOT IN (SELECT UNNEST(v_allowed_genders)) THEN
          RAISE EXCEPTION 'Invalid gender identity option: %', p_gender_identity;
        END IF;
    END IF;

    IF v_gender = 'self-described' THEN
        v_gender_other := NULLIF(trim(p_gender_identity_other), '');
        IF v_gender_other IS NULL THEN
          RAISE EXCEPTION 'Please describe your gender identity when selecting self-described option';
        END IF;
        v_gender_other := left(v_gender_other, 160);
    ELSE
        v_gender_other := NULL;
    END IF;

    IF p_volleyball_positions IS NOT NULL THEN
        IF lower(v_sport_name) <> 'volleyball' THEN
            RAISE EXCEPTION 'Volleyball positions are only applicable for the volleyball spares list';
        END IF;

        v_positions := ARRAY(
          SELECT DISTINCT value FROM (
            SELECT NULLIF(regexp_replace(lower(trim(pos)), '\\s+', '-', 'g'), '') AS value
            FROM unnest(p_volleyball_positions) AS pos
          ) AS normalized
          WHERE value IS NOT NULL
        );

        IF v_positions IS NULL OR array_length(v_positions, 1) = 0 THEN
          v_positions := NULL;
        ELSE
          FOREACH v_position IN ARRAY v_positions LOOP
            IF v_position NOT IN (SELECT UNNEST(v_allowed_positions)) THEN
              RAISE EXCEPTION 'Invalid volleyball position option: %', v_position;
            END IF;
          END LOOP;
        END IF;
    ELSE
        v_positions := NULL;
    END IF;

    INSERT INTO spares (
        user_id,
        sport_id,
        skill_level,
        share_phone,
        available_monday,
        available_tuesday,
        available_wednesday,
        available_thursday,
        available_friday,
        available_saturday,
        available_sunday,
        gender_identity,
        gender_identity_other,
        volleyball_positions,
        is_active
    ) VALUES (
        v_user_id,
        p_sport_id,
        p_skill_level,
        COALESCE(p_share_phone, false),
        COALESCE(p_available_monday, false),
        COALESCE(p_available_tuesday, false),
        COALESCE(p_available_wednesday, false),
        COALESCE(p_available_thursday, false),
        COALESCE(p_available_friday, false),
        COALESCE(p_available_saturday, false),
        COALESCE(p_available_sunday, false),
        v_gender,
        v_gender_other,
        v_positions,
        true
    )
    RETURNING id INTO v_spare_id;

    RETURN v_spare_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.remove_tier_optimized(p_league_id integer, p_current_week integer, p_tier_number integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM weekly_schedules
  WHERE league_id = p_league_id
    AND week_number >= p_current_week
    AND tier_number = p_tier_number;

  UPDATE weekly_schedules
  SET tier_number = tier_number - 1
  WHERE league_id = p_league_id
    AND week_number >= p_current_week
    AND tier_number > p_tier_number;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.schedule_process_team_invites()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Instead of processing invites directly, we'll just log that a new user was created
  -- The actual processing will happen through the application or a scheduled job
  -- This avoids RLS permission issues
  
  -- We can still check if there are pending invites for this email
  IF EXISTS (
    SELECT 1 FROM team_invites 
    WHERE LOWER(email) = LOWER(NEW.email) 
    AND status = 'pending'
    AND expires_at > NOW()
  ) THEN
    -- Log that this user has pending invites (optional)
    RAISE NOTICE 'User % has pending team invites', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_page_content_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_site_announcements_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_week_no_games(p_league_id integer, p_week_number integer, p_no_games boolean)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
  BEGIN
      -- Update all tiers for this week with the no_games flag
      UPDATE weekly_schedules
      SET no_games = p_no_games,
          updated_at = NOW()
      WHERE league_id = p_league_id
      AND week_number = p_week_number;

      -- If no rows exist for this week yet, create placeholder entries
      IF NOT FOUND AND p_no_games = TRUE THEN
          -- Get tier structure from week 1
          INSERT INTO weekly_schedules (
              league_id, week_number, tier_number,
              location, time_slot, court, format,
              no_games, created_at, updated_at
          )
          SELECT
              league_id, p_week_number, tier_number,
              location, time_slot, court, format,
              TRUE, NOW(), NOW()
          FROM weekly_schedules
          WHERE league_id = p_league_id AND week_number = 1;
      END IF;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.sync_league_payment_due_dates()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- When payment_due_date is updated in leagues table, update all related payment records
  IF OLD.payment_due_date IS DISTINCT FROM NEW.payment_due_date THEN
    UPDATE league_payments
    SET due_date = NEW.payment_due_date
    WHERE league_id = NEW.id
    AND status != 'paid'; -- Only update unpaid payments
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_individual_registration_notification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only trigger for individual registrations (team_id is NULL)
    IF NEW.team_id IS NULL THEN
        INSERT INTO individual_registration_notification_queue (
            user_id, 
            league_id, 
            registration_id
        ) VALUES (
            NEW.user_id, 
            NEW.league_id, 
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_game_results_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.update_league_schedules_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.update_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update the payment status based on amounts
  IF NEW.amount_paid >= NEW.amount_due THEN
    NEW.status = 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status = 'partial';
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    NEW.status = 'overdue';
  ELSE
    NEW.status = 'pending';
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_standings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.update_team_invites_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_sports_skills(p_user_id text, p_sports_skills jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_user_id TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user ID
  SELECT id INTO v_current_user_id FROM users WHERE auth_id = auth.uid();
  
  -- Check if current user is admin
  SELECT is_admin INTO v_is_admin FROM users WHERE auth_id = auth.uid();
  
  -- Verify permissions (user can only update their own preferences unless they're an admin)
  IF v_current_user_id != p_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission denied: You can only update your own sports preferences';
    RETURN FALSE;
  END IF;
  
  -- Validate input format (should be an array of objects with sport_id and skill_id)
  IF jsonb_typeof(p_sports_skills) != 'array' THEN
    RAISE EXCEPTION 'Invalid format: sports_skills must be an array';
    RETURN FALSE;
  END IF;
  
  -- Update the user record
  UPDATE users
  SET 
    user_sports_skills = p_sports_skills,
    date_modified = now()
  WHERE id = p_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error updating user sports and skills: %', SQLERRM;
    RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_weekly_schedules_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.validate_tier_team_capacity(p_tier_id integer, p_new_format text)
 RETURNS TABLE(is_valid boolean, current_team_count integer, max_allowed_teams integer, teams_that_would_be_removed text[])
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_teams TEXT[];
  format_capacity INTEGER;
BEGIN
  -- Get current teams for the tier
  SELECT ARRAY[
    team_a_name, team_b_name, team_c_name,
    team_d_name, team_e_name, team_f_name
  ]
  INTO current_teams
  FROM weekly_schedules
  WHERE id = p_tier_id;

  -- Remove null entries
  current_teams := ARRAY(SELECT unnest(current_teams) WHERE unnest IS NOT NULL);

  -- Compute capacity by format
  format_capacity := CASE 
    WHEN p_new_format IN ('2-teams-4-sets', '2-teams-best-of-3', '2-teams-best-of-5', '2-teams-elite') THEN 2
    WHEN p_new_format IN ('3-teams-6-sets', '3-teams-elite-6-sets', '3-teams-elite-9-sets') THEN 3
    WHEN p_new_format = '4-teams-head-to-head' THEN 4
    WHEN p_new_format = '6-teams-head-to-head' THEN 6
    ELSE 3
  END;

  RETURN QUERY
  SELECT 
    COALESCE(array_length(current_teams, 1), 0) <= format_capacity,
    COALESCE(array_length(current_teams, 1), 0),
    format_capacity,
    CASE 
      WHEN COALESCE(array_length(current_teams, 1), 0) > format_capacity 
      THEN current_teams[format_capacity + 1 : array_length(current_teams, 1)]
      ELSE ARRAY[]::TEXT[]
    END;
END;
$function$
;

create policy "Admins can delete attendance records"
on "public"."attendance"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Enable read access for authenticated users"
on "public"."attendance"
as permissive
for select
to authenticated
using (true);


create policy "Users can delete their own attendance"
on "public"."attendance"
as permissive
for delete
to authenticated
using ((auth.uid() IN ( SELECT users.auth_id
   FROM users
  WHERE (users.id = attendance.player))));


create policy "Users can insert attendance records"
on "public"."attendance"
as permissive
for insert
to public
with check (((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))) OR (auth.uid() IN ( SELECT users.auth_id
   FROM users
  WHERE (users.id = attendance.player)))));


create policy "Users can view their own attendance"
on "public"."attendance"
as permissive
for select
to authenticated
using ((auth.uid() IN ( SELECT users.auth_id
   FROM users
  WHERE (users.id = attendance.player))));


create policy "Admins can delete balance entries"
on "public"."balances"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Admins can insert balances"
on "public"."balances"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Admins can view all balances"
on "public"."balances"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Users can insert balance records"
on "public"."balances"
as permissive
for insert
to authenticated
with check (true);


create policy "Users can view their own balances"
on "public"."balances"
as permissive
for select
to authenticated
using ((auth.uid() IN ( SELECT users.auth_id
   FROM users
  WHERE (users.id = balances.player))));


create policy "Allow admins full access to gyms"
on "public"."gyms"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Allow all users to view gyms"
on "public"."gyms"
as permissive
for select
to public
using (true);


create policy "Enable read access for all authenticated users"
on "public"."gyms"
as permissive
for select
to authenticated
using (true);


create policy "Admins can manage all league payments"
on "public"."league_payments"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))))
with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Admins can view all league payments"
on "public"."league_payments"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Users can create their own league payments"
on "public"."league_payments"
as permissive
for insert
to authenticated
with check ((user_id = get_current_user_id()));


create policy "Allow authenticated users full access"
on "public"."league_schedules"
as permissive
for all
to public
using ((auth.role() = 'authenticated'::text));


create policy "League standings are viewable by all authenticated users"
on "public"."league_standings"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "League standings can only be modified by admins"
on "public"."league_standings"
as permissive
for all
to public
using (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.uid())::text) AND (users.is_admin = true))))));


create policy "Admins can manage leagues"
on "public"."leagues"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))))
with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Admins can update payment_due_date"
on "public"."leagues"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.uid())::text) AND (users.is_admin = true)))))
with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.uid())::text) AND (users.is_admin = true)))));


create policy "Enable read access for all users"
on "public"."leagues"
as permissive
for select
to public
using (true);


create policy "Match sets are viewable by all authenticated users"
on "public"."match_sets"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Match sets can be modified by facilitators and admins"
on "public"."match_sets"
as permissive
for all
to public
using (((auth.role() = 'authenticated'::text) AND ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.uid())::text) AND (users.is_admin = true)))) OR (EXISTS ( SELECT 1
   FROM matches m
  WHERE ((m.id = match_sets.match_id) AND ((m.facilitator_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
           FROM users
          WHERE ((users.id = (auth.uid())::text) AND (users.is_facilitator = true)))))))))));


create policy "Matches are viewable by all authenticated users"
on "public"."matches"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Matches can be modified by facilitators and admins"
on "public"."matches"
as permissive
for all
to public
using (((auth.role() = 'authenticated'::text) AND ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.uid())::text) AND (users.is_admin = true)))) OR (facilitator_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.uid())::text) AND (users.is_facilitator = true)))))));


create policy "Admins can manage all registrations"
on "public"."registrations"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Enable read access for all authenticated users"
on "public"."registrations"
as permissive
for select
to authenticated
using (true);


create policy "Users can delete registrations"
on "public"."registrations"
as permissive
for delete
to public
using (((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))) OR (auth.uid() IN ( SELECT users.auth_id
   FROM users
  WHERE (users.id = registrations.player)))));


create policy "Users can insert registrations"
on "public"."registrations"
as permissive
for insert
to public
with check (((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))) OR (auth.uid() IN ( SELECT users.auth_id
   FROM users
  WHERE (users.id = registrations.player)))));


create policy "Users can update registrations"
on "public"."registrations"
as permissive
for update
to public
using (((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))) OR (auth.uid() IN ( SELECT users.auth_id
   FROM users
  WHERE (users.id = registrations.player)))));


create policy "Schedule templates are viewable by authenticated users"
on "public"."schedule_templates"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Admins can delete seasons"
on "public"."seasons"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Admins can insert seasons"
on "public"."seasons"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Admins can update seasons new field"
on "public"."seasons"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))))
with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Admins can update seasons"
on "public"."seasons"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Enable read access for all users"
on "public"."seasons"
as permissive
for select
to public
using (true);


create policy "Users can view seasons related to their attendance"
on "public"."seasons"
as permissive
for select
to authenticated
using (true);


create policy "Admins can manage skills"
on "public"."skills"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))))
with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Enable read access for all users"
on "public"."skills"
as permissive
for select
to public
using (true);


create policy "Admins can view all spares"
on "public"."spares"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.is_admin = true)))));


create policy "Users can create own spare registrations"
on "public"."spares"
as permissive
for insert
to public
with check ((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));


create policy "Users can delete own spare registrations"
on "public"."spares"
as permissive
for delete
to public
using ((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));


create policy "Users can update own spare registrations"
on "public"."spares"
as permissive
for update
to public
using ((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));


create policy "Users can view own spare registrations"
on "public"."spares"
as permissive
for select
to public
using ((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));


create policy "Admins can manage sports"
on "public"."sports"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Enable read access for all users"
on "public"."sports"
as permissive
for select
to public
using (true);


create policy "Users can view their own customer data"
on "public"."stripe_customers"
as permissive
for select
to authenticated
using (((user_id = auth.uid()) AND (deleted_at IS NULL)));


create policy "Users can view their own order data"
on "public"."stripe_orders"
as permissive
for select
to authenticated
using (((customer_id IN ( SELECT stripe_customers.customer_id
   FROM stripe_customers
  WHERE ((stripe_customers.user_id = auth.uid()) AND (stripe_customers.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


create policy "Allow admins to manage products"
on "public"."stripe_products"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))))
with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Allow all users to read products"
on "public"."stripe_products"
as permissive
for select
to public
using (true);


create policy "Users can view their own subscription data"
on "public"."stripe_subscriptions"
as permissive
for select
to authenticated
using (((customer_id IN ( SELECT stripe_customers.customer_id
   FROM stripe_customers
  WHERE ((stripe_customers.user_id = auth.uid()) AND (stripe_customers.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


create policy "Authenticated users can view their invites"
on "public"."team_invites"
as permissive
for select
to public
using (((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (lower(u.email) = lower(team_invites.email))))) AND (status = 'pending'::text) AND (expires_at > now())));


create policy "Team captains can manage invites"
on "public"."team_invites"
as permissive
for all
to public
using ((team_id IN ( SELECT teams.id
   FROM teams
  WHERE (teams.captain_id = (auth.uid())::text))));


create policy "Users can update their own invites by email"
on "public"."team_invites"
as permissive
for update
to public
using (((lower(email) = lower((auth.jwt() ->> 'email'::text))) AND (status = 'pending'::text) AND (expires_at > now())))
with check ((lower(email) = lower((auth.jwt() ->> 'email'::text))));


create policy "Users can view invites for their teams"
on "public"."team_invites"
as permissive
for select
to public
using ((team_id IN ( SELECT teams.id
   FROM teams
  WHERE ((teams.captain_id = (auth.uid())::text) OR ((auth.uid())::text = ANY (teams.roster))))));


create policy "Users can view their own invites by email"
on "public"."team_invites"
as permissive
for select
to public
using (((lower(email) = lower((auth.jwt() ->> 'email'::text))) AND (status = 'pending'::text) AND (expires_at > now())));


create policy "Service role can manage notifications"
on "public"."team_registration_notifications"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Admin users can insert transfer history"
on "public"."team_transfer_history"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.uid())::text) AND (users.is_admin = true)))));


create policy "Admin users can view transfer history"
on "public"."team_transfer_history"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.uid())::text) AND (users.is_admin = true)))));


create policy "Admins can manage all teams"
on "public"."teams"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))))
with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Enable read access for all users"
on "public"."teams"
as permissive
for select
to public
using (true);


create policy "Team captains can manage their teams"
on "public"."teams"
as permissive
for all
to authenticated
using (((captain_id = get_current_user_id()) OR (get_current_user_id() = ANY (roster))))
with check (((captain_id = get_current_user_id()) OR ((get_current_user_id() = ANY (roster)) AND (captain_id = ANY (roster)))));


create policy "Tier history can only be modified by admins"
on "public"."tier_history"
as permissive
for all
to public
using (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.uid())::text) AND (users.is_admin = true))))));


create policy "Tier history is viewable by all authenticated users"
on "public"."tier_history"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Admins can delete users"
on "public"."users"
as permissive
for delete
to authenticated
using (is_current_user_admin());


create policy "Admins can read all users"
on "public"."users"
as permissive
for select
to authenticated
using (((auth_id = auth.uid()) OR is_current_user_admin()));


create policy "Admins can update all users"
on "public"."users"
as permissive
for update
to authenticated
using (((auth_id = auth.uid()) OR is_current_user_admin()))
with check (((auth_id = auth.uid()) OR is_current_user_admin()));


create policy "Allow authenticated users to view public profile information"
on "public"."users"
as permissive
for select
to authenticated
using (true);


create policy "System functions can access users"
on "public"."users"
as permissive
for all
to authenticated
using (((auth_id = auth.uid()) OR (current_setting('role'::text, true) = 'postgres'::text)));


create policy "Users can create own profile"
on "public"."users"
as permissive
for insert
to authenticated
with check ((auth_id = auth.uid()));


create policy "Admins can view all waiver acceptances"
on "public"."waiver_acceptances"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


create policy "Users can accept waivers"
on "public"."waiver_acceptances"
as permissive
for insert
to public
with check ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));


create policy "Users can view own waiver acceptances"
on "public"."waiver_acceptances"
as permissive
for select
to public
using ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));


create policy "Active waivers are viewable by everyone"
on "public"."waivers"
as permissive
for select
to public
using ((is_active = true));


create policy "Admins can manage waivers"
on "public"."waivers"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));


CREATE TRIGGER individual_registration_notification_trigger AFTER INSERT ON public.league_payments FOR EACH ROW EXECUTE FUNCTION trigger_individual_registration_notification();

CREATE TRIGGER trigger_update_match_totals AFTER INSERT OR DELETE OR UPDATE ON public.match_sets FOR EACH ROW EXECUTE FUNCTION update_match_totals();

CREATE TRIGGER trigger_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spares_updated_at_trigger BEFORE UPDATE ON public.spares FOR EACH ROW EXECUTE FUNCTION update_spares_updated_at();



