"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Firm = {
  name: string;
  firmType: string | null;
  reraNumber: string | null;
  reraAuthority: string | null;
  panNumber: string | null;
  gstNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  website: string | null;
  about: string | null;
  upiVpa: string | null;
};

const FIRM_TYPES = [
  ["", "Select…"],
  ["proprietorship", "Proprietorship"],
  ["partnership", "Partnership"],
  ["llp", "LLP"],
  ["pvt_ltd", "Pvt. Ltd."],
  ["individual_agent", "Individual agent"],
];

const inputCls = "w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink";
const labelCls = "block text-xs text-ink-muted mb-1";

export function FirmKycForm({ firm }: { firm: Firm }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    const f = new FormData(e.currentTarget);
    const obj = Object.fromEntries([...f.entries()].map(([k, v]) => [k, (v as string).trim()]));
    const res = await fetch("/api/firm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj),
    });
    setBusy(false);
    if (res.ok) {
      setMsg("Saved.");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Could not save");
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={labelCls}>Firm name</label><input name="name" defaultValue={firm.name} className={inputCls} /></div>
        <div>
          <label className={labelCls}>Firm type</label>
          <select name="firmType" defaultValue={firm.firmType ?? ""} className={inputCls}>
            {FIRM_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>RERA number</label><input name="reraNumber" defaultValue={firm.reraNumber ?? ""} className={inputCls} /></div>
        <div><label className={labelCls}>RERA authority</label><input name="reraAuthority" defaultValue={firm.reraAuthority ?? ""} className={inputCls} placeholder="MahaRERA" /></div>
        <div><label className={labelCls}>PAN</label><input name="panNumber" defaultValue={firm.panNumber ?? ""} className={`${inputCls} uppercase`} placeholder="ABCDE1234F" /></div>
        <div><label className={labelCls}>GSTIN</label><input name="gstNumber" defaultValue={firm.gstNumber ?? ""} className={`${inputCls} uppercase`} /></div>
      </div>
      <div><label className={labelCls}>Office address</label><input name="address" defaultValue={firm.address ?? ""} className={inputCls} /></div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div><label className={labelCls}>City</label><input name="city" defaultValue={firm.city ?? ""} className={inputCls} /></div>
        <div><label className={labelCls}>State</label><input name="state" defaultValue={firm.state ?? ""} className={inputCls} /></div>
        <div><label className={labelCls}>Pincode</label><input name="pincode" defaultValue={firm.pincode ?? ""} inputMode="numeric" className={inputCls} /></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={labelCls}>Website</label><input name="website" defaultValue={firm.website ?? ""} className={inputCls} placeholder="https://…" /></div>
        <div><label className={labelCls}>UPI ID (rent collection)</label><input name="upiVpa" defaultValue={firm.upiVpa ?? ""} className={inputCls} placeholder="firm@okhdfcbank" /></div>
      </div>
      <div><label className={labelCls}>About (shown to owners)</label><textarea name="about" defaultValue={firm.about ?? ""} rows={3} className={inputCls} /></div>

      {msg && <div className="text-sm text-positive">{msg}</div>}
      {err && <div className="text-sm text-urgent">{err}</div>}
      <button type="submit" disabled={busy} className="text-sm px-5 py-2 rounded-inner bg-accent text-white disabled:opacity-60">
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
