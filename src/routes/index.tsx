import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import avatarImg from "@/assets/avatar.jpg";
import post1 from "@/assets/post1.jpg";
import post2 from "@/assets/post2.jpg";
import post3 from "@/assets/post3.jpg";
import post4 from "@/assets/post4.jpg";
import post5 from "@/assets/post5.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Instagram.exe — Retro 90s Instagram Profile" },
      {
        name: "description",
        content:
          "A Windows 95 style Instagram replica. Add your own Instagram handle, bio, followers and following, and browse a pixel-art post grid.",
      },
      { property: "og:title", content: "Instagram.exe — Retro 90s Instagram Profile" },
      {
        property: "og:description",
        content:
          "A Windows 95 style Instagram replica with your own handle, stats and pixel-art post grid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InstagramExe,
});

type Profile = {
  username: string;
  name: string;
  email: string;
  website: string;
  posts: string;
  followers: string;
  following: string;
};

const DEFAULT_PROFILE: Profile = {
  username: "mishapetrick",
  name: "Petrick Animation Co.",
  email: "hello@petrick.ru",
  website: "petrick.ru",
  posts: "60",
  followers: "11,1k",
  following: "569",
};

const STORAGE_KEY = "instagram-exe-profile";

const GRID = [post1, post2, post3, post4, post5, avatarImg, post3, post1, post4];

function MenuItem({ label }: { label: string }) {
  return (
    <button className="px-2 py-0.5 hover:bg-win-ink hover:text-win-title-fg">
      <span className="underline">{label.charAt(0)}</span>
      {label.slice(1)}
    </button>
  );
}

function TitleButton({ glyph }: { glyph: string }) {
  return (
    <span className="win-btn flex h-5 w-5 items-center justify-center text-[11px] leading-none font-bold">
      {glyph}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="w-24 shrink-0">{label}</span>
      <input
        className="win-in w-full px-1 py-0.5 text-[13px] outline-none"
        value={value}
        maxLength={60}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function InstagramExe() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [draft, setDraft] = useState<Profile>(DEFAULT_PROFILE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<"grid" | "list">("grid");
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = { ...DEFAULT_PROFILE, ...JSON.parse(saved) } as Profile;
        setProfile(parsed);
        setDraft(parsed);
      } catch {
        /* ignore corrupt data */
      }
    }
  }, []);

  const save = () => {
    const clean: Profile = {
      ...draft,
      username: draft.username.trim().replace(/^@/, "").slice(0, 30) || DEFAULT_PROFILE.username,
    };
    setProfile(clean);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    setDialogOpen(false);
  };

  return (
    <main
      className="flex min-h-screen justify-center bg-win-ink p-2 font-win text-win-ink sm:p-6"
      style={{ fontFamily: "var(--font-win)" }}
    >
      <div className="win-out w-full max-w-[420px] p-[3px]">
        {/* Title bar */}
        <div className="win-titlebar flex items-center justify-between px-1 py-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center border border-win-title-fg text-[9px] font-bold">
              ◉
            </span>
            <h1 className="text-[15px] font-bold tracking-tight">Instagram.exe</h1>
          </div>
          <div className="flex gap-[2px]">
            <TitleButton glyph="_" />
            <TitleButton glyph="□" />
            <TitleButton glyph="✕" />
          </div>
        </div>

        {/* Menu bar */}
        <div className="flex gap-1 px-1 py-1 text-[13px]">
          {["File", "Edit", "View", "Options", "Help"].map((m) => (
            <MenuItem key={m} label={m} />
          ))}
        </div>

        {/* Handle header */}
        <div className="border-y-2 border-t-[var(--win-face-dark)] border-b-[var(--win-face-light)] py-2 text-center text-[16px] font-bold">
          {profile.username}
        </div>

        {/* Profile block */}
        <div className="px-3 py-3">
          <div className="flex items-start gap-3">
            <img
              src={avatarImg}
              alt={`${profile.username} profile picture`}
              width={512}
              height={512}
              className="pixelated h-[92px] w-[92px] shrink-0 rounded-full border-2 border-[var(--win-face-darker)] object-cover"
            />
            <div className="w-full">
              <div className="grid grid-cols-3 text-center text-[13px]">
                {[
                  ["posts", profile.posts],
                  ["followers", profile.followers],
                  ["following", profile.following],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[15px] font-bold">{value}</div>
                    <div>{label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-1">
                <button
                  onClick={() => setFollowing((f) => !f)}
                  className="win-btn flex-1 py-1.5 text-[14px]"
                >
                  {following ? "Following" : "+ Follow"}
                </button>
                <button
                  onClick={() => {
                    setDraft(profile);
                    setDialogOpen(true);
                  }}
                  className="win-btn w-10 py-1.5 text-[11px]"
                  aria-label="Edit profile"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 text-[14px] leading-snug">
            <p className="font-bold">{profile.name}</p>
            <p>{profile.email}</p>
            <p>{profile.website}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-t-2 border-[var(--win-face-dark)] px-2 py-2">
          <button
            onClick={() => setTab("grid")}
            className={`win-btn flex-1 py-2 text-[13px] ${tab === "grid" ? "win-in" : ""}`}
          >
            ⠿
          </button>
          <button
            onClick={() => setTab("list")}
            className={`win-btn flex-1 py-2 text-[13px] ${tab === "list" ? "win-in" : ""}`}
          >
            ☰
          </button>
          <button className="win-btn flex-1 py-2 text-[13px]">◎</button>
          <button className="win-btn flex-1 py-2 text-[13px]">☺</button>
        </div>

        {/* Content */}
        <div className="win-in mx-2 mb-2 max-h-[430px] overflow-y-auto p-[2px]">
          {tab === "grid" ? (
            <div className="grid grid-cols-3 gap-[2px]">
              {GRID.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Post ${i + 1}`}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="pixelated aspect-square w-full object-cover"
                />
              ))}
            </div>
          ) : (
            <ul className="divide-y-2 divide-[var(--win-face)] bg-[var(--win-face-light)]">
              {GRID.slice(0, 5).map((src, i) => (
                <li key={i} className="flex items-center gap-2 p-2">
                  <img
                    src={src}
                    alt={`Post ${i + 1}`}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="pixelated h-14 w-14 object-cover"
                  />
                  <div className="text-[13px]">
                    <p className="font-bold">@{profile.username}</p>
                    <p>Post #{i + 1} — 1998</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex gap-1 border-t-2 border-[var(--win-face-dark)] p-2">
          {["⌂", "🔍", "▣", "♥", "☻"].map((icon, i) => (
            <button
              key={icon}
              className={`flex-1 py-2 text-[15px] ${i === 4 ? "win-in" : "win-btn"}`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Edit dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0_0_0/0.5)] p-3">
          <div className="win-out w-full max-w-[380px] p-[3px]">
            <div className="win-titlebar flex items-center justify-between px-1 py-0.5">
              <h2 className="text-[14px] font-bold">Account Properties</h2>
              <button onClick={() => setDialogOpen(false)}>
                <TitleButton glyph="✕" />
              </button>
            </div>
            <div className="space-y-2 p-3">
              <Field
                label="Instagram ID"
                value={draft.username}
                onChange={(v) => setDraft({ ...draft, username: v })}
              />
              <Field
                label="Display name"
                value={draft.name}
                onChange={(v) => setDraft({ ...draft, name: v })}
              />
              <Field
                label="Email"
                value={draft.email}
                onChange={(v) => setDraft({ ...draft, email: v })}
              />
              <Field
                label="Website"
                value={draft.website}
                onChange={(v) => setDraft({ ...draft, website: v })}
              />
              <Field
                label="Posts"
                value={draft.posts}
                onChange={(v) => setDraft({ ...draft, posts: v })}
              />
              <Field
                label="Followers"
                value={draft.followers}
                onChange={(v) => setDraft({ ...draft, followers: v })}
              />
              <Field
                label="Following"
                value={draft.following}
                onChange={(v) => setDraft({ ...draft, following: v })}
              />
              <p className="pt-1 text-[12px] leading-snug">
                Tip: open instagram.com/{draft.username.replace(/^@/, "") || "yourname"} and copy
                your real counts in here.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={save} className="win-btn px-4 py-1 text-[13px]">
                  OK
                </button>
                <button
                  onClick={() => setDialogOpen(false)}
                  className="win-btn px-4 py-1 text-[13px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
