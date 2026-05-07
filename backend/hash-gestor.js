import bcrypt from 'bcryptjs';

const senha = 'novaSenha'; // exatamente o que você quer digitar no login
const hash = await bcrypt.hash(senha, 10);
console.log(hash);