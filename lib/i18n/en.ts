// English dictionary — the source of truth. Other locales mirror this shape.
export const en = {
  nav: {
    home: "Home",
    properties: "Properties",
    leads: "Leads",
    myLeads: "My Leads",
    deals: "Deals",
    contacts: "Contacts",
    whatsapp: "WhatsApp",
    analytics: "Analytics",
    reports: "Reports",
    settings: "Settings",
    logout: "Log out",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    loading: "Loading…",
  },
  login: {
    title: "Sign in",
    phoneLabel: "Phone number",
    sendOtp: "Send OTP",
    otpLabel: "Enter OTP",
    verify: "Verify",
  },
};

export type Dictionary = typeof en;
