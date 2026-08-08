"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getDeviceId, getAccessToken } from "@/lib/supabase/client";
import { Dashboard as StatsPanel } from "@/components/gallery/Dashboard";

interface Output {
  id: string;
  image_url: string | null;
  caption_text: string | null;
  tts_audio_url: string | null;
  music_url: string | null;
  voice_note_text: string | null;
  export_url: string | null;
  created_at: string;
}

interface Mapping {
  id: string;
  label: string;
  classification: string;
}

interface Session {
  id: string;
  started_at: string;
  feature_summary: { classification?: string };
  outputs: Output[];
}

export default function DashboardPage() {
  const [name, setName] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [mappings, setMappings] = useState<Mapping[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const deviceId = getDeviceId();
    const token = await getAccessToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`/api/profile?deviceId=${deviceId}`, { headers })
      .then((res) => res.json())
      .then((data) => setName(data.displayName ?? null))
      .catch(() => {});

    fetch(`/api/sessions?deviceId=${deviceId}`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setSessions(data.sessions);
      })
      .catch(() => setError("Couldn't load your dashboard right now."));

    fetch(`/api/mappings?deviceId=${deviceId}`, { headers })
      .then((res) => res.json())
      .then((data) => setMappings(data.mappings ?? []))
      .catch(() => setMappings([]));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allOutputs = sessions?.flatMap((s) =>
    s.outputs.map((o) => ({ ...o, classification: s.feature_summary?.classification ?? "unknown" }))
  );

  return (
    <main className="flex-1 px-6 py-10 max-w-4xl mx-auto w-full flex flex-col gap-10">
      {/* Header / greeting */}
      <section className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl tracking-[-0.01em]">
            {name ? `Welcome back, ${name}` : "Your dashboard"}
          </h1>
          <p className="text-ink-soft text-sm mt-1">
            Everything you've made, all in one place.
          </p>
        </div>
        <Link href="/studio">
          <Button size="lg">Enter Studio</Button>
        </Link>
      </section>

      {error && <p className="text-accent-warm text-sm">{error}</p>}

      {/* Stats overview */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-[0.12em] text-ink-faint">Overview</h2>
        <StatsPanel />
      </section>

      {/* Saved styles */}
      {mappings && mappings.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-[0.12em] text-ink-faint">Your saved styles</h2>
          <div className="flex flex-wrap gap-2">
            {mappings.map((m) => (
              <span
                key={m.id}
                className="text-sm bg-accent-calm-soft/50 border border-accent-calm/20 rounded-full px-3 py-1"
              >
                {m.classification} → &ldquo;{m.label}&rdquo;
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Pieces grid */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.12em] text-ink-faint">Your pieces</h2>
          {allOutputs && allOutputs.length > 0 && (
            <span className="text-xs text-ink-faint">{allOutputs.length} total</span>
          )}
        </div>

        {sessions && allOutputs?.length === 0 && (
          <Card className="p-8 flex flex-col items-center gap-3 text-center">
            <p className="text-ink-soft text-sm">
              Nothing captured yet — head into the Studio and try &ldquo;Capture this moment.&rdquo;
            </p>
            <Link href="/studio">
              <Button size="md">Enter Studio</Button>
            </Link>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allOutputs?.map((output) => (
            <motion.div
              key={output.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden h-full flex flex-col">
                {output.image_url && (
                  <div className="relative w-full aspect-square bg-paper">
                    <Image
                      src={output.image_url}
                      alt="Generated artwork"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  {output.caption_text && (
                    <p className="font-display text-sm leading-snug">
                      &ldquo;{output.caption_text}&rdquo;
                    </p>
                  )}
                  {output.music_url && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[0.625rem] uppercase tracking-[0.1em] text-ink-faint">Music</span>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio src={output.music_url} controls className="w-full h-8" />
                    </div>
                  )}
                  {output.tts_audio_url && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[0.625rem] uppercase tracking-[0.1em] text-ink-faint">Reflection</span>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio src={output.tts_audio_url} controls className="w-full h-8" />
                    </div>
                  )}
                  {output.voice_note_text && (
                    <p className="text-xs text-ink-soft italic">
                      &ldquo;{output.voice_note_text}&rdquo; — your note
                    </p>
                  )}
                  {output.export_url && (
                    <a
                      href={output.export_url}
                      download
                      className="text-xs text-accent-calm underline underline-offset-2 w-fit"
                    >
                      Download video
                    </a>
                  )}
                  <p className="text-xs text-ink-faint mt-auto pt-1">
                    {new Date(output.created_at).toLocaleString()} · {output.classification}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}
