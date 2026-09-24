"use client";

import { Camera, Circle, Loader2, RotateCcw, Square, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { Upload as TusUpload } from "tus-js-client";
import { registerVideo } from "@/actions/onboarding";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { clientEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

type Phase = "idle" | "live" | "countdown" | "recording" | "review" | "uploading";

// Safari records MP4, Chrome/Firefox WebM. ~1 Mbps keeps 90 s under ~12 MB.
function pickFormat() {
  const candidates = [
    { mime: "video/mp4;codecs=avc1,mp4a.40.2", ext: "mp4", type: "video/mp4" },
    { mime: "video/mp4", ext: "mp4", type: "video/mp4" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm", type: "video/webm" },
    { mime: "video/webm", ext: "webm", type: "video/webm" },
  ] as const;
  return (
    candidates.find(
      (c) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime),
    ) ?? null
  );
}

export function VideoRecorder({
  userId,
  promptId,
  maxSeconds,
  onCancel,
}: {
  userId: string;
  promptId: string;
  maxSeconds: number;
  onCancel: () => void;
}) {
  const t = useTranslations("onboarding.video");
  const te = useTranslations("errors");
  const router = useRouter();
  const liveRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const uploadRef = useRef<TusUpload | null>(null);
  const startedAt = useRef(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState<{
    blob: Blob;
    url: string;
    seconds: number;
    ext: string;
    type: string;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };
  useEffect(
    () => () => {
      stopStream();
      uploadRef.current?.abort();
    },
    [],
  );
  useEffect(
    () => () => {
      if (recording) URL.revokeObjectURL(recording.url);
    },
    [recording],
  );

  async function openCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      setPhase("live");
      requestAnimationFrame(() => {
        if (liveRef.current) liveRef.current.srcObject = stream;
      });
    } catch {
      setError(te("cameraBlocked"));
    }
  }

  // The user already tapped "Record" on the question, so open the camera
  // straight away. The idle screen remains as a retry if access fails.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void openCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCountdown() {
    setPhase("countdown");
    setCount(3);
    let n = 3;
    const timer = setInterval(() => {
      n -= 1;
      if (n === 0) {
        clearInterval(timer);
        record();
      } else setCount(n);
    }, 1000);
  }

  function record() {
    const stream = streamRef.current;
    const format = pickFormat();
    if (!stream || !format) return setError(te("cameraBlocked"));
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: format.mime,
      videoBitsPerSecond: 1_000_000,
      audioBitsPerSecond: 64_000,
    });
    recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    recorder.onstop = () => {
      const seconds = Math.max(
        1,
        Math.min(maxSeconds, Math.round((Date.now() - startedAt.current) / 1000)),
      );
      const blob = new Blob(chunks, { type: format.type });
      setRecording({
        blob,
        url: URL.createObjectURL(blob),
        seconds,
        ext: format.ext,
        type: format.type,
      });
      stopStream();
      setPhase("review");
    };
    recorderRef.current = recorder;
    startedAt.current = Date.now();
    recorder.start(1000);
    setElapsed(0);
    setPhase("recording");
  }

  // Tick while recording and stop at the prompt's limit.
  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(secs);
      if (secs >= maxSeconds) recorderRef.current?.stop();
    }, 250);
    return () => clearInterval(timer);
  }, [phase, maxSeconds]);

  async function upload() {
    if (!recording) return;
    setError(null);
    setPhase("uploading");
    setProgress(0);
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return setError(te("sessionExpired"));
    const path = `${userId}/${crypto.randomUUID()}.${recording.ext}`;
    const { Upload } = await import("tus-js-client");

    // Resumable (TUS) upload straight to the private bucket; storage RLS only
    // lets the user write inside their own folder.
    const tus = new Upload(recording.blob, {
      endpoint: `${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 2000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${token}`, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024, // required by Supabase Storage
      metadata: {
        bucketName: "video-resumes",
        objectName: path,
        contentType: recording.type,
        cacheControl: "3600",
      },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onError: () => {
        setError(te("uploadFailed"));
        setPhase("review");
      },
      onSuccess: async () => {
        const result = await registerVideo({ promptId, path, durationSeconds: recording.seconds });
        if (!result.ok) {
          setError(te(result.error));
          setPhase("review");
          return;
        }
        router.refresh();
        onCancel();
      },
    });
    uploadRef.current = tus;
    tus.start();
  }

  function retake() {
    setRecording(null);
    openCamera();
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-foreground sm:aspect-video">
        {phase === "review" || phase === "uploading" ? (
          <video
            src={recording?.url}
            controls
            playsInline
            className="size-full object-cover"
            aria-label={t("preview")}
          />
        ) : (
          <video
            ref={liveRef}
            autoPlay
            muted
            playsInline
            className="size-full -scale-x-100 object-cover"
            aria-hidden="true"
          />
        )}
        {phase === "idle" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-background">
            <Camera className="size-10 opacity-80" aria-hidden="true" />
            <p className="px-6 text-center text-sm opacity-80">{t("tips")}</p>
          </div>
        ) : null}
        {phase === "countdown" ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-foreground/40"
            aria-live="assertive"
          >
            <span className="text-7xl font-extrabold text-background">{count}</span>
            <span className="sr-only">{t("countdown", { count })}</span>
          </div>
        ) : null}
        {phase === "recording" ? (
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-white">
              <Circle className="size-2.5 animate-pulse fill-current" aria-hidden="true" />
              {t("recording")}
            </span>
            <span className="rounded-full bg-foreground/70 px-3 py-1 font-mono text-sm font-bold text-background tabular-nums">
              {elapsed}s / {maxSeconds}s
            </span>
          </div>
        ) : null}
        {phase === "recording" ? (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-background/30">
            <div
              className="h-full bg-destructive transition-[width] duration-200"
              style={{ width: `${Math.min(100, (elapsed / maxSeconds) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>

      <FormAlert message={error} />

      <div className="flex flex-col gap-2.5">
        {phase === "idle" && error ? (
          <Button size="touch" onClick={openCamera}>
            <Camera className="size-4" aria-hidden="true" />
            {t("record")}
          </Button>
        ) : null}
        {phase === "live" ? (
          <Button
            size="touch"
            onClick={startCountdown}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            <Circle className="size-4 fill-current" aria-hidden="true" />
            {t("startRecording")}
          </Button>
        ) : null}
        {phase === "recording" ? (
          <Button size="touch" onClick={() => recorderRef.current?.stop()}>
            <Square className="size-4 fill-current" aria-hidden="true" />
            {t("stop")}
          </Button>
        ) : null}
        {phase === "review" ? (
          <>
            <Button size="touch" onClick={upload}>
              <Upload className="size-4" aria-hidden="true" />
              {error ? t("retry") : t("use")}
            </Button>
            <Button size="touch" variant="secondary" onClick={retake}>
              <RotateCcw className="size-4" aria-hidden="true" />
              {t("retake")}
            </Button>
          </>
        ) : null}
        {phase === "uploading" ? (
          <div className="space-y-2" aria-live="polite">
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="flex items-center justify-center gap-2 text-sm font-semibold">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t("uploading", { percent: progress })}
            </p>
          </div>
        ) : null}
        {phase !== "uploading" ? (
          <Button
            size="touch"
            variant="ghost"
            onClick={() => {
              stopStream();
              onCancel();
            }}
          >
            {t("cancel")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
