// Static seller (organisation) details for the GST tax invoice.
// Sourced from the reference invoice in /public.

export const SELLER = {
   name: "TAQWAA ADVISORY & SHARIA INVESTMENT SOLUTION (P) LTD",
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
      holder: "TAQWAA ADVISORY & SHARIA INVESTMENT SOLUTION (P) LTD",
      bankName: "HDFC Bank",
      accountNo: "11142020000103",
      branchIfsc: "Matunga West & HDFC0001114",
      swift: "",
   },
   jurisdiction: "Mumbai",
} as const

// SAC for the services billed (same across plans for now).
export const HSN_SAC = "9983"

// GST state codes keyed by the exact labels used in stateData.
export const STATE_CODES: Record<string, string> = {
   "Jammu and Kashmir": "01",
   "Himachal Pradesh": "02",
   "Punjab": "03",
   "Chandigarh": "04",
   "Uttarakhand": "05",
   "Haryana": "06",
   "Delhi": "07",
   "Rajasthan": "08",
   "Uttar Pradesh": "09",
   "Bihar": "10",
   "Sikkim": "11",
   "Arunachal Pradesh": "12",
   "Nagaland": "13",
   "Manipur": "14",
   "Mizoram": "15",
   "Tripura": "16",
   "Meghalaya": "17",
   "Assam": "18",
   "West Bengal": "19",
   "Jharkhand": "20",
   "Odisha": "21",
   "Chhattisgarh": "22",
   "Madhya Pradesh": "23",
   "Gujarat": "24",
   "Dadra and Nagar Haveli and Daman and Diu": "26",
   "Maharashtra": "27",
   "Karnataka": "29",
   "Goa": "30",
   "Lakshadweep": "31",
   "Kerala": "32",
   "Tamil Nadu": "33",
   "Puducherry": "34",
   "Andaman and Nicobar Islands": "35",
   "Telangana": "36",
   "Andhra Pradesh": "37",
   "Ladakh": "38",
}

export function stateCode(stateName: string | null | undefined): string {
   return STATE_CODES[(stateName ?? "").trim()] ?? ""
}
