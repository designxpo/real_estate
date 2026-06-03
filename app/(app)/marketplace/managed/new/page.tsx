"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputCls =
  "bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink w-full";
const labelCls = "block text-xs text-ink-muted mb-1";

export default function NewManagedListingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const numOrUndef = (k: string) => {
      const v = f.get(k);
      return v ? Number(v) : undefined;
    };
    const body = {
      owner: {
        name: f.get("ownerName"),
        phone: f.get("ownerPhone"),
        email: f.get("ownerEmail") || undefined,
      },
      listing: {
        title: f.get("title"),
        description: f.get("description") || undefined,
        listingType: f.get("listingType"),
        propertyType: f.get("propertyType"),
        bhk: numOrUndef("bhk"),
        carpetSqft: numOrUndef("carpetSqft"),
        priceAmount: numOrUndef("priceAmount"),
        priceUnit: f.get("priceUnit"),
        negotiable: f.get("negotiable") === "on",
        maintenanceAmount: numOrUndef("maintenanceAmount"),
        depositMonths: numOrUndef("depositMonths"),
        addressLine: f.get("addressLine") || undefined,
        locality: f.get("locality") || undefined,
        city: f.get("city"),
        state: f.get("state") || undefined,
        pincode: f.get("pincode") || undefined,
        furnishing: f.get("furnishing") || undefined,
        reraId: f.get("reraId") || undefined,
        status: f.get("goLive") === "on" ? "active" : "draft",
      },
    };

    const res = await fetch("/api/marketplace/managed-listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/marketplace/managed/${data.id}`);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "Invalid request" ? "Please check the required fields." : (data.error ?? "Could not create the listing."));
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/marketplace/managed" className="hover:text-ink">Managed listings</Link>
        <span>/</span>
        <span className="text-ink">New</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">List a property for an owner</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Owner</h2>
          <p className="text-xs text-ink-muted -mt-2">
            We’ll find or create their account by phone. They can log into the owner app with this
            number to watch & edit the listing.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input name="ownerName" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone *</label>
              <input name="ownerPhone" required placeholder="9876543210" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input name="ownerEmail" type="email" className={inputCls} />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Property</h2>
          <div>
            <label className={labelCls}>Title *</label>
            <input name="title" required minLength={3} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea name="description" rows={3} className={inputCls} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Listing type *</label>
              <select name="listingType" className={inputCls} defaultValue="sale">
                <option value="sale">Sale</option>
                <option value="rent">Rent</option>
                <option value="pg">PG</option>
                <option value="commercial_lease">Commercial lease</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Property type *</label>
              <select name="propertyType" className={inputCls} defaultValue="apartment">
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="plot">Plot</option>
                <option value="office">Office</option>
                <option value="shop">Shop</option>
                <option value="warehouse">Warehouse</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>BHK</label>
              <input name="bhk" type="number" min={0} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Carpet (sqft)</label>
              <input name="carpetSqft" type="number" min={0} className={inputCls} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Price *</label>
              <input name="priceAmount" type="number" required min={0} step="any" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Unit *</label>
              <select name="priceUnit" className={inputCls} defaultValue="lakh">
                <option value="lakh">Lakh</option>
                <option value="crore">Crore</option>
                <option value="per_month">Per month</option>
                <option value="per_sqft">Per sqft</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input name="negotiable" type="checkbox" defaultChecked /> Negotiable
              </label>
            </div>
            <div>
              <label className={labelCls}>Maintenance (₹)</label>
              <input name="maintenanceAmount" type="number" min={0} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Deposit (months)</label>
              <input name="depositMonths" type="number" min={0} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Furnishing</label>
              <select name="furnishing" className={inputCls} defaultValue="">
                <option value="">—</option>
                <option value="unfurnished">Unfurnished</option>
                <option value="semi">Semi</option>
                <option value="fully">Fully</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Address</label>
              <input name="addressLine" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Locality</label>
              <input name="locality" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>City *</label>
              <input name="city" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input name="state" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Pincode</label>
              <input name="pincode" pattern="\d{6}" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>RERA ID</label>
              <input name="reraId" className={inputCls} />
            </div>
          </div>
        </section>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input name="goLive" type="checkbox" defaultChecked />
          Publish live to the marketplace now (otherwise saved as draft)
        </label>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="text-sm px-5 py-2 rounded-inner bg-accent text-white disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create listing"}
          </button>
          <Link href="/marketplace/managed" className="text-sm text-ink-muted hover:text-ink">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
