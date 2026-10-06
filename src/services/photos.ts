import { supabase } from "./client";
import type { Post } from "../types";
export async function feed(team?: string, user?: string, before?: Post) {
  const { data, error } = await supabase.rpc("photo_feed", {
    p_team: team || null,
    p_user: user || null,
    p_before_time: before?.created_at || null,
    p_before_id: before?.id || null,
    p_limit: 20,
  });
  if (error) throw error;
  return data as Post[];
}
export async function setLike(postId: string, userId: string, liked: boolean) {
  const result = liked
    ? await supabase
        .from("likes")
        .upsert(
          { post_id: postId, user_id: userId },
          { onConflict: "post_id,user_id", ignoreDuplicates: true },
        )
    : await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
  if (result.error) throw result.error;
  const count = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  if (count.error) throw count.error;
  return count.count || 0;
}
export async function readLike(postId: string, userId: string) {
  const [count, own] = await Promise.all([
    supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId),
    supabase
      .from("likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (count.error || own.error) throw count.error || own.error;
  return { like_count: count.count || 0, liked: Boolean(own.data) };
}
export async function uploadPhoto(
  userId: string,
  id: string,
  image: { blob: Blob; width: number; height: number },
) {
  const path = `${userId}/${id}.jpg`;
  const bucket = supabase.storage.from("company-photos");
  const uploaded = await bucket.upload(path, image.blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (uploaded.error) throw new Error("העלאת התמונה נכשלה. נסה שוב.");
  const row = await supabase.from("posts").insert({
    id,
    user_id: userId,
    image_path: path,
    image_width: image.width,
    image_height: image.height,
  });
  if (row.error) {
    const cleanup = await bucket.remove([path]);
    throw new Error(
      cleanup.error
        ? "שמירת התמונה נכשלה. ייתכן שנותר קובץ; יש לעדכן את מנהל האתר."
        : "שמירת התמונה נכשלה והקובץ הוסר. נסה שוב.",
    );
  }
}
