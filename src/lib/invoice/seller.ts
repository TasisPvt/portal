// Static seller (organisation) details for the GST tax invoice.
// Sourced from the reference invoice in /public.

export const SELLER = {
   name: "TAQWAA ADVISORY & SHARIAH INVESTMENT SOLUTION (P) LTD",
   addressLines: [
      "5, Natalwala Building, 110, S.V.S. Road,",
      "Mahim, Mumbai 400016",
   ],
   gstin: "27AACCT7596B1Z4",
   stateName: "Maharashtra",
   stateCode: "27",
   cin: "U4140MH2007PTC174170",
   pan: "AACCT7596B",
   msme: "MH19D0032141",
   email: "jamil@tasis.in",
   bank: {
      holder: "TAQWAA ADVISORY & SHARIAH INVESTMENT SOLUTION (P) LTD",
      bankName: "HDFC Bank",
      accountNo: "11142020000103",
      branchIfsc: "Matunga West & HDFC0001114",
      swift: "",
   },
   jurisdiction: "Mumbai",
} as const

// SAC for the services billed (same across plans for now).
export const HSN_SAC = "998311"
