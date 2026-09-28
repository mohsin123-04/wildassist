"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Images } from "lucide-react";
import Spinner from "@/components/Spinner";
import SafetyBanner from "@/components/SafetyBanner";
import { classifyPredictions, type Prediction } from "@/lib/vision";
import { dangerForOption, detectDanger, type DangerInfo } from "@/lib/safety";

type Status = "idle" | "loading-model" | "classifying" | "done" | "error";

function notifyDanger(danger: DangerInfo) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  const show = () =>
    new Notification("⚠️ Wildlife safety alert", {
      body: `${danger.label}. ${danger.reason}`,
    });
  if (Notification.permission === "granted") show();
  else if (Notification.permission !== "denied")
    Notification.requestPermission().then((p) => p === "granted" && show());
}

// Cache the pipeline across uses so the model only downloads once per session.
let classifierPromise: Promise<
  (input: string, opts: { top_k: number }) => Promise<Prediction[]>
> | null = null;

async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      // q8 quantized weights: ~4x smaller download, much less likely to stall.
      const pipe = await pipeline(
        "image-classification",
        "Xenova/vit-base-patch16-224",
        { dtype: "q8" }
      );
      return (input: string, opts: { top_k: number }) =>
        pipe(input, opts) as Promise<Prediction[]>;
    })().catch((e) => {
      // Don't cache a failed load, so the next attempt can retry.
      classifierPromise = null;
      throw e;
    });
  }
  return classifierPromise;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

export default function PhotoIdentify({
  onIdentify,
}: {
  onIdentify: (category: string | null, hint: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [danger, setDanger] = useState<DangerInfo | null>(null);

  // Warm up the model as soon as this panel opens, so by the time the user has
  // taken/chosen a photo it's likely already downloaded. Fire-and-forget.
  useEffect(() => {
    getClassifier().catch(() => {});
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    setMessage("");

    try {
      setStatus(classifierPromise ? "classifying" : "loading-model");
      const classifier = await withTimeout(getClassifier(), 45000);
      setStatus("classifying");

      const preds = await withTimeout(classifier(url, { top_k: 5 }), 20000);
      const result = classifyPredictions(preds);

      // Safety check: is this a dangerous animal? (specific option or label)
      const d =
        dangerForOption(result.option) || detectDanger(result.topLabel);
      setDanger(d);
      if (d) notifyDanger(d);

      setStatus("done");
      if (result.category) {
        setMessage(`Looks like a ${result.topLabel}. Taking you to the next step.`);
      } else {
        setMessage(
          `We couldn't confidently identify it. Please pick the animal below.`
        );
      }
      onIdentify(result.category, result.topLabel);
    } catch {
      setStatus("error");
      setMessage(
        "Photo identification is taking too long or isn't available right now. No problem, just pick the animal type below and continue."
      );
    }
  }

  const busy = status === "loading-model" || status === "classifying";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="The animal you photographed"
          className="mb-3 max-h-56 w-full rounded-xl object-cover"
        />
      )}

      {busy ? (
        <button
          disabled
          className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-700 px-6 font-medium text-white shadow-sm disabled:opacity-60"
        >
          {status === "loading-model" ? (
            <Spinner label="Loading model…" />
          ) : (
            <Spinner label="Looking…" />
          )}
        </button>
      ) : status === "done" || status === "error" ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-6 font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
        >
          Try another photo
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => cameraRef.current?.click()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-5 font-medium text-white shadow-sm transition-all hover:bg-emerald-800 active:scale-[0.98]"
          >
            <Camera className="h-4 w-4" aria-hidden />
            Take photo
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white px-5 font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
          >
            <Images className="h-4 w-4" aria-hidden />
            Choose from library
          </button>
        </div>
      )}

      {status === "loading-model" && (
        <p className="mt-3 text-sm text-zinc-500">
          Downloading the vision model (first time only). It runs entirely on
          your device. No photo is uploaded.
        </p>
      )}

      {message && <p className="mt-3 text-sm text-zinc-700">{message}</p>}

      {danger && (
        <div className="mt-3">
          <SafetyBanner danger={danger} />
        </div>
      )}
    </div>
  );
}
