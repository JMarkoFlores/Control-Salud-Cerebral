import bcrypt from 'bcryptjs';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const password = args[0] ?? process.env.ADMIN_PASSWORD;

if (!password) {
  console.error('Uso: pnpm hash -- "TuContraseñaSegura"');
  process.exit(1);
}

if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

bcrypt
  .hash(password, 12)
  .then((hash) => {
    console.log(hash);
  })
  .catch((error: unknown) => {
    console.error('No fue posible generar el hash:', error);
    process.exit(1);
  });
