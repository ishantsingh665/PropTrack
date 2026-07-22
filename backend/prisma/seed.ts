import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Create Default Admin
  const adminEmail = 'admin@proptrack.local';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        id: '00000000-0000-0000-0000-000000000001',
        email: adminEmail,
        passwordHash,
        name: 'System Administrator',
        role: 'ADMIN',
      },
    });
    console.log('Admin user created: admin@proptrack.local / password123');
  }

  // 2. Property Types
  const types = [
    {
      name: 'Residential',
      children: ['Apartment', 'House', 'Villa', 'Townhouse', 'Student Housing', 'Senior Living'],
    },
    {
      name: 'Commercial',
      children: ['Office', 'Retail', 'Shopping Centre', 'Hotel', 'Restaurant/F&B', 'Co-working Space'],
    },
    {
      name: 'Industrial',
      children: ['Warehouse', 'Factory', 'Logistics/Distribution', 'Cold Storage', 'Data Centre'],
    },
    {
      name: 'Mixed-use',
      children: ['Residential+Commercial', 'Residential+Office', 'Commercial+Industrial'],
    },
    {
      name: 'Land',
      children: ['Development Plot', 'Agricultural', 'Parking Lot', 'Brownfield Site'],
    },
    {
      name: 'Special Purpose',
      children: ['Hospital/Medical', 'School/Education', 'Place of Worship', 'Government/Civic', 'Sports/Recreation'],
    },
  ];

  for (const parentType of types) {
    const parent = await prisma.propertyType.create({
      data: {
        name: parentType.name,
      },
    });

    for (const childName of parentType.children) {
      await prisma.propertyType.create({
        data: {
          name: childName,
          parentId: parent.id,
        },
      });
    }
  }

  // System Setting
  await prisma.systemSetting.upsert({
    where: { key: 'last_snapshot_month' },
    update: {},
    create: { key: 'last_snapshot_month', value: '' },
  });

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
