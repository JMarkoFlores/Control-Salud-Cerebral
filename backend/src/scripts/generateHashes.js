const bcrypt = require('bcryptjs');

const p1 = bcrypt.hashSync('Admin123!', 10);
const p2 = bcrypt.hashSync('Titular123!', 10);
const p3 = bcrypt.hashSync('Acompanante123!', 10);

console.log('Admin123! => ' + p1);
console.log('Titular123! => ' + p2);
console.log('Acompanante123! => ' + p3);
