export type Profile = {
  id: string;
  display_name: string;
  member_identifier: string;
  team_id: string;
  avatar_path: string | null;
  is_active: boolean;
  teams: { name: string };
};
export type Team = { id: string; name: string };
export type Post = {
  id: string;
  user_id: string;
  image_path: string;
  image_width: number;
  image_height: number;
  created_at: string;
  display_name: string;
  team_name: string;
  avatar_path: string | null;
  like_count: number;
  liked: boolean;
};
