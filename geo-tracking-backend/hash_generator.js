const bcrypt = require('bcrypt');
const password = 'password123';
const saltRounds = 10; // Nivel de seguridad del hash

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error("Error al generar el hash:", err);
        return;
    }
    console.log("------------------------------------------");
    console.log("HASH GENERADO (Cópialo en tu comando SQL):");
    console.log(hash);
    console.log("------------------------------------------");
    // Ejemplo de hash: $2b$10$oY1QjS... (una cadena larga)
});