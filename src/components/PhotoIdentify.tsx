"use client";

import { useRef, useState } from "react";
import Spinner from "@/components/Spinner";
import { classifyPredictions, type Prediction } from "@/lib/vision";
import type { AnimalType } from "@/lib/triage";

type Status = "idle" | "loading-model" | "classifying" | "done" | "error";

// Cache the pipeline across uses so the model only downloads once per session.
let classifierPromise: Promise<
  (input: string, opts: { top_k: number }) => Promise<Prediction[]>
> | null = null;

async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const pipe = await pipeline(
        "image-classification",
        "Xenova/vit-base-patch16-224"
      );
      return (input: string, opts: { top_k: number }) =>
        pipe(input, opts) as Promise<Prediction[]>;
    })();
  }
  return classifierPromise;
}

export default function PhotoIdentify({
  onIdentify,
}: {
  onIdentify: (animal: AnimalType | null, hint: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    setMessage("");

    try {
      setStatus((s) => (classifierPromise ? "classifying" : "loading-model"));
      const classifier = await getClassifier();
      setStatus("classifying");

      const preds = await classifier(url, { top_k: 5 });
      const result = classifyPredictions(preds);

      setStatus("done");
      if (result.animal) {
        setMessage(
          `Looks like a ${result.topLabel}. We'll start you off as "${result.animal}" — you can change it.`
        );
      } else {
        setMessage(
          `Our best guess was "${result.topLabel}", but we're not confident. Please pick the animal type yourself.`
        );
      }
      onIdentify(result.animal, result.topLabel);
    } catch {
      setStatus("error");
      setMessage(
        "Couldn't analyze that photo. You can pick the animal type manually instead."
      );
    }
  }

  const busy = status === "loading-model" || status === "classifying";

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <input
        ref={inputRef}
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

      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-6 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {status === "idle" && "📷 Take or choose a photo"}
        {status === "loading-model" && <Spinner label="Loading model…" />}
        {status === "classifying" && <Spinner label="Looking…" />}
        {(status === "done" || status === "error") && "Try another photo"}
      </button>

      {status === "loading-model" && (
        <p className="mt-3 text-sm text-zinc-500">
          Downloading the vision model (first time only, ~90&nbsp;MB). It runs
          entirely on your device — no photo is uploaded.
        </p>
      )}

      {message && <p className="mt-3 text-sm text-zinc-700">{message}</p>}
    </div>
  );
}
