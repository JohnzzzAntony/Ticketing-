import bcrypt from 'bcryptjs';

const hash = '$2b$10$G4TnMQek9IVgxXHO.GGyk.HVNK/h3xJn.sMXHWG.yMUr6bFJcAXvm';
const password = 'password123';

async function main() {
  const isValid = await bcrypt.compare(password, hash);
  console.log('Is valid:', isValid);
}

main();
