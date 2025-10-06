// app/dev/magic-test/page.tsx
"use client";

import * as React from "react";

import { api } from "~/trpc/react";

type GenResult = { token: string; magicUrl?: string } | null;

export default function MagicTestPage() {
  const [roomId, setRoomId] = React.useState<number>(1);
  const [judgeId, setJudgeId] = React.useState<number>(1);
  const [gen, setGen] = React.useState<GenResult>(null);
  const [status, setStatus] = React.useState<string>("Idle");
  const [hasCookie, setHasCookie] = React.useState<boolean>(false);

  // We’ll call the generateToken *query* imperatively via utils
  const utils = api.useUtils();
  const activate = api.judge.activateToken.useMutation({
    onMutate: () => setStatus("Activating…"),
    onSuccess: async () => {
      setStatus("Activated. Checking cookie…");
      await checkCookie();
    },
    onError: (err) => setStatus(`Activation error: ${err.message}`),
  });

  async function generate() {
    setStatus("Generating token…");
    try {
      // judge.generateToken is a query; call it via utils.fetch
      const res = await utils.judge.generateToken.fetch({
        roomId,
      });
      setGen(res as any);
      setStatus("Token generated.");
    } catch (e: any) {
      setStatus(`Generate error: ${e.message ?? "unknown"}`);
    }
  }

  async function activateNow() {
    if (!gen?.token) {
      setStatus("No token yet. Generate first.");
      return;
    }
    activate.mutate({ token: gen.token });
  }

  async function checkCookie() {
    try {
      const r = await fetch("/api/debug/session", { cache: "no-store" });
      const j = (await r.json()) as { hasSessionCookie: boolean };
      setHasCookie(j.hasSessionCookie);
      setStatus(
        j.hasSessionCookie
          ? "Session cookie is present."
          : "No session cookie found.",
      );
    } catch (e: any) {
      setStatus(`Cookie check failed: ${e.message ?? "unknown"}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">
        Judge Magic Link — Test Harness
      </h1>

      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="block text-sm text-gray-600">roomId</span>
          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            value={roomId}
            onChange={(e) => setRoomId(Number(e.target.value))}
          />
        </label>

        <label className="space-y-1">
          <span className="block text-sm text-gray-600">judgeId</span>
          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            value={judgeId}
            onChange={(e) => setJudgeId(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={generate}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          disabled={activate.isPending}
        >
          1) Generate Token
        </button>

        <button
          onClick={activateNow}
          className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={!gen?.token || activate.isPending}
        >
          2) Activate (sets cookie)
        </button>

        <button onClick={checkCookie} className="rounded bg-gray-200 px-4 py-2">
          3) Check Cookie
        </button>
      </div>

      <div className="space-y-2 rounded border p-4">
        <div className="text-sm text-gray-600">Status</div>
        <div className="font-mono text-sm">{status}</div>
      </div>

      <div className="space-y-2 rounded border p-4">
        <div className="text-sm text-gray-600">Has Session Cookie?</div>
        <div className="font-mono">{hasCookie ? "✅ yes" : "❌ no"}</div>
      </div>

      <div className="space-y-2 rounded border p-4">
        <div className="text-sm text-gray-600">Generated Token</div>
        <code className="block overflow-x-auto rounded bg-gray-50 p-3 text-xs">
          {gen?.token ?? "(none)"}
        </code>
      </div>

      <div className="space-y-2 rounded border p-4">
        <div className="text-sm text-gray-600">Magic URL</div>
        {gen?.magicUrl ? (
          <a
            href={gen.magicUrl}
            className="text-indigo-600 underline"
            target="_blank"
            rel="noreferrer"
          >
            {gen.magicUrl}
          </a>
        ) : (
          <span className="text-sm text-gray-500">(none)</span>
        )}
        <p className="text-xs text-gray-500">
          Opening the magic URL should hit your activate route; if your activate
          procedure sets the cookie server-side, clicking it then pressing
          “Check Cookie” should show ✅.
        </p>
      </div>
    </div>
  );
}
