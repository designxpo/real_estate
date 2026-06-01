// OTP delivery. Dev: console.log. Prod: swap to MSG91.

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const devLog = process.env.DEV_OTP_LOG !== "false";
  if (devLog || !process.env.MSG91_AUTH_KEY) {
    // eslint-disable-next-line no-console
    console.log(`[OTP] ${phone} → ${code}  (set DEV_OTP_LOG=false + MSG91_* to send real SMS)`);
    return;
  }

  const url = `https://api.msg91.com/api/v5/otp?template_id=${process.env.MSG91_TEMPLATE_ID}&mobile=${encodeURIComponent(
    phone.replace(/^\+/, "")
  )}&otp=${code}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { authkey: process.env.MSG91_AUTH_KEY!, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MSG91 send failed: ${res.status} ${body}`);
  }
}
