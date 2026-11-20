import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import {
  User,
  UserRole,
  Department,
  Employee,
  EmploymentStatus,
  EmploymentType,
  TaxRegime,
  SalaryStructure,
  RevisionReason,
  PayrollPeriod,
  Payslip,
  PayslipItem,
  AuditLog,
} from '../../entities/index.js';

const CITY_STATE_MAP: Record<string, { state: string; isMetro: boolean }> = {
  Bangalore: { state: 'Karnataka', isMetro: true },
  Mumbai: { state: 'Maharashtra', isMetro: true },
  Delhi: { state: 'Delhi', isMetro: true },
  Hyderabad: { state: 'Telangana', isMetro: true },
  Pune: { state: 'Maharashtra', isMetro: false },
  Chennai: { state: 'Tamil Nadu', isMetro: true },
  Kolkata: { state: 'West Bengal', isMetro: true },
  Ahmedabad: { state: 'Gujarat', isMetro: false },
};

const CITIES = Object.keys(CITY_STATE_MAP);

const GRADE_DISTRIBUTION = [
  { grade: 'L1', weight: 20, minCtc: 240000, maxCtc: 480000, titles: ['Junior Associate', 'Trainee Engineer', 'Analyst'] },
  { grade: 'L2', weight: 30, minCtc: 480000, maxCtc: 960000, titles: ['Software Engineer', 'Senior Associate', 'Consultant'] },
  { grade: 'L3', weight: 25, minCtc: 960000, maxCtc: 1800000, titles: ['Senior Software Engineer', 'Team Lead', 'Senior Consultant'] },
  { grade: 'L4', weight: 15, minCtc: 1800000, maxCtc: 3000000, titles: ['Engineering Manager', 'Lead Architect', 'Product Manager'] },
  { grade: 'L5', weight: 7, minCtc: 3000000, maxCtc: 5000000, titles: ['Senior Manager', 'Principal Architect', 'Director'] },
  { grade: 'L6', weight: 3, minCtc: 5000000, maxCtc: 9000000, titles: ['Senior Director', 'VP of Engineering', 'VP of Operations'] },
];

function getRandomGrade() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const item of GRADE_DISTRIBUTION) {
    cumulative += item.weight;
    if (rand <= cumulative) return item;
  }
  return GRADE_DISTRIBUTION[0];
}

function calculateSalaryBreakup(annualCtc: number, isMetro: boolean) {
  const monthlyCtc = Math.round(annualCtc / 12);
  const basicMonthly = Math.round(monthlyCtc * 0.40);
  const hraMonthly = Math.round(basicMonthly * (isMetro ? 0.50 : 0.40));
  const ltaMonthly = Math.round((annualCtc / 12) * 0.0167);
  const employerPfMonthly = Math.round(Math.min(basicMonthly, 15000) * 0.12);
  const gratuityMonthly = Math.round(basicMonthly * 0.0481);

  const specialAllowance = Math.max(
    0,
    monthlyCtc - (basicMonthly + hraMonthly + ltaMonthly + employerPfMonthly + gratuityMonthly),
  );

  return {
    annualCtc,
    monthlyCtc,
    basicMonthly,
    hraMonthly,
    ltaMonthly,
    specialAllowance,
    otherAllowances: 0,
    employerPfMonthly,
    gratuityMonthly,
  };
}

async function runSeed() {
  console.log('🚀 Connecting to database for seeding...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'jainish',
    database: process.env.DB_NAME || 'acme_salary',
    entities: [
      User,
      Department,
      Employee,
      SalaryStructure,
      PayrollPeriod,
      Payslip,
      PayslipItem,
      AuditLog,
    ],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('✓ Database connected.');

  const queryRunner = dataSource.createQueryRunner();

  // 1. Seed HR Admin user
  console.log('🌱 Seeding HR Admin user...');
  const userRepo = dataSource.getRepository(User);
  const existingAdmin = await userRepo.findOne({ where: { email: 'admin@acme.com' } });
  let adminUser: User;

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    adminUser = await userRepo.save(
      userRepo.create({
        email: 'admin@acme.com',
        passwordHash,
        fullName: 'Priya Sharma (HR Admin)',
        role: UserRole.HR_ADMIN,
        isActive: true,
      }),
    );
    console.log('✓ Admin user created: admin@acme.com / Admin@123');
  } else {
    adminUser = existingAdmin;
    console.log('✓ Admin user already exists.');
  }

  // 2. Seed Departments
  console.log('🌱 Seeding Departments...');
  const deptRepo = dataSource.getRepository(Department);
  const deptNames = [
    { name: 'Engineering', description: 'Core software engineering and infrastructure' },
    { name: 'Product Management', description: 'Product strategy, roadmap and design' },
    { name: 'Design & UX', description: 'User experience and UI design' },
    { name: 'Finance & Accounts', description: 'Financial planning, payroll and compliance' },
    { name: 'Human Resources', description: 'Talent acquisition, retention and employee operations' },
    { name: 'Sales & BD', description: 'Enterprise sales and business partnerships' },
    { name: 'Marketing', description: 'Brand marketing, growth and communications' },
    { name: 'Operations', description: 'Corporate business operations and support' },
    { name: 'Legal & Compliance', description: 'Legal governance, contracts and compliance' },
    { name: 'Customer Success', description: 'Customer onboarding and relationship management' },
  ];

  const savedDepts: Department[] = [];
  for (const d of deptNames) {
    let dept = await deptRepo.findOne({ where: { name: d.name } });
    if (!dept) {
      dept = await deptRepo.save(deptRepo.create(d));
    }
    savedDepts.push(dept);
  }
  console.log(`✓ ${savedDepts.length} departments ready.`);

  // 3. Check existing employees
  const employeeRepo = dataSource.getRepository(Employee);
  const count = await employeeRepo.count();
  if (count >= 10000) {
    console.log(`ℹ Database already has ${count} employees. Skipping employee generation.`);
    await dataSource.destroy();
    return;
  }

  const TARGET_EMPLOYEES = 10000;
  const NEEDED = TARGET_EMPLOYEES - count;
  console.log(`🌱 Generating and inserting ${NEEDED} employees with Indian salary structures...`);

  const BATCH_SIZE = 1000;
  const totalBatches = Math.ceil(NEEDED / BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const currentBatchSize = Math.min(BATCH_SIZE, NEEDED - batchIdx * BATCH_SIZE);
    const startEmpNum = count + batchIdx * BATCH_SIZE + 1;

    const employeeRecords: Partial<Employee>[] = [];
    const salaryConfigList: Array<{
      annualCtc: number;
      isMetro: boolean;
      doj: string;
      hasRevision: boolean;
    }> = [];

    for (let i = 0; i < currentBatchSize; i++) {
      const empNum = startEmpNum + i;
      const empCode = `EMP${empNum.toString().padStart(6, '0')}`;
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${empNum}@acme.com`;

      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      const cityInfo = CITY_STATE_MAP[city];
      const gradeInfo = getRandomGrade();
      const designation = gradeInfo.titles[Math.floor(Math.random() * gradeInfo.titles.length)];
      const dept = savedDepts[Math.floor(Math.random() * savedDepts.length)];

      // Joining date between 2017 and 2025
      const dojYear = 2017 + Math.floor(Math.random() * 8);
      const dojMonth = 1 + Math.floor(Math.random() * 12);
      const dojDay = 1 + Math.floor(Math.random() * 28);
      const dateOfJoining = `${dojYear}-${dojMonth.toString().padStart(2, '0')}-${dojDay.toString().padStart(2, '0')}`;

      // Status
      const statusRand = Math.random();
      let status = EmploymentStatus.ACTIVE;
      let dateOfLeaving: string | null = null;
      if (statusRand < 0.05) {
        status = EmploymentStatus.TERMINATED;
        dateOfLeaving = '2026-06-30';
      } else if (statusRand < 0.10) {
        status = EmploymentStatus.ON_LEAVE;
      }

      // Tax regime: 70% New, 30% Old
      const taxRegime = Math.random() < 0.70 ? TaxRegime.NEW : TaxRegime.OLD;

      // Fake PAN: 5 letters + 4 digits + 1 letter
      const panChars = 'ABCDE';
      const panEnd = 'F';
      const panNum = (1000 + Math.floor(Math.random() * 9000)).toString();
      const pan = `${panChars}${panNum}${panEnd}`;
      const uan = (100000000000 + empNum).toString();

      // Salary
      const annualCtc = Math.round(
        (gradeInfo.minCtc + Math.random() * (gradeInfo.maxCtc - gradeInfo.minCtc)) / 10000,
      ) * 10000;

      employeeRecords.push({
        employeeCode: empCode,
        firstName,
        lastName,
        email,
        dateOfBirth: '1992-05-15',
        gender: Math.random() < 0.48 ? 'Female' : 'Male',
        panNumber: pan,
        uanNumber: uan,
        dateOfJoining,
        dateOfLeaving,
        employmentStatus: status,
        employmentType: EmploymentType.FULL_TIME,
        designation,
        grade: gradeInfo.grade,
        departmentId: dept.id,
        workCity: city,
        workState: cityInfo.state,
        taxRegime,
      });

      salaryConfigList.push({
        annualCtc,
        isMetro: cityInfo.isMetro,
        doj: dateOfJoining,
        hasRevision: Math.random() < 0.30, // 30% have a past salary revision
      });
    }

    // Insert employees
    const insertedEmployees = await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into(Employee)
      .values(employeeRecords)
      .returning(['id', 'employeeCode', 'dateOfJoining'])
      .execute();

    // Prepare salary structures for this batch
    const salaryRecords: Partial<SalaryStructure>[] = [];

    insertedEmployees.generatedMaps.forEach((emp, idx) => {
      const cfg = salaryConfigList[idx];
      const empId = emp.id;

      if (!cfg.hasRevision) {
        // Single active structure from DOJ
        const breakup = calculateSalaryBreakup(cfg.annualCtc, cfg.isMetro);
        salaryRecords.push({
          employeeId: empId,
          ...breakup,
          effectiveFrom: cfg.doj,
          effectiveTo: null,
          revisionReason: RevisionReason.JOINING,
          createdBy: adminUser.id,
        });
      } else {
        // Older structure (initial)
        const oldCtc = Math.round((cfg.annualCtc * 0.82) / 10000) * 10000;
        const oldBreakup = calculateSalaryBreakup(oldCtc, cfg.isMetro);
        salaryRecords.push({
          employeeId: empId,
          ...oldBreakup,
          effectiveFrom: cfg.doj,
          effectiveTo: '2024-03-31',
          revisionReason: RevisionReason.JOINING,
          createdBy: adminUser.id,
        });

        // Current active structure (from increment)
        const newBreakup = calculateSalaryBreakup(cfg.annualCtc, cfg.isMetro);
        salaryRecords.push({
          employeeId: empId,
          ...newBreakup,
          effectiveFrom: '2024-04-01',
          effectiveTo: null,
          revisionReason: RevisionReason.APPRAISAL,
          remarks: 'Annual appraisal increment (+22%)',
          createdBy: adminUser.id,
        });
      }
    });

    // Bulk insert salary structures
    await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into(SalaryStructure)
      .values(salaryRecords)
      .execute();

    const progress = Math.min(TARGET_EMPLOYEES, count + (batchIdx + 1) * BATCH_SIZE);
    console.log(`  -> Seeded ${progress} / ${TARGET_EMPLOYEES} employees...`);
  }

  await queryRunner.release();

  const finalCount = await employeeRepo.count();
  const salCount = await dataSource.getRepository(SalaryStructure).count();
  console.log(`\n🎉 Seeding complete!`);
  console.log(`   Employees: ${finalCount}`);
  console.log(`   Salary Structures: ${salCount}`);

  await dataSource.destroy();
}

runSeed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
