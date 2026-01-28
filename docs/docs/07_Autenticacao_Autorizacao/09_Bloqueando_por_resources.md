# Bloqueando endpoints baseado em Resources

Até esse momento no nosso sistema de Autorização, não estamos levando em conta o `resource`. Isso é, ao atribuirmos a permissão `update:user`, damos ao usuário a permissão de atualizar qualquer usuário, e não o seu em específico. É isso que implementaremos agora.

## Criando o teste de um usuário fazendo PATCH contra outro

O teste para cobrir esse caso vai ser basicamente criarmos dois usuários, e o usuário 2 tentar fazer um PATCH alterando o username do usuário 1. A expectativa é recebermos um `403 Forbidden`, coisa que hoje não vai acontecer porque não temos esse bloqueio implementado. O teste abaixo vai falhar porque a resposta está sendo um `200 OK`:

```javascript title="./tests/integration/api/v1/users/[username]/patch.test.js"
test.only("With user2 targeting user1", async () => {
  await orchestrator.createUser({
    username: "TargetUser",
  });

  const createdUser2 = await orchestrator.createUser({
    username: "RequesterUser",
  });
  const activatedUser2 = await orchestrator.activateUser(createdUser2);
  const sessionObject = await orchestrator.createSession(activatedUser2.id);

  const userToBeUpdated = {
    username: "NewUsername",
  };

  const responseUpdate = await fetch(
    "http://localhost:3000/api/v1/users/TargetUser",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
      body: JSON.stringify(userToBeUpdated),
    },
  );

  expect(responseUpdate.status).toBe(403);
});
```

## Implementando o `resource`

Lá na função `patchHandler` do controller, vamos adicionar uma condição que verifica se o usuário que está tentando fazer o Patch é o mesmo que o Target. Primeiro vamos pegar o usuário solicitante, que está injetado no contexto da sessão, e o usuário alvo, que é o que foi passado na URL. Com posse desses dois dados, vamos chamar o método `can` do model `authorization`, passando o `targetUser` como parâmetro. Ele será o resource que vamos querer comparar:

```javascript title="./pages/api/v1/users/[username]/index.js" hl_lines="5-6 8-15"
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
  return response.status(200).json(updatedUser);
}
```

E agora no método `can` faremos essa verificação. Vamos passar a receber o `resource` na assinatura, e caso a feature desejada seja um `update:user`, e caso o `resource` seja passado, vamos validar se o usuário solicitante é o mesmo que o usuário alvo:

```javascript title="./models/authorization.js" hl_lines="1 7-12"
function can(user, feature, resource) {
  let authorized = false;
  if (user.features.includes(feature)) {
    authorized = true;
  }

  if (feature === "update:user" && resource) {
    authorized = false;
    if (user.id === resource.id) {
      authorized = true;
    }
  }

  return authorized;
}
```

!!! success

    Agora o teste vai começar a passar, pois como o usuário solicitante não é o mesmo que o usuário alvo, o controller passará a devolver um `403 Forbidden`.
