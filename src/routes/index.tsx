import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, PostImage, WinButton, WinInput, WinWindow } from "@/lib/win";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Instagram.exe — Retro 90s Social App" },
      {
        name: "description",
        content:
          "A Windows 95 style Instagram: post photos with captions, follow friends, like and comment, and see your profile on any device.",
      },
      { property: "og:title", content: "Instagram.exe — Retro 90s Social App" },
      {
        property: "og:description",
        content:
          "Post photos, follow friends, like and comment in a Windows 95 style Instagram replica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Tab = "profile" | "friends" | "people" | "new";

type ProfileRow = {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  website: string;
  avatar_url: string | null;
};

type FeedPost = {
  id: string;
  caption: string;
  image_url: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; avatar_url: string | null } | null;
  likes: { user_id: string }[];
  comments: { id: string }[];
};

function App() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("profile");
  const [listOpen, setListOpen] = useState<null | "followers" | "following">(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
      if (!data.session) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, qc]);

  const uid = session?.user.id ?? null;

  const profileQ = useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    queryFn: async (): Promise<ProfileRow> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, bio, website, avatar_url")
        .eq("id", uid as string)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const followingQ = useQuery({
    queryKey: ["following", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id, profiles!follows_following_id_fkey(id, username, avatar_url)")
        .eq("follower_id", uid as string);
      if (error) throw error;
      return data;
    },
  });

  const followersQ = useQuery({
    queryKey: ["followers", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id, profiles!follows_follower_id_fkey(id, username, avatar_url)")
        .eq("following_id", uid as string);
      if (error) throw error;
      return data;
    },
  });

  const myPostsQ = useQuery({
    queryKey: ["myPosts", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, image_url, caption, created_at")
        .eq("user_id", uid as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const followingIds = (followingQ.data ?? []).map((f) => f.following_id);

  const feedQ = useQuery({
    queryKey: ["feed", uid, followingIds.join(",")],
    enabled: !!uid && followingQ.isSuccess,
    queryFn: async (): Promise<FeedPost[]> => {
      const ids = [...followingIds, uid as string];
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, caption, image_url, created_at, user_id, profiles!posts_user_id_fkey(username, avatar_url), likes(user_id), comments(id)",
        )
        .in("user_id", ids)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as FeedPost[];
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/auth" });
  };

  if (!ready || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-win-ink font-win text-[13px] text-win-title-fg">
        Loading…
      </main>
    );
  }

  const profile = profileQ.data;

  return (
    <main
      className="flex min-h-screen justify-center bg-win-ink p-2 font-win text-win-ink sm:p-6"
      style={{ fontFamily: "var(--font-win)" }}
    >
      <div className="w-full max-w-[420px]">
        <WinWindow title="Instagram.exe" onClose={signOut}>
          {/* Menu bar */}
          <div className="flex gap-1 px-1 py-1 text-[13px]">
            {["File", "Edit", "View", "Options", "Help"].map((m) => (
              <span key={m} className="px-2 py-0.5">
                <span className="underline">{m.charAt(0)}</span>
                {m.slice(1)}
              </span>
            ))}
            <button onClick={signOut} className="ml-auto px-2 py-0.5 underline">
              Log off
            </button>
          </div>

          <div className="border-y-2 border-t-[var(--win-face-dark)] border-b-[var(--win-face-light)] py-2 text-center text-[16px] font-bold">
            {profile?.username ?? "…"}
          </div>

          {tab === "profile" && profile && (
            <ProfileTab
              profile={profile}
              posts={myPostsQ.data ?? []}
              followers={followersQ.data?.length ?? 0}
              following={followingQ.data?.length ?? 0}
              onOpenList={setListOpen}
              onEdit={() => setEditOpen(true)}
            />
          )}
          {tab === "friends" && (
            <FriendsTab posts={feedQ.data ?? []} uid={uid as string} loading={feedQ.isLoading} />
          )}
          {tab === "people" && <PeopleTab uid={uid as string} followingIds={followingIds} />}
          {tab === "new" && <NewPostTab uid={uid as string} onDone={() => setTab("profile")} />}

          {/* Bottom nav */}
          <div className="flex gap-1 border-t-2 border-[var(--win-face-dark)] p-2">
            {(
              [
                ["friends", "⌂"],
                ["people", "🔍"],
                ["new", "▣"],
                ["profile", "☻"],
              ] as [Tab, string][]
            ).map(([key, icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                aria-label={key}
                className={`flex-1 py-2 text-[15px] ${tab === key ? "win-in" : "win-btn"}`}
              >
                {icon}
              </button>
            ))}
          </div>
        </WinWindow>
      </div>

      {listOpen && (
        <Modal title={listOpen === "followers" ? "Followers" : "Following"} onClose={() => setListOpen(null)}>
          <PeopleList
            rows={(listOpen === "followers" ? followersQ.data : followingQ.data) ?? []}
            uid={uid as string}
            followingIds={followingIds}
          />
        </Modal>
      )}

      {editOpen && profile && (
        <Modal title="Profile Properties" onClose={() => setEditOpen(false)}>
          <EditProfile profile={profile} onClose={() => setEditOpen(false)} />
        </Modal>
      )}
    </main>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0_0_0/0.5)] p-3">
      <div className="w-full max-w-[380px]">
        <WinWindow title={title} onClose={onClose}>
          <div className="max-h-[70vh] overflow-y-auto p-3">{children}</div>
        </WinWindow>
      </div>
    </div>
  );
}

function ProfileTab({
  profile,
  posts,
  followers,
  following,
  onOpenList,
  onEdit,
}: {
  profile: ProfileRow;
  posts: { id: string; image_url: string; caption: string }[];
  followers: number;
  following: number;
  onOpenList: (v: "followers" | "following") => void;
  onEdit: () => void;
}) {
  return (
    <div>
      <div className="px-3 py-3">
        <div className="flex items-start gap-3">
          <Avatar path={profile.avatar_url} username={profile.username} size={92} />
          <div className="w-full">
            <div className="grid grid-cols-3 text-center text-[13px]">
              <div>
                <div className="text-[15px] font-bold">{posts.length}</div>
                <div>posts</div>
              </div>
              <button onClick={() => onOpenList("followers")}>
                <div className="text-[15px] font-bold">{followers}</div>
                <div className="underline">followers</div>
              </button>
              <button onClick={() => onOpenList("following")}>
                <div className="text-[15px] font-bold">{following}</div>
                <div className="underline">following</div>
              </button>
            </div>
            <WinButton onClick={onEdit} className="mt-3 w-full py-1.5">
              Edit profile
            </WinButton>
          </div>
        </div>
        <div className="mt-3 text-[14px] leading-snug">
          <p className="font-bold">{profile.full_name || profile.username}</p>
          {profile.bio && <p>{profile.bio}</p>}
          {profile.website && <p>{profile.website}</p>}
        </div>
      </div>

      <div className="win-in mx-2 mb-2 max-h-[420px] overflow-y-auto p-[2px]">
        {posts.length === 0 ? (
          <p className="p-4 text-center text-[13px]">No posts yet. Tap ▣ to add one.</p>
        ) : (
          <div className="grid grid-cols-3 gap-[2px]">
            {posts.map((p) => (
              <div key={p.id} className="aspect-square overflow-hidden">
                <PostImage path={p.image_url} alt={p.caption || "Post"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FriendsTab({
  posts,
  uid,
  loading,
}: {
  posts: FeedPost[];
  uid: string;
  loading: boolean;
}) {
  return (
    <div className="win-in mx-2 my-2 max-h-[560px] overflow-y-auto p-[2px]">
      {loading ? (
        <p className="p-4 text-center text-[13px]">Loading feed…</p>
      ) : posts.length === 0 ? (
        <p className="p-4 text-center text-[13px]">
          Nothing here yet. Follow people in the 🔍 tab, or post something.
        </p>
      ) : (
        <ul>
          {posts.map((post) => (
            <FeedItem key={post.id} post={post} uid={uid} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedItem({ post, uid }: { post: FeedPost; uid: string }) {
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [text, setText] = useState("");
  const liked = post.likes.some((l) => l.user_id === uid);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (liked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", uid);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("likes").insert({ post_id: post.id, user_id: uid });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });

  const commentsQ = useQuery({
    queryKey: ["comments", post.id],
    enabled: showComments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, body, created_at, user_id, profiles!comments_user_id_fkey(username, avatar_url)")
        .eq("post_id", post.id)
        .order("created_at");
      if (error) throw error;
      return data as unknown as {
        id: string;
        body: string;
        profiles: { username: string; avatar_url: string | null } | null;
      }[];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const body = text.trim().slice(0, 500);
      if (!body) return;
      const { error } = await supabase
        .from("comments")
        .insert({ post_id: post.id, user_id: uid, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["comments", post.id] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  return (
    <li className="mb-[2px] bg-[var(--win-face-light)] p-2">
      <div className="flex items-center gap-2 pb-2">
        <Avatar path={post.profiles?.avatar_url} username={post.profiles?.username ?? "?"} size={32} />
        <span className="text-[14px] font-bold">{post.profiles?.username}</span>
      </div>
      <PostImage path={post.image_url} alt={post.caption || "Post"} />
      <div className="flex gap-2 py-2">
        <WinButton onClick={() => toggleLike.mutate()}>
          {liked ? "♥" : "♡"} {post.likes.length}
        </WinButton>
        <WinButton onClick={() => setShowComments((s) => !s)}>💬 {post.comments.length}</WinButton>
      </div>
      {post.caption && (
        <p className="text-[13px]">
          <span className="font-bold">{post.profiles?.username} </span>
          {post.caption}
        </p>
      )}
      {showComments && (
        <div className="mt-2 border-t-2 border-[var(--win-face)] pt-2">
          {(commentsQ.data ?? []).map((c) => (
            <p key={c.id} className="text-[13px]">
              <span className="font-bold">{c.profiles?.username} </span>
              {c.body}
            </p>
          ))}
          <form
            className="mt-2 flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              addComment.mutate();
            }}
          >
            <WinInput
              value={text}
              maxLength={500}
              placeholder="Add a comment…"
              onChange={(e) => setText(e.target.value)}
            />
            <WinButton type="submit">Post</WinButton>
          </form>
        </div>
      )}
    </li>
  );
}

function FollowButton({
  uid,
  targetId,
  isFollowing,
}: {
  uid: string;
  targetId: string;
  isFollowing: boolean;
}) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", uid)
          .eq("following_id", targetId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: uid, following_id: targetId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["followers"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
  if (targetId === uid) return null;
  return (
    <WinButton onClick={() => m.mutate()} disabled={m.isPending}>
      {isFollowing ? "Unfollow" : "+ Follow"}
    </WinButton>
  );
}

type FollowRow = {
  profiles: { id: string; username: string; avatar_url: string | null } | null;
};

function PeopleList({
  rows,
  uid,
  followingIds,
}: {
  rows: FollowRow[] | unknown[];
  uid: string;
  followingIds: string[];
}) {
  const list = (rows as FollowRow[]).map((r) => r.profiles).filter(Boolean) as {
    id: string;
    username: string;
    avatar_url: string | null;
  }[];
  if (list.length === 0) return <p className="text-[13px]">Nobody here yet.</p>;
  return (
    <ul className="space-y-2">
      {list.map((p) => (
        <li key={p.id} className="flex items-center gap-2">
          <Avatar path={p.avatar_url} username={p.username} size={36} />
          <span className="flex-1 text-[14px] font-bold">{p.username}</span>
          <FollowButton uid={uid} targetId={p.id} isFollowing={followingIds.includes(p.id)} />
        </li>
      ))}
    </ul>
  );
}

function PeopleTab({ uid, followingIds }: { uid: string; followingIds: string[] }) {
  const [q, setQ] = useState("");
  const peopleQ = useQuery({
    queryKey: ["people", q],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .neq("id", uid)
        .limit(50);
      if (q.trim()) query = query.ilike("username", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-3">
      <WinInput
        value={q}
        placeholder="Search people…"
        maxLength={40}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="win-in mt-3 max-h-[440px] overflow-y-auto p-2">
        {(peopleQ.data ?? []).length === 0 ? (
          <p className="text-[13px]">No users found.</p>
        ) : (
          <ul className="space-y-2">
            {(peopleQ.data ?? []).map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <Avatar path={p.avatar_url} username={p.username} size={36} />
                <span className="flex-1 text-[14px] font-bold">{p.username}</span>
                <FollowButton uid={uid} targetId={p.id} isFollowing={followingIds.includes(p.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NewPostTab({ uid, onDone }: { uid: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a photo first.");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("media").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const { error } = await supabase
        .from("posts")
        .insert({ user_id: uid, image_url: path, caption: caption.trim().slice(0, 300) });
      if (error) throw error;
    },
    onSuccess: () => {
      setFile(null);
      setCaption("");
      qc.invalidateQueries({ queryKey: ["myPosts"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      onDone();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Upload failed."),
  });

  return (
    <div className="space-y-3 p-3">
      <h2 className="text-[15px] font-bold">New post</h2>
      <div className="win-in p-2">
        <input
          type="file"
          accept="image/*"
          className="text-[13px]"
          onChange={(e) => {
            setError(null);
            setFile(e.target.files?.[0] ?? null);
          }}
        />
      </div>
      {file && <p className="text-[12px]">Selected: {file.name}</p>}
      <WinInput
        label="Caption"
        value={caption}
        maxLength={300}
        onChange={(e) => setCaption(e.target.value)}
      />
      {error && <p className="text-[12px]">{error}</p>}
      <div className="flex justify-end gap-2">
        <WinButton onClick={() => create.mutate()} disabled={create.isPending || !file}>
          {create.isPending ? "Uploading…" : "Share"}
        </WinButton>
      </div>
    </div>
  );
}

function EditProfile({ profile, onClose }: { profile: ProfileRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(profile);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      let avatarPath = draft.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${profile.id}/avatar-${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("media").upload(path, avatarFile);
        if (up.error) throw up.error;
        avatarPath = path;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          username: draft.username.trim().replace(/^@/, "").slice(0, 30),
          full_name: draft.full_name.slice(0, 60),
          bio: draft.bio.slice(0, 200),
          website: draft.website.slice(0, 100),
          avatar_url: avatarPath,
        })
        .eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save."),
  });

  return (
    <div className="space-y-2">
      <WinInput
        label="Username"
        value={draft.username}
        onChange={(e) => setDraft({ ...draft, username: e.target.value })}
      />
      <WinInput
        label="Name"
        value={draft.full_name}
        onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
      />
      <WinInput
        label="Bio"
        value={draft.bio}
        onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
      />
      <WinInput
        label="Website"
        value={draft.website}
        onChange={(e) => setDraft({ ...draft, website: e.target.value })}
      />
      <label className="flex items-center gap-2 text-[13px]">
        <span className="w-24 shrink-0">Photo</span>
        <input
          type="file"
          accept="image/*"
          className="text-[12px]"
          onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {error && <p className="text-[12px]">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <WinButton onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "OK"}
        </WinButton>
        <WinButton onClick={onClose}>Cancel</WinButton>
      </div>
    </div>
  );
}
