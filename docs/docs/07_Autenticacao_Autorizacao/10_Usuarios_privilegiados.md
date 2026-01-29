# Criando usuários privilegiados

A próxima feature no nosso sistema de autorização é criarmos usuários privilegiados, ou seja, usuários que tem mais poderes que usuários comuns. Vamos criar um usuários que consiga fazer a edição de dados de outros usuários, por exemplo! E a forma de fazermos isso é atribuindo a ele uma feature nova com um modificador, por exemplo: `update:user:others`. Os usuários comuns possuem apenas a feature `update:user`, e no controller a gente faz a validação se o usuário alvo é o usuário que está solicitando a alteração. Nesse novo cenário, se o usuário tiver a feature `update:user:others`, ele conseguirá fazer a alteração mesmo que o alvo não seja ele mesmo.

## Criando os testes desse cenário

Primeiramente, vamos criar uma nova bateria de testes para usuários privilegiados, e a ideia é criar um cenário de teste onde criamos dois usuários comuns, em um deles adicionaremos a feature `update:user:others`, e com ela adicionada, fazemos a alteração do username do outro usuário:

```javascript title="./tests/integration/api/v1/users/[username]/patch.test.js"
describe("PATCH to /api/v1/users/[username]", () => {
  /// ...
    describe("Privileged user", () => {
    test("With update:user:others targeting default user", async () => {
      const defaultUser = await orchestrator.createUser();

      const privilegedUser = await orchestrator.createUser();
      const activatedPrivilegedUser =
        await orchestrator.activateUser(privilegedUser);

      // Esse método addFeaturesToUser ainda não existe!
      await orchestrator.addFeaturesToUser(privilegedUser, [
        "update:user:others",
      ]);

      const privilegedUserSession = await orchestrator.createSession(
        activatedPrivilegedUser.id,
      );

      const userToBeUpdated = {
        username: "NewUsername",
      };

      const responseUpdate = await fetch(
        `http://localhost:3000/api/v1/users/${defaultUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${privilegedUserSession.token}`,
          },
          body: JSON.stringify(userToBeUpdated),
        },
      );

      expect(responseUpdate.status).toBe(200);

      const responseUpdateBody = await responseUpdate.json();
      expect(responseUpdateBody).toEqual({
        id: defaultUser.id,
        username: "NewUsername",
        email: defaultUser.email,
        features: defaultUser.features,
        password: responseUpdateBody.password,
        created_at: responseUpdateBody.created_at,
        updated_at: responseUpdateBody.updated_at,
      });

      expect(uuidVersion(responseUpdateBody.id)).toBe(4);
      expect(Date.parse(responseUpdateBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseUpdateBody.created_at)).not.toBeNaN();
      expect(
        responseUpdateBody.updated_at > responseUpdateBody.created_at,
      ).toBe(true);
    });
  });
});
```

## Abstraindo a adição de features para um usuário

Precisamos criar no `orchestrator` um método para adicionar features a um usuário. Isso é bastante simples, porque o orchestrator também delega essa inteligência para o model `user`:

```javascript title="./tests/orchestrator.js"
async function addFeaturesToUser(userObject, features) {
  const updatedUser = await user.addFeatures(userObject.id, features);
  return updatedUser;
}
```

Agora veja que o model user já tem um método chamado `setFeatures()`, mas esse método sobrescreve as features existentes de um usuário. Agora queremos adicionar features a uma lista, então vamos criar esse novo método no model user.js:

```javascript title="./models/user.js"
async function addFeatures(userId, features) {
  const updatedUser = await runUpdateQuery(userId, features);
  return updatedUser;

  async function runUpdateQuery(userId, features) {
    const results = await database.query({
      text: `
        UPDATE 
          users
        SET
          features = array_cat(features, $2), 
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING *
      `,
      values: [userId, features],
    });

    return results.rows[0];
  }
}
```

!!! tip

    Aqui estamos usando uma função do Postgres chamada `array_cat`, que concatena dois arrays! Dessa forma, a query ao invés de sobrescrever o array existente na coluna `features`, adiciona a esse array a lista que passarmos para o método addFeature.

## Criando a lógica de permissão

Então já estamos atribuindo ao usuário privilegiado a feature `update:user:others`. Agora temos que incluir no model `authorization.js` a lógica para permitir o update caso o usuário tenha essa feature:

```javascript title="./models/authorization.js" hl_lines="9"
function can(user, feature, resource) {
  let authorized = false;
  if (user.features.includes(feature)) {
    authorized = true;
  }

  if (feature === "update:user" && resource) {
    authorized = false;
    if (user.id === resource.id || can(user, "update:user:others")) {
      authorized = true;
    }
  }

  return authorized;
}
```

!!! tip

    Aqui estamos usando uma espécie de recursão, chamando novamente o método `can` para ver se o usuário possui a feature `update:user:others`. Se tiver, mesmo que a primeira condição `user.id === resource.id` falhe, essa permissão vai garantir o authorized como true.

!!! success

    Agora o teste vai passar, e com isso temos implementado o permissionamento privilegiado de um usuário para alterar dados de outros usuários.

