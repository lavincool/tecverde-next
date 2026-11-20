"use client";

import { Camera, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { media } from "@/messages/es-MX/media";

import { createUploadIntent } from "../actions";
import { PhotoDecodeError, preparePhoto } from "../client/compress";
import { uploadWithRetry } from "../client/upload";

import type { UploadIntentInput } from "../actions";
import type { PreparedPhoto } from "../client/compress";
import type { ChangeEvent } from "react";

const copy = media.picker;

type Item = {
  localId: string;
  previewUrl: string;
  status: "preparing" | "uploading" | "done" | "error";
  progress: number;
  mediaId?: string;
  error?: string;
};

type Target =
  | { scope: "report" | "pet"; draftToken: string | undefined }
  | { scope: "report_after"; reportId: string }
  | { scope: "pet_staff"; petId: string };

export function PhotoPicker({
  target,
  max,
  name = "mediaIds",
  onBusyChange,
}: {
  target: Target;
  max: number;
  name?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputId = useId();
  const hintId = useId();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string>();
  const counter = useRef(0);
  const ready =
    target.scope !== "report" && target.scope !== "pet" ? true : Boolean(target.draftToken);
  const busy = items.some((item) => item.status === "preparing" || item.status === "uploading");

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(
    () => () => {
      for (const item of items) URL.revokeObjectURL(item.previewUrl);
    },
    // Revoke previews only when the picker unmounts.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function update(localId: string, patch: Partial<Item>) {
    setItems((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    );
  }

  function intentFor(photos: PreparedPhoto[]): UploadIntentInput {
    const files = photos.map((photo) => ({
      contentType: "image/webp" as const,
      size: photo.blob.size,
      width: photo.width,
      height: photo.height,
      dominantColor: photo.dominantColor,
    }));
    if (target.scope === "report_after")
      return { scope: target.scope, reportId: target.reportId, files };
    if (target.scope === "pet_staff") return { scope: target.scope, petId: target.petId, files };
    return { scope: target.scope, draftToken: target.draftToken ?? "", files };
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = [...(event.currentTarget.files ?? [])].slice(0, max - items.length);
    event.currentTarget.value = "";
    if (selected.length === 0) return;
    setError(undefined);

    const added: Item[] = selected.map((file) => {
      counter.current += 1;
      return {
        localId: `photo-${counter.current}`,
        previewUrl: URL.createObjectURL(file),
        status: "preparing",
        progress: 0,
      };
    });
    setItems((current) => [...current, ...added]);

    const prepared = await Promise.all(
      selected.map(
        async (file, index): Promise<{ item: Item; photo: PreparedPhoto } | undefined> => {
          const item = added[index];
          if (!item) return undefined;
          try {
            return { item, photo: await preparePhoto(file) };
          } catch (caught) {
            update(item.localId, {
              status: "error",
              error: caught instanceof PhotoDecodeError ? media.errors.decode : media.errors.upload,
            });
            return undefined;
          }
        },
      ),
    );
    const usable = prepared.filter((entry) => entry !== undefined);
    if (usable.length === 0) return;

    const intent = await createUploadIntent(intentFor(usable.map((entry) => entry.photo)));
    if (!intent.ok) {
      setError(intent.error);
      for (const entry of usable)
        update(entry.item.localId, { status: "error", error: intent.error });
      return;
    }

    await Promise.all(
      usable.map(async (entry, index) => {
        const ticket = intent.tickets[index];
        if (!ticket) return;
        update(entry.item.localId, { status: "uploading", mediaId: ticket.mediaId });
        try {
          await uploadWithRetry(ticket, entry.photo.blob, (fraction) =>
            update(entry.item.localId, { progress: Math.round(fraction * 100) }),
          );
          update(entry.item.localId, { status: "done", progress: 100 });
        } catch {
          update(entry.item.localId, { status: "error", error: media.errors.upload });
        }
      }),
    );
  }

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      void handleFiles(event);
    },
    // handleFiles reads the latest props and state on every call.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [items, target, max],
  );

  function remove(localId: string) {
    setItems((current) => {
      const item = current.find((entry) => entry.localId === localId);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((entry) => entry.localId !== localId);
    });
  }

  const remaining = max - items.length;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="report-field" htmlFor={inputId}>
          {copy.label}
        </label>
        <span className="font-mono text-xs text-muted">{copy.count(items.length, max)}</span>
      </div>
      <p id={hintId} className="text-sm text-muted">
        {copy.hint(max)}
      </p>
      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((item, index) => (
            <li
              className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-panel"
              key={item.localId}
            >
              {/* oxlint-disable-next-line nextjs/no-img-element -- local object URL preview. */}
              <img
                alt={copy.photoAlt(index + 1)}
                className="size-full object-cover"
                src={item.previewUrl}
              />
              <span className="absolute inset-x-1 bottom-1 rounded-full bg-background/85 px-2 py-0.5 text-center text-xs">
                {item.status === "preparing" && copy.preparing}
                {item.status === "uploading" && copy.uploading(item.progress)}
                {item.status === "done" && copy.uploaded}
                {item.status === "error" && item.error}
              </span>
              <button
                aria-label={copy.removeLabel(index + 1)}
                className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-background/90"
                onClick={() => remove(item.localId)}
                type="button"
              >
                <X aria-hidden="true" size={16} />
              </button>
              {item.status === "done" && item.mediaId && (
                <input name={name} type="hidden" value={item.mediaId} />
              )}
            </li>
          ))}
        </ul>
      )}
      {remaining > 0 && (
        <label
          className="button button--secondary justify-self-start"
          aria-disabled={!ready}
          htmlFor={inputId}
        >
          <Camera aria-hidden="true" size={16} />
          {copy.takePhoto}
        </label>
      )}
      <input
        accept="image/*"
        aria-describedby={hintId}
        className="sr-only"
        disabled={!ready || remaining <= 0}
        id={inputId}
        multiple
        onChange={handleChange}
        type="file"
      />
      <output aria-live="polite" className="report-error text-sm">
        {error}
      </output>
    </div>
  );
}
