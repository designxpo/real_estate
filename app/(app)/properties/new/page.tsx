"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPropertyPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const photosRaw = String(fd.get("photos") || "").trim();
    const amenitiesRaw = String(fd.get("amenities") || "").trim();

    const payload = {
      title: fd.get("title"),
      description: fd.get("description") || undefined,
      listingType: fd.get("listingType"),
      propertyType: fd.get("propertyType"),
      bhk: fd.get("bhk") ? Number(fd.get("bhk")) : undefined,
      carpetSqft: fd.get("carpetSqft") ? Number(fd.get("carpetSqft")) : undefined,
      priceAmount: Number(fd.get("priceAmount")),
      priceUnit: fd.get("priceUnit"),
      city: fd.get("city"),
      locality: fd.get("locality") || undefined,
      state: fd.get("state") || undefined,
      pincode: fd.get("pincode") || undefined,
      furnishing: fd.get("furnishing") || undefined,
      facing: fd.get("facing") || undefined,
      status: fd.get("status"),
      negotiable: fd.get("negotiable") === "on",
      amenities: amenitiesRaw ? amenitiesRaw.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      photos: photosRaw
        ? photosRaw
            .split(/\s+/)
            .filter(Boolean)
            .map((url) => ({ url }))
        : undefined,
    };

    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Could not create property");
      return;
    }
    const j = await res.json();
    router.push(`/properties/${j.property.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">New property</h1>
      {err && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{err}</div>
      )}
      <form onSubmit={onSubmit} className="bg-surface rounded-lg border border-line p-4 sm:p-6 space-y-4">
        <Field label="Title" name="title" required placeholder="3 BHK Apartment in Koramangala" />
        <Field label="Description" name="description" textarea placeholder="Highlights, condition, why it's great…" />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Listing type" name="listingType" required>
            <option value="sale">Sale</option>
            <option value="rent">Rent</option>
            <option value="pg">PG</option>
            <option value="commercial_lease">Commercial lease</option>
          </Select>
          <Select label="Property type" name="propertyType" required>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="plot">Plot</option>
            <option value="office">Office</option>
            <option value="shop">Shop</option>
            <option value="warehouse">Warehouse</option>
            <option value="other">Other</option>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="BHK" name="bhk" type="number" />
          <Field label="Carpet (sqft)" name="carpetSqft" type="number" />
          <Field label="Floor" name="floor" type="number" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Price" name="priceAmount" type="number" step="0.01" required />
          <Select label="Unit" name="priceUnit" required>
            <option value="lakh">Lakh</option>
            <option value="crore">Crore</option>
            <option value="per_month">Per month</option>
            <option value="per_sqft">Per sqft</option>
          </Select>
          <label className="block">
            <span className="text-sm font-medium text-ink invisible">.</span>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="negotiable" defaultChecked />
              Negotiable
            </label>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Locality" name="locality" placeholder="Koramangala 5th Block" />
          <Field label="City" name="city" required placeholder="Bengaluru" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="State" name="state" />
          <Field label="Pincode" name="pincode" pattern="\d{6}" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Furnishing" name="furnishing">
            <option value="">—</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi">Semi-furnished</option>
            <option value="fully">Fully furnished</option>
          </Select>
          <Field label="Facing" name="facing" placeholder="East / North / …" />
        </div>

        <Field
          label="Amenities (comma-separated)"
          name="amenities"
          placeholder="Pool, Gym, Clubhouse, Power Backup"
        />

        <Field
          label="Photo URLs (one per line / whitespace-separated)"
          name="photos"
          textarea
          placeholder="https://… https://…"
        />

        <Select label="Status" name="status" required>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="under_offer">Under offer</option>
          <option value="closed">Closed</option>
          <option value="withdrawn">Withdrawn</option>
        </Select>

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand text-white px-4 py-2 font-medium disabled:opacity-50"
        >
          {busy ? "Saving…" : "Create property"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  textarea,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  textarea?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          rows={3}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
      ) : (
        <input
          name={name}
          type={type}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
      )}
    </label>
  );
}

function Select({
  label,
  name,
  children,
  required,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <select
        name={name}
        required={required}
        className="mt-1 w-full rounded-md border border-line px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-brand-accent"
      >
        {children}
      </select>
    </label>
  );
}
