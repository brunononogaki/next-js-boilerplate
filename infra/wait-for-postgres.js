// Import sendo feito com o require, porque como aqui o Next não vai transpilar, fazemos assim para manter o máximo de compatibilidade
const { exec } = require("node:child_process");

function checkPostgres() {
  // Comando para verificar se o Postgres está pronto e respondendo no localhost
  exec("docker exec postgres-dev pg_isready --host localhost", handleReturn);

  function handleReturn(error, stdout) {
    if (stdout.search("accepting connections") === -1) {
      process.stdout.write(".");
      // Caso não esteja pronto ainda, vamos chamar a função recursivamente
      checkPostgres();
      return;
    }
    console.log("\n🟢 Postgres está pronto!");
  }
}

console.log("\n\n🔴 Aguardando Postgres aceitar conexões...");
checkPostgres();
