# Filtrando output

Até esse ponto no projeto, não estamos fazendo nenhum filtro do output que a API retorna para o usuário, e isso é uma grave falha de segurança. No momento, nos endpoints de `/users`, tanto no `GET` quanto no `PATCH`, estamos retornando o objeto puro que vem do banco de dados, e com isso estamos devolvendo dados sensíveis como e-mail e senha.

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

    Pronto, agora a nossa API de `/users` está protegida, sem retornar o email e a senha do usuário. É preciso corrigir todos os testes que estavam esperando esses dados no retorno, porque eles começarão a falhar.
