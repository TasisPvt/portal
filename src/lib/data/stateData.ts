// State list for selectors. `code` is the GST/TIN state code (first two digits),
// per public/assets/List of State Code.pdf. Single source for the code used on
// tax invoices. Note: Andhra Pradesh uses 37 (current); Ladakh (38) post-dates
// the PDF.
export const stateData = [
   { label: 'Andhra Pradesh', value: 'Andhra Pradesh', code: '37' },
   { label: 'Arunachal Pradesh', value: 'Arunachal Pradesh', code: '12' },
   { label: 'Assam', value: 'Assam', code: '18' },
   { label: 'Bihar', value: 'Bihar', code: '10' },
   { label: 'Chhattisgarh', value: 'Chhattisgarh', code: '22' },
   { label: 'Goa', value: 'Goa', code: '30' },
   { label: 'Gujarat', value: 'Gujarat', code: '24' },
   { label: 'Haryana', value: 'Haryana', code: '06' },
   { label: 'Himachal Pradesh', value: 'Himachal Pradesh', code: '02' },
   { label: 'Jharkhand', value: 'Jharkhand', code: '20' },
   { label: 'Karnataka', value: 'Karnataka', code: '29' },
   { label: 'Kerala', value: 'Kerala', code: '32' },
   { label: 'Madhya Pradesh', value: 'Madhya Pradesh', code: '23' },
   { label: 'Maharashtra', value: 'Maharashtra', code: '27' },
   { label: 'Manipur', value: 'Manipur', code: '14' },
   { label: 'Meghalaya', value: 'Meghalaya', code: '17' },
   { label: 'Mizoram', value: 'Mizoram', code: '15' },
   { label: 'Nagaland', value: 'Nagaland', code: '13' },
   { label: 'Odisha', value: 'Odisha', code: '21' },
   { label: 'Punjab', value: 'Punjab', code: '03' },
   { label: 'Rajasthan', value: 'Rajasthan', code: '08' },
   { label: 'Sikkim', value: 'Sikkim', code: '11' },
   { label: 'Tamil Nadu', value: 'Tamil Nadu', code: '33' },
   { label: 'Telangana', value: 'Telangana', code: '36' },
   { label: 'Tripura', value: 'Tripura', code: '16' },
   { label: 'Uttar Pradesh', value: 'Uttar Pradesh', code: '09' },
   { label: 'Uttarakhand', value: 'Uttarakhand', code: '05' },
   { label: 'West Bengal', value: 'West Bengal', code: '19' },
   { label: 'Andaman and Nicobar Islands', value: 'Andaman and Nicobar Islands', code: '35' },
   { label: 'Chandigarh', value: 'Chandigarh', code: '04' },
   { label: 'Dadra and Nagar Haveli and Daman and Diu', value: 'Dadra and Nagar Haveli and Daman and Diu', code: '26' },
   { label: 'Delhi', value: 'Delhi', code: '07' },
   { label: 'Jammu and Kashmir', value: 'Jammu and Kashmir', code: '01' },
   { label: 'Ladakh', value: 'Ladakh', code: '38' },
   { label: 'Lakshadweep', value: 'Lakshadweep', code: '31' },
   { label: 'Puducherry', value: 'Puducherry', code: '34' },
];

const codeByState = new Map(stateData.map((s) => [s.value, s.code]))

export function getStateCode(state: string | null | undefined): string {
   return codeByState.get((state ?? "").trim()) ?? ""
}
