// Attendee-details field catalog for the admin "require attendee details"
// checklist. Keys must match the backend attendee_profiles columns and the
// customer app's src/lib/attendeeFields.ts.
export const ATTENDEE_FIELDS: { key: string; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'age', label: 'Age' },
  { key: 'gender', label: 'Gender' },
  { key: 'qualification', label: 'Highest Qualification' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'marital_status', label: 'Marital Status' },
  { key: 'contact_number', label: 'Contact Number' },
  { key: 'whatsapp_number', label: 'WhatsApp Number' },
  { key: 'registration_type', label: 'Registering Solo or Group' },
  { key: 'govt_id_url', label: 'Govt. ID proof' },
  { key: 'travel', label: 'Travel' },
];
