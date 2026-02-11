# Validando entrada do model `authorization`

Agora vamos adicionar algumas validações iniciais para o método `authorization`. Por exemplo, o que acontece se passsarmos para o método `can()` uma feature inválida? Ou se nem passarmos a feature? Nesses casos, queremos que o sistema lance um erro interno (`500 Internal Server Error`), que não dá detalhes para a interface pública (pois poderia ser uma falha de segurança), mas alerta o desenvolvedor de que algo inesperado aconteceu.

Para implementar isso, faremos a criação do nosso primeiro `Unit Test`, já que o model authorization não tem nenhuma dependência externa. É apenas um pedaço de código isolado que pode ser importado em algum lugar.

## Criando o Unit Test

Para criar o nosso teste unitário, vamos criar o arquivo `./tests/unit/models/authorization.test.js`.

```javascript title="./tests/unit/models/authorization.test.js"
import { InternalServerError } from "infra/errors.js";
import authorization from "models/authorization.js";

describe("models/authorization.js", () => {
  describe(".can()", () => {
    test("without user", () => {
      expect(() => {
        authorization.can();
      }).toThrow(InternalServerError);
    });
    test("without user.features", () => {
      const createdUser = {
        username: "UserWithoutFeatures",
      };
      expect(() => {
        authorization.can(createdUser);
      }).toThrow(InternalServerError);
    });
  });
});
```

Criamos apenas um teste simples que espera que se eu chamar o método `can()` sem passar nenhum usuário como argumento, ou se eu passar um usuário sem features, o sistema lançará um internal server error.

!!! note

    Nota que nesse código do teste, eu não posso fazer um `expect(authorization.can()).toThrow(InternalServerError)`, porque isso executaria o método `can`, ele daria um erro e pararia a execução, e assim nunca chegaríamos no `expect`, pois no JavaScript os argumentos são computados antes da função. O que precisamos fazer é passar uma referência para que o `toThrow` execute ela, e essa referência é uma função não executada. Por isso a gente passa uma arrow function anônima no expect.

## Criando a validação do método `can`

O teste acima vai quebrar, pois estamos esperando um `InternalServerError`, mas o nosso código está lançando um `TypeError`, pois não passamos todos os argumentos para a execução correta do método.

Vamos criar uma função de validação para

```javascript title="./models/authorization.js"
import { InternalServerError } from "infra/errors.js";

function validateUser(user) {
  if (!user || !user.features) {
    throw new InternalServerError({
      cause: "É necessário fornecer user no model authorization"
    });
  }
}

function can(user, feature, resource) {
  validateUser(user);

  // ... restante do código
```

!!! success

    Legal, o nosso teste passou! Com isso, caso em algum momento do código o desenvolvedor chame o método `can` sem passar um user, ele receberá uma mensagem bem clara dizendo que é necessário passar o user. Isso ajuda muito o desenvolvedor e não cometer erros.

## Criando o teste de validação de features

Agora vamos criar o teste se a feature que passamos para o método can é uma feature válida. Atualmente, o programador pode passar qualquer feature, então se ele digitar alguma errado, é muito difícil de debugar.

```javascript title="./tests/unit/models/authorization.test.js"
import { InternalServerError } from "infra/errors.js";
import authorization from "models/authorization.js";

describe("models/authorization.js", () => {
  describe(".can()", () => {
    // .. demais testes ocultados
    test("without unknow feature", () => {
      const createdUser = {
        features: [],
      };
      expect(() => {
        authorization.can(createdUser, "unknown:feature");
      }).toThrow(InternalServerError);
    });
  });
});
```

Esse teste não vai passar, porque atualmente não estamos fazendo essa validação se a feature `unknow:feature` que passamos de fato existe. Vamos criar isso!

Inicialmente, vamos criar uma lista estática no model authorization listando todas as features que temos até agora, e uma função de validar a feature.

```javascript title="./models/authorization.js"
const availableFeatures = [
  // USER
  "create:user",
  "read:user",
  "read:user:self",
  "update:user",
  "update:user:others",

  // SESSION
  "create:session",
  "read:session",
  "delete:session",

  // ACTIVATION TOKEN
  "read:activation_token",

  // MIGRATION
  "create:migration",
  "read:migration",

  // STATUS
  "read:status",
  "read:status:all",
];

function validateFeature(feature) {
  if (!feature || !availableFeatures.includes(feature)) {
    throw new InternalServerError({
      cause:
        "É necessário fornecer uma feature conhecida no model authorization",
    });
  }
}

function can(user, feature, resource) {
  validateUser(user);
  validateFeature(feature);
  // ... restante do código
```

E agora podemos criar o teste de sucesso

```javascript title="./tests/unit/models/authorization.test.js"
import { InternalServerError } from "infra/errors.js";
import authorization from "models/authorization.js";

describe("models/authorization.js", () => {
  describe(".can()", () => {
    // .. demais testes ocultados
    test("with valid user and known feature", () => {
      const createdUser = {
        features: ["create:user"],
      };
      expect(authorization.can(createdUser, "create:user")).toBe(true);
    });
  });
});
```

## Criando os testes do método `filterOutput`

Os testes de falha do `filterOuput` serão praticamente os mesmos dos testes de falha do `can`, só vamos criar um a mais no caso de não passarmos o output a ser filtrado como terceiro argumento da função:

```javascript title="./tests/unit/models/authorization.test.js"
import { InternalServerError } from "infra/errors.js";
import authorization from "models/authorization.js";

describe("models/authorization.js", () => {
  describe(".filterOutput()", () => {
    test("without user", () => {
      expect(() => {
        authorization.filterOutput();
      }).toThrow(InternalServerError);
    });
    test("without user.features", () => {
      const createdUser = {
        username: "UserWithoutFeatures",
      };
      expect(() => {
        authorization.filterOutput(createdUser);
      }).toThrow(InternalServerError);
    });
    test("without unknown feature", () => {
      const createdUser = {
        features: [],
      };
      expect(() => {
        authorization.filterOutput(createdUser, "unknown:feature");
      }).toThrow(InternalServerError);
    });
    test("with valid user, known feature but no resource", () => {
      const createdUser = {
        features: [],
      };
      expect(() => {
        authorization.filterOutput(createdUser, "read:user");
      }).toThrow(InternalServerError);
    });
});
```

E para eles funcionarem, basta fazermos a validação no início do método, e criar a função `validateOutput`

```javascript title="./models/authorization.js"
function filterOutput(user, feature, output) {
  validateUser(user);
  validateFeature(feature);
  validateOutput(output);
  // ... restante do código

function validateOutput(output) {
  if (!output) {
    throw new InternalServerError({
      cause: "É necessário fornecer um output para ser filtrado no filterOuput",
    });
  }
}
```

Agora o teste de sucesso vamos ter que adaptar um pouco, pois precisamos testar se um usuário consegue ler os dados de outro usuário, e que o resultado passa pelo filterOuput, removendo o email e a senha:

```javascript title="./tests/unit/models/authorization.test.js"
import { InternalServerError } from "infra/errors.js";
import authorization from "models/authorization.js";

describe("models/authorization.js", () => {
  describe(".filterOutput()", () => {
    // demais testes ocultados...
    test("with valid user, and known feature and resource", () => {
      const createdUser = {
        features: ["read:user"],
      };

      const resource = {
        id: 1,
        username: "resource",
        features: ["read:user"],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        email: "resource@resource.com",
        password: "password",
      };
      const result = authorization.filterOutput(
        createdUser,
        "read:user",
        resource,
      );
      expect(result).toEqual({
        id: 1,
        username: "resource",
        features: ["read:user"],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      });
    });
  });
});
```

!!! success

    Agora temos uma cobertura e validação dos inputs que os métodos `can` e `filterOuput` do model `authorization` recebem, o que é particularmente útil para o caso da validação das features.
