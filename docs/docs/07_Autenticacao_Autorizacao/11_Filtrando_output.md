# Filtrando output

Até esse ponto no projeto, não estamos fazendo nenhum filtro do output que a API retorna para o usuário, e isso é uma grave falha de segurança. No momento, nos endpoints de `/users` por exemplo, tanto no `GET` quanto no `PATCH`, estamos retornando o objeto puro que vem do banco de dados, e com isso estamos devolvendo dados sensíveis como e-mail e senha.

## Criando os filtros para `/users`

Vamos implementar um método `filterOutput()` no model `authorization` para fazer essa filtragem dos dados antes de a API retornar.

Esse método pode receber como parâmetro o usuário que está solicitando os dados, a feature, e o output puro (sem filtros). Dependendo da feature, e potencialmente do usuário solicitando ela, podemos filtrar o output e devolvê-lo apenas com os campos que interessam.

Começando pelo controller, vamos adicionar a chamada desse método (que ainda não existe, mas já vamos criar):

```javascript title="./pages/api/v1/users/[username]/index.js" hl_lines="6-10 31-35"
async function getHandler(request, response) {
  const userTryingToGet = request.context.user;
  const username = request.query.username;
  const userFound = await user.findOneByUsername(username);

  const filteredOutput = authorization.filterOutput(
    userTryingToGet,
    "read:user",
    userFound,
  );

  return response.status(200).json(filteredOutput);
}

async function patchHandler(request, response) {
  const username = request.query.username;
  const userInputValues = request.body;

  const userTryingToPatch = request.context.user;
  const targetUser = await user.findOneByUsername(username);

  if (!authorization.can(userTryingToPatch, "update:user", targetUser)) {
    throw new ForbiddenError({
      message: "Você não possui permissão para atualizar outro usuário.",
      action:
        "Verifique se você possui a feature necessária para atualizar outro usuário.",
    });
  }
  const updatedUser = await user.update(username, userInputValues);

  const filteredOutput = authorization.filterOutput(
    userTryingToPatch,
    "update:user",
    updatedUser,
  );

  return response.status(200).json(filteredOutput);
}
```

Show! Agora podemos pensar como será a lógica desse método, que vai ser bem simples na verdade. Por enquanto para esses requests não estamos interessados em diferenciar o output dependendo do usuário solicitante, mas poderíamos. Poderíamos por exemplo fazer com que se o usuário for ele mesmo, retornamos algum dado a mais como o e-mail. Mas nesse caso vamos manter simples, e independende do usuário, vamos devolver sempre o mesmo payload:

```javascript title="./models/authorization.js"
function filterOutput(user, feature, output) {
  if (feature === "read:user" || feature === "update:user") {
    return {
      id: output.id,
      username: output.username,
      features: output.features,
      created_at: output.created_at,
      updated_at: output.updated_at,
    };
  }
}
```

!!! tip

    O ideal é sempre redeclararmos explicitamente as chaves que queremos retornar, e não simplesmente remover `password` e `email`, por exemplo. Isso porque não sabemos como a API vai crescer no futuro, e não queremos correr o risco de um dia acrescentarmos mais uma coluna na tabela com algum dado sensível, e esquecermos de filtrarmos aqui. O certo é a gente declarar o que queremos retornar, e caso futuramente precisemos retornar algo mais, teríamos que vir nessa função e adicionar.

!!! success

    Pronto, agora a nossa API de `/users` está protegida, sem retornar o email e a senha do usuário. É preciso corrigir todos os testes que estavam esperando esses dados no retorno, porque eles começarão a falhar. E agora vamos começar a corrigir os demais endpoints dessa forma.

## Criando os filtros para `/user`

O endpoint `/user` retorna os dados do usuário logado, mas nesse caso o próprio usuário pode ter a informação do seu e-mail, que precisaremos para criar futuramente a página de perfil dele. Portanto, seguiremos a mesma abordagem acima, só que retornando também o e-mail dele. Como já usamos a feature `read:user`, nesse caso podemos criar a `read:user:self`:

```javascript title="./pages/api/v1/user/index.js" hl_lines="4 11-16 22"
async function getHandler(request, response) {
  const sessionToken = request.cookies.session_id;

  const userTryingToGet = request.context.user;
  const sessionObject = await session.findOneValidByToken(sessionToken);
  const renewSessionObject = await session.renew(sessionObject.id);
  controller.setSessionCookie(renewSessionObject.token, response);

  const userFound = await user.findOneById(sessionObject.user_id);

  const filteredOutput = authorization.filterOutput(
    userTryingToGet,
    "read:user:self",
    userFound,
  );

  response.setHeader(
    "Cache-Control",
    "no-store, no-cache, max-age=0, must-revalidate",
  );
  return response.status(200).json(filteredOutput);
}
```

E agora vamos criar mais um if no método `filterOutput()`:

```javascript title="./models/authorization.js" hl_lines="12-24"
function filterOutput(user, feature, output) {
  if (feature === "read:user" || feature === "update:user") {
    return {
      id: output.id,
      username: output.username,
      features: output.features,
      created_at: output.created_at,
      updated_at: output.updated_at,
    };
  }

  if (feature === "read:user:self") {
    if (user.id === output.id) {
      // => Realizando uma dupla confirmação se o usuário target é ele mesmo
      return {
        id: output.id,
        username: output.username,
        email: output.email,
        features: output.features,
        created_at: output.created_at,
        updated_at: output.updated_at,
      };
    }
  }
}
```

!!! note

    E novamente, temos que ajustar os testes que falham por esperar um `password` no retorno!

## Criando os filtros para `/sessions`

No controller de sessions, o `POST` e o `DELETE` também estão retornando o objeto sem passar por nenhum filtro:

```json
{
  id: '68e5e2d9-787f-45f4-b468-7cd9bbf12a69',
  token: '191fd7b2f390852bc128af02726d885c82135aa755cef3bcbdf55c9459c769f3ce50e1c1d102ae935fc453778b6a15e0',
  user_id: '641b8c69-4ed8-4779-9e83-5e0173b9036d',
  expires_at: 2026-03-01T12:02:36.675Z,
  created_at: 2026-01-30T12:02:36.679Z,
  updated_at: 2026-01-30T12:02:36.679Z
}
```

Nesse caso, estaria OK, porque não há nenhum dado sensível aí, e podemos retornar tudo dessa forma mesmo. Porém, mesmo assim é importante passar ele por um filtro porque se futuramente mais um campo for inserido, já teremos a garantia que nenhum dado será vazado. Então vamos implementar da mesma forma:

```javascript title="./pages/api/v1/sessions/index.js" hl_lines="20-24 29 37-41"
async function postHandler(request, response) {
  const userInputValues = request.body;

  const authenticatedUser = await authentication.getAuthenticatedUser(
    userInputValues.email,
    userInputValues.password,
  );

  if (!authorization.can(authenticatedUser, "create:session")) {
    throw new ForbiddenError({
      message: "Você não possui permissão para fazer login.",
      action: "Contate o suporte caso você acredite que isto seja um erro.",
    });
  }

  const newSession = await session.create(authenticatedUser.id);

  controller.setSessionCookie(newSession.token, response);

  const filteredOutput = authorization.filterOutput(
    authenticatedUser,
    "read:session",
    newSession,
  );
  return response.status(201).json(filteredOutput);
}

async function deleteHandler(request, response) {
  const userTryingToDelete = request.context.user;
  const sessionToken = request.cookies.session_id;

  const sessionObject = await session.findOneValidByToken(sessionToken);

  const expiredSession = await session.expireById(sessionObject.id);
  controller.clearSessionCookie(response);

  const filteredOutput = authorization.filterOutput(
    userTryingToDelete,
    "delete:session",
    expiredSession,
  );
  return response.status(200).json(filteredOutput);
}
```

E no model:

```javascript title="./models/authorization.js" hl_lines="12-24"
function filterOutput(user, feature, output) {
  // restante do código omitido...

  if (feature === "read:session" || feature === "delete:session") {
    if (user.id === output.user_id) {
      return {
        id: output.id,
        token: output.token,
        user_id: output.user_id,
        expires_at: output.expires_at,
        created_at: output.created_at,
        updated_at: output.updated_at,
      };
    }
  }
}
```

## Criando os filtros para `/activations`

Aqui no `activations`, temos o endpoint de `PATCH` sem o filtro de Output. Vamos implementar da mesma forma:

```javascript title="./pages/api/v1/activations/[token_id]/index.js"
async function patchHandler(request, response) {
  const userTryingToPatch = request.context.user;
  const activationTokenId = request.query.token_id;

  const validActivationToken =
    await activation.findOneValidById(activationTokenId);

  await activation.activateUserByUserId(validActivationToken.user_id);

  const usedActivationToken =
    await activation.markTokenAsUsed(activationTokenId);

  const filteredOutput = authorization.filterOutput(
    userTryingToPatch,
    "read:activation_token",
    usedActivationToken,
  );
  return response.status(200).json(filteredOutput);
}
```

E no model:

```javascript title="./models/authorization.js" hl_lines="12-24"
function filterOutput(user, feature, output) {
  // restante do código omitido...

  if (feature === "read:activation_token") {
    return {
      id: output.id,
      user_id: output.user_id,
      used_at: output.used_at,
      expires_at: output.expires_at,
      created_at: output.created_at,
      updated_at: output.updated_at,
    };
  }
}
```

## Criando os filtros e autorização para `/migrations`

O endpoint `/migrations` ainda estava aberto, sem bloqueios tanto para os filtros quanto para a execução do GET e POST. Então vamos criar as features `read:migration` e `create:migration` e bloquear essas endpoints para serem executados apenas por usuários privilegiados.

```javascript title="./pages/api/v1/migrations/index.js"
import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import migrator from "models/migrator.js";
import authorization from "models/authorization.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);

router.get(controller.canRequest("read:migration"), getHandler);
router.post(controller.canRequest("create:migration"), postHandler);

export default router.handler(controller.errorHandler);

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;
  const pendingMigrations = await migrator.listPendingMigration();

  const filteredOutput = authorization.filterOutput(
    userTryingToGet,
    "read:migration",
    pendingMigrations,
  );
  return response.status(200).json(filteredOutput);
}

async function postHandler(request, response) {
  const userTryingToPost = request.context.user;
  const migratedMigrations = await migrator.runPendingMigrations();

  const filteredOutput = authorization.filterOutput(
    userTryingToPost,
    "create:migration",
    migratedMigrations,
  );
  if (migratedMigrations.length > 0) {
    return response.status(201).json(filteredOutput);
  } else {
    return response.status(200).json(filteredOutput);
  }
}
```

Na filtragem da saída temos uma diferença, porque como o retorno do endpoint é um array de JSONs, precisamos validar se cada elemento desse array é um JSON com as propriedades que queremos retornar. Para isso, usaremos o `map()` do JavaScript:

```javascript title="./model/authorization.js"
// restante do código foi ocultado...

if (feature === "read:migration" || feature == "create:migration") {
  return output.map((migration) => {
    return {
      path: migration.path,
      name: migration.name,
      timestamp: migration.timestamp,
    };
  });
}
```

!!! warning

    Agora para os testes, teremos uma mudança. Antes a gente não estava rodando o `runPendingMigrations` no `beforeAll`. Sem isso, a tabela de users não existe quando iniciamos os testes, e consequentemente não é possível criar um usuário default ou privilegiado para testarmos os níveis de autorização. Então vamos adicionar o `runPendingMigrations`, e a consequencia disso é que nos testes não poderemos mais validar se o retorno do GET de migrações pendentes será maior que zero (pois nunca teremos uma migração pendente), e também não poderemos testar um POST retornando 201 (criando uma migração) e um segundo retornando 200 (sem migrações a serem criadas)

## Criando os filtros e autorização para `/status`

Por fim, faremos a mesma coisa com o `/status`. A diferença aqui é que vamos fazer com que o endpoint /status continue disponível para usuários anônimos, mas apenas usuários privlegiados conseguirão ver a versão do banco de dados, e assim podemos criar uma granularidade de permissões nas propriedades do retorno do endpoint.

Para alterar o controller, vamos injetar o usuário no contexto, montar o JSON de saída e passar ele pelo filtro:

```javascript title="./pages/api/v1/status/index.js" hl_lines="4 7 33 35-44 46-50"
import { createRouter } from "next-connect";
import database from "infra/database.js";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";

const router = createRouter();
router.use(controller.injectAnonymousOrUser); // middleware

router.get(getHandler);

export default router.handler(controller.errorHandler);

async function get_postgres_version() {
  const result = await database.query("SHOW server_version");
  return result.rows[0].server_version;
}

async function get_postgres_max_connections() {
  const result = await database.query("SHOW max_connections");
  return parseInt(result.rows[0].max_connections);
}

async function get_postgres_used_connections() {
  const result = await database.query({
    text: "SELECT COUNT(*)::int FROM pg_stat_activity WHERE datname = $1;",
    values: [process.env.POSTGRES_DB],
  });
  return result.rows[0].count;
}

async function getHandler(request, response) {
  const updatedAt = new Date().toISOString();
  const userTryingToGet = request.context.user;

  const rawOutput = {
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: await get_postgres_version(),
        max_connections: await get_postgres_max_connections(),
        opened_connections: await get_postgres_used_connections(),
      },
    },
  };

  const filteredOutput = authorization.filterOutput(
    userTryingToGet,
    "read:status",
    rawOutput,
  );

  response.status(200).json(filteredOutput);
}
```

E o filtro ficará assim:

```javascript title="./models/authorization.js"
  if (feature === "read:status") {
    const base_output = {
      updated_at: output.updated_at,
      dependencies: {
        database: {
          max_connections: output.dependencies.database.max_connections,
          opened_connections: output.dependencies.database.opened_connections,
        },
      },
    };

    if (can(user, "read:status:all")) {
      base_output.dependencies.database.version =
        output.dependencies.database.version;
    }

    return base_output;
  }
```
