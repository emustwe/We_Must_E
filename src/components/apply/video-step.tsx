"use client";

import { Camera, CheckCircle2, Circle, RotateCcw, Square, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { confirmVideo, createVideoUpload } from "@/actions/apply";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { clientEnv } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { ApplyView } from "@/server/public-application";

export type VideoView = Extract<ApplyView, { stage: "video" }>;
type VideoMime = "video/webm" | "video/mp4" | "video/quicktime";
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

// Length of a video file, read by the browser (0 if it can't tell).
function videoSeconds(url: string) {
  return new Promise<number>((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : 0);
    v.onerror = () => resolve(0);
    v.src = url;
  });
}
type Question = { id: string; prompt: string; maxSeconds: number };

// Recording format: MP4 (H.264) first, because it plays everywhere, including
// iPhones and Safari, and knows its own length. WebM is the fallback.
function pickFormat() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    { type: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", mime: "video/mp4" as const },
    { type: "video/mp4;codecs=avc1,mp4a", mime: "video/mp4" as const },
    { type: "video/mp4", mime: "video/mp4" as const },
    { type: "video/webm;codecs=vp9,opus", mime: "video/webm" as const },
    { type: "video/webm;codecs=vp8,opus", mime: "video/webm" as const },
    { type: "video/webm", mime: "video/webm" as const },
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c.type)) ?? null;
}

let cachedFormat: ReturnType<typeof pickFormat> | undefined;
const getFormat = () => (cachedFormat === undefined ? (cachedFormat = pickFormat()) : cachedFormat);
const noSubscribe = () => () => {};

// PUT to the signed upload URL with progress (fetch has no upload progress).
export function uploadWithProgress(url: string, blob: Blob, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", blob);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("apikey", clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    xhr.upload.onprogress = (e) =>
      e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(body);
  });
}

// Task, no video questions: one video about the test's questions.
export function OneVideo({
  jobId,
  view,
  stream,
  onStream,
  onRecorded,
}: {
  jobId: string;
  view: VideoView;
  stream: MediaStream | null;
  onStream: (stream: MediaStream) => void;
  onRecorded: () => void;
}) {
  const t = useTranslations("apply");
  const [recorded, setRecorded] = useState(view.recorded);
  if (recorded) {
    return (
      <div>
        <p className="flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold">
          <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
          {t("videoSaved")}
        </p>
        <PromptList prompts={view.prompts} />
        <Button
          size="touch"
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => setRecorded(false)}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("retake")}
        </Button>
      </div>
    );
  }
  return (
    <Recorder
      jobId={jobId}
      compact
      question={{ id: "answer", prompt: "", maxSeconds: view.maxSeconds }}
      header={
        <>
          <p className="text-sm text-muted-foreground">
            {t("oneVideoBody", { time: `${Math.floor(view.maxSeconds / 60)}:00` })}
          </p>
          <PromptList prompts={view.prompts} />
        </>
      }
      stream={stream}
      onStream={onStream}
      onDone={() => {
        setRecorded(true);
        onRecorded();
      }}
    />
  );
}

// The questions to answer, all in the same video.
function PromptList({ prompts }: { prompts: string[] }) {
  return (
    <ol className="mt-4 space-y-2">
      {prompts.map((prompt, i) => (
        <li key={i} className="flex gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm font-semibold">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            {i + 1}
          </span>
          <span>{prompt}</span>
        </li>
      ))}
    </ol>
  );
}

type Phase = "camera" | "ready" | "countdown" | "recording" | "review" | "uploading";

export function Recorder({
  jobId,
  question,
  questionId,
  header,
  stream,
  onStream,
  onDone,
  compact = false,
}: {
  jobId: string;
  question: Question;
  // The video question this answers (none: the one video about the test).
  questionId?: string;
  header: React.ReactNode;
  stream: MediaStream | null;
  onStream: (stream: MediaStream) => void;
  onDone: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("apply");
  const te = useTranslations("errors");
  const [phase, setPhase] = useState<Phase>(stream ? "ready" : "camera");
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<{
    blob: Blob;
    url: string;
    seconds: number;
    mime: VideoMime;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const live = useRef<HTMLVideoElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);
  // undefined while rendering on the server, null if this browser can't record.
  const format = useSyncExternalStore(noSubscribe, getFormat, () => undefined);

  useEffect(() => {
    if (live.current && stream) live.current.srcObject = stream;
  }, [stream, phase]);

  useEffect(
    () => () => {
      if (clip) URL.revokeObjectURL(clip.url);
    },
    [clip],
  );

  async function enableCamera() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
        },
        audio: true,
      });
      onStream(s);
      setPhase("ready");
    } catch {
      setError(te("cameraBlocked"));
    }
  }

  function begin() {
    setPhase("countdown");
    setCount(3);
    let n = 3;
    const id = window.setInterval(() => {
      n -= 1;
      setCount(n);
      if (n === 0) {
        window.clearInterval(id);
        record();
      }
    }, 1000);
  }

  function record() {
    const fmt = format;
    if (!stream || !fmt) return;
    // The camera can be taken by another app; ask for it again if so.
    if (stream.getTracks().some((track) => track.readyState !== "live")) {
      setPhase("camera");
      setError(t("cameraLost"));
      return;
    }
    const chunks: Blob[] = [];
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, { mimeType: fmt.type, videoBitsPerSecond: 1_500_000 });
    } catch {
      setPhase("ready");
      setError(t("recordingFailed"));
      return;
    }
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onerror = () => setError(t("recordingFailed"));
    rec.onstop = () => {
      const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      // Upload with the plain type (no codecs) so storage accepts it.
      const blob = new Blob(chunks, { type: fmt.mime });
      // Nothing (or almost nothing) captured: say so instead of showing an empty video.
      if (blob.size < 2048) {
        setPhase("ready");
        setError(t("recordingFailed"));
        return;
      }
      setClip({ blob, url: URL.createObjectURL(blob), seconds, mime: fmt.mime });
      setPhase("review");
    };
    recorder.current = rec;
    startedAt.current = Date.now();
    setElapsed(0);
    setError(null);
    rec.start(500);
    setPhase("recording");
  }

  // Timer and auto-stop at the question's limit.
  useEffect(() => {
    if (phase !== "recording") return;
    const id = window.setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(s);
      if (s >= question.maxSeconds) recorder.current?.stop();
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, question.maxSeconds]);

  // A video chosen from the phone instead of recording here.
  async function pickFile(file: File) {
    setError(null);
    const mime = (["video/webm", "video/mp4", "video/quicktime"] as const).find(
      (m) => m === file.type,
    );
    if (!mime) return setError(t("fileType"));
    if (file.size > MAX_VIDEO_BYTES) return setError(t("fileTooLong"));
    const url = URL.createObjectURL(file);
    const seconds = Math.round(await videoSeconds(url));
    if (seconds > question.maxSeconds + 5) {
      URL.revokeObjectURL(url);
      return setError(t("videoTooLong", { seconds: question.maxSeconds }));
    }
    setClip({ blob: file, url, seconds: Math.max(1, seconds), mime });
    setPhase("review");
  }

  async function upload() {
    if (!clip) return;
    setError(null);
    setPhase("uploading");
    setProgress(0);
    try {
      const target = await createVideoUpload({ jobId, mime: clip.mime, questionId });
      if (!target.ok) throw new Error(target.error);
      await uploadWithProgress(target.data.signedUrl, clip.blob, setProgress);
      const confirmed = await confirmVideo({
        jobId,
        path: target.data.path,
        durationSeconds: Math.min(clip.seconds, question.maxSeconds),
      });
      if (!confirmed.ok) throw new Error(confirmed.error);
      onDone();
    } catch (e) {
      const key = e instanceof Error ? e.message : "";
      setError(
        ["rateLimited", "sessionExpired", "invalidFile"].includes(key)
          ? te(key as "invalidFile")
          : t("uploadFailed"),
      );
      setPhase("review");
    }
  }

  const remaining = Math.max(0, question.maxSeconds - elapsed);

  return (
    <div className={cn("flex flex-col", !compact && "flex-1")}>
      {header}

      <div className="relative mt-4 aspect-[3/4] overflow-hidden rounded-[1.75rem] bg-foreground/90 sm:aspect-video">
        {phase === "review" || phase === "uploading" ? (
          <video src={clip?.url} controls playsInline className="size-full object-cover" />
        ) : stream ? (
          <video
            ref={live}
            autoPlay
            muted
            playsInline
            className="size-full -scale-x-100 object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-background">
            <Camera className="size-10" aria-hidden="true" />
            <p className="text-sm">{t("cameraHint")}</p>
          </div>
        )}
        {phase === "countdown" ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/40"
            aria-live="assertive"
          >
            <span className="text-7xl font-extrabold text-white">{count}</span>
            <span className="sr-only">{t("countdown", { n: count })}</span>
          </div>
        ) : null}
        {phase === "recording" ? (
          <p
            className="absolute start-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-sm font-bold text-white tabular-nums"
            aria-live="off"
          >
            <span className="size-2.5 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
            {t("recording")} {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </p>
        ) : null}
        {phase === "uploading" ? (
          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-3 text-white">
            <p className="text-sm font-semibold" aria-live="polite">
              {t("uploading", { percent: progress })}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/30">
              <div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      {phase === "review" && clip ? (
        <p className="mt-3 rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium" role="status">
          {t("recordedHint", {
            time: `${Math.floor(clip.seconds / 60)}:${String(clip.seconds % 60).padStart(2, "0")}`,
          })}
        </p>
      ) : null}
      <div className={cn("space-y-3", compact ? "pt-4" : "mt-auto pt-6")}>
        <FormAlert message={error} />
        {format === null && (phase === "camera" || phase === "ready") ? (
          <FormAlert message={t("noCamera")} />
        ) : null}
        <input
          ref={fileInput}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="sr-only"
          aria-label={t("uploadVideo")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pickFile(file);
            e.target.value = "";
          }}
        />
        {phase === "camera" && format !== null ? (
          <Button size="touch" className="w-full" onClick={enableCamera}>
            <Camera className="size-4" aria-hidden="true" />
            {t("cameraOn")}
          </Button>
        ) : null}
        {phase === "ready" && format !== null ? (
          <Button size="touch" className="w-full" onClick={begin}>
            <Circle className="size-4 fill-current text-red-500" aria-hidden="true" />
            {t("record")}
          </Button>
        ) : null}
        {phase === "camera" || phase === "ready" ? (
          <Button
            size="touch"
            variant="secondary"
            className="w-full"
            onClick={() => fileInput.current?.click()}
          >
            <Upload className="size-4" aria-hidden="true" />
            {t("uploadVideo")}
          </Button>
        ) : null}
        {phase === "recording" ? (
          <Button
            size="touch"
            variant="destructive"
            className="w-full"
            onClick={() => recorder.current?.stop()}
          >
            <Square className="size-4 fill-current" aria-hidden="true" />
            {t("stop")}
          </Button>
        ) : null}
        {phase === "review" || phase === "uploading" ? (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="touch"
              disabled={phase === "uploading"}
              onClick={() => {
                setClip(null);
                setPhase(stream ? "ready" : "camera");
              }}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {t("retake")}
            </Button>
            <Button
              size="touch"
              className={cn("flex-1")}
              disabled={phase === "uploading"}
              onClick={upload}
            >
              {error ? t("tryAgain") : t("useVideo")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
