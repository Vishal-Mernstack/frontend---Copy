const fs = require('fs');
const files = [
  'src/pages/Appointments.jsx',
  'src/pages/EnhancedAppointments.jsx',
  'src/pages/Doctors.jsx',
  'src/pages/Staff.jsx',
  'src/pages/Patients.jsx',
  'src/pages/Billing.jsx',
  'src/pages/Lab.jsx',
  'src/pages/Pharmacy.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Basic replacement for simple lines
  content = content.replace(/const patients = data\?\.items \|\| \[\];/g, 'const patients = useMemo(() => data?.items || [], [data?.items]);');
  content = content.replace(/const staff = data\?\.items \|\| \[\];/g, 'const staff = useMemo(() => data?.items || [], [data?.items]);');
  content = content.replace(/const doctors = data\?\.items \|\| \[\];/g, 'const doctors = useMemo(() => data?.items || [], [data?.items]);');
  content = content.replace(/const items = data\?\.items \|\| \[\];/g, 'const items = useMemo(() => data?.items || [], [data?.items]);');
  content = content.replace(/const records = data\?\.items \|\| \[\];/g, 'const records = useMemo(() => data?.items || [], [data?.items]);');
  content = content.replace(/const appointments = data\?\.items \|\| \[\];/g, 'const appointments = useMemo(() => data?.items || [], [data?.items]);');

  content = content.replace(/const items = Array\.isArray\(safeData\.items\) \? safeData\.items : \[\];/g, 'const items = useMemo(() => Array.isArray(safeData.items) ? safeData.items : [], [safeData.items]);');

  // Replace hook calls like const patients = usePatients(...)?.data?.items || [];
  content = content.replace(/const patients = (use[A-Za-z]+\([^)]+\)\?\.data\?\.items) \|\| \[\];/g, 'const patientsData = $1;\n  const patients = useMemo(() => patientsData || [], [patientsData]);');
  content = content.replace(/const doctors = (use[A-Za-z]+\([^)]+\)\?\.data\?\.items) \|\| \[\];/g, 'const doctorsData = $1;\n  const doctors = useMemo(() => doctorsData || [], [doctorsData]);');
  content = content.replace(/const appointments = (use[A-Za-z]+\([^)]+\)\?\.data\?\.items) \|\| \[\];/g, 'const appointmentsData = $1;\n  const appointments = useMemo(() => appointmentsData || [], [appointmentsData]);');

  fs.writeFileSync(file, content);
}
console.log('Fixed pages.');
