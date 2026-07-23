"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CasinoLayout } from "@/components/casino/CasinoLayout";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-wallet";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { data: wallet } = useWallet();
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  const { data: profile, refetch } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (data) {
        setUsername(data.username ?? "");
        setCountry(data.country ?? "");
      }
      return data;
    },
  });

  const { data: logins } = useQuery({
    queryKey: ["login_activity", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("login_activity")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const queryClient = useQueryClient();
  const [claimCode, setClaimCode] = useState("");
  const [claimMsg, setClaimMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: referralData } = useQuery({
    queryKey: ["referrals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return null;
      const res = await fetch(`${API_BASE}/referrals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (code: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_BASE}/referrals/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to claim code");
      return json;
    },
    onSuccess: () => {
      setClaimMsg({ ok: true, text: "Referral code claimed! Referrer earned a bonus." });
      setClaimCode("");
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
    },
    onError: (e: Error) => {
      setClaimMsg({ ok: false, text: e.message });
    },
  });

  async function save() {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ username, country }).eq("id", user.id);
    setSaving(false);
    setSavedAt(Date.now());
    refetch();
  }

  function copyCode() {
    const code = referralData?.referralCode || profile?.referral_code;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  if (!user) return null;

  const referralCode = referralData?.referralCode || profile?.referral_code;

  return (
    <CasinoLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* ── Profile card ── */}
        <div className="rounded-3xl p-6 glass-panel">
          <h1 className="font-display text-2xl font-bold mb-1">Profile</h1>
          <div className="text-sm text-muted-foreground mb-5">{user.email}</div>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block text-xs text-muted-foreground mb-1">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-secondary/50 border border-border outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs text-muted-foreground mb-1">Country</span>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-secondary/50 border border-border outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {savedAt && <span className="text-xs text-emerald-400">Saved.</span>}
            <button
              onClick={() => signOut().then(() => router.push("/"))}
              className="ml-auto h-10 px-4 rounded-xl bg-secondary text-foreground text-sm"
            >
              Sign out
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground">Balance</div>
              <div className="font-bold text-[var(--gold)]">
                €{Number(wallet?.balance ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground">KYC</div>
              <div className="font-bold capitalize">{profile?.kyc_status ?? "unverified"}</div>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="font-bold">{profile?.is_suspended ? "Suspended" : "Active"}</div>
            </div>
          </div>
        </div>

        {/* ── Referral section ── */}
        <div className="rounded-3xl p-6 glass-panel space-y-5">
          <h2 className="font-display text-lg font-bold">Referrals</h2>

          <div>
            <div className="text-xs text-muted-foreground mb-2">Your referral code</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-11 px-4 rounded-xl bg-secondary/60 border border-border flex items-center font-mono font-bold tracking-widest text-[var(--gold)] select-all">
                {referralCode ?? "Loading…"}
              </div>
              <button
                id="copy-referral-btn"
                onClick={copyCode}
                disabled={!referralCode}
                className="h-11 px-4 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary font-semibold text-sm disabled:opacity-40 transition-colors"
              >
                {codeCopied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Share your code. You earn a €10 bonus for every new player who claims it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground">Total referrals</div>
              <div className="font-bold text-xl mt-0.5">{referralData?.referralsCount ?? 0}</div>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground">Referred by</div>
              <div className="font-bold mt-0.5 truncate">
                {profile?.referred_by ? "Yes ✓" : "—"}
              </div>
            </div>
          </div>

          {!profile?.referred_by && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">
                Claim a friend&apos;s referral code
              </div>
              <div className="flex gap-2">
                <input
                  id="claim-referral-input"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  className="flex-1 h-11 px-4 rounded-xl bg-secondary/50 border border-border outline-none focus:ring-1 focus:ring-primary font-mono uppercase tracking-widest"
                />
                <button
                  id="claim-referral-btn"
                  onClick={() => claimMutation.mutate(claimCode)}
                  disabled={claimCode.length < 6 || claimMutation.isPending}
                  className="h-11 px-4 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
                >
                  {claimMutation.isPending ? "Claiming…" : "Claim"}
                </button>
              </div>
              {claimMsg && (
                <p
                  className={`text-xs mt-1.5 ${claimMsg.ok ? "text-emerald-400" : "text-red-400"}`}
                >
                  {claimMsg.text}
                </p>
              )}
            </div>
          )}

          {(referralData?.referrals ?? []).length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">Referral history</div>
              <div className="space-y-1">
                {referralData.referrals.map((r: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs py-1.5 border-t border-border/40"
                  >
                    <span className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <span className="font-semibold">{r.display_name}</span>
                    <span className="text-[var(--win)] font-mono-tabular">
                      +€{Number(r.reward_amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Recent sign-ins ── */}
        <div className="rounded-3xl p-6 glass-panel">
          <h2 className="font-display text-lg font-bold mb-3">Recent sign-ins</h2>
          <div className="space-y-1 text-sm">
            {(logins ?? []).length === 0 && (
              <div className="text-muted-foreground text-sm">No login activity yet.</div>
            )}
            {(logins ?? []).map((l: any) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 py-2 border-t border-border/40"
              >
                <span className="text-muted-foreground text-xs">
                  {new Date(l.created_at).toLocaleString()}
                </span>
                <span className="text-xs truncate max-w-[40%]">{l.ip ?? "—"}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[50%]">
                  {l.user_agent ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CasinoLayout>
  );
}
