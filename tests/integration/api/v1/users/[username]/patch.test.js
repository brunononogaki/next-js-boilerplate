import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";
import user from "models/user.js";
import password from "models/password.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH to /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With unique username", async () => {
      await orchestrator.createUser({
        username: "UniqueEmail1",
      });

      const userToBeUpdated = {
        email: "uniqueemail2@email.com",
      };

      const responseUpdate = await fetch(
        "http://localhost:3000/api/v1/users/UniqueEmail1",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userToBeUpdated),
        },
      );

      expect(responseUpdate.status).toBe(403);

      const responseUpdateBody = await responseUpdate.json();

      expect(responseUpdateBody).toEqual({
        action: 'Verifique se o seu usuário possui a feature: "update:user"',
        message: "Você não possui permissão para executar esta ação.",
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });
  describe("Default user", () => {
    test("With non existent username", async () => {
      const createdUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(activatedUser.id);

      const response = await fetch(
        "http://localhost:3000/api/v1/users/usuarionaoexiste",
        {
          method: "PATCH",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );
      expect(response.status).toBe(404);
      const responseUpdateBody = await response.json();
      expect(responseUpdateBody).toEqual({
        name: "NotFoundError",
        message: "O username informado não foi encontrado no sistema.",
        action: "Verifique se o username está digitado corretamente.",
        status_code: 404,
      });
    });
    test("With duplicated username", async () => {
      await orchestrator.createUser({
        username: "UsernameDuplicado1",
      });

      const createdUser2 = await orchestrator.createUser({
        username: "UsernameDuplicado2",
      });
      const activatedUser2 = await orchestrator.activateUser(createdUser2);
      const sessionObject = await orchestrator.createSession(activatedUser2.id);

      const userToBeUpdated = {
        username: "UsernameDuplicado1",
      };

      const responseUpdate = await fetch(
        "http://localhost:3000/api/v1/users/UsernameDuplicado2",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(userToBeUpdated),
        },
      );

      expect(responseUpdate.status).toBe(400);

      const responseUpdateBody = await responseUpdate.json();

      expect(responseUpdateBody).toEqual({
        name: "ValidationError",
        message: "O username informado já está sendo utilizado.",
        action: "Utilize outro username para realizar esta operação.",
        status_code: 400,
      });
    });
    test("With duplicated email", async () => {
      await orchestrator.createUser({
        email: "usernameduplicado3@email.com",
      });

      const createdUser2 = await orchestrator.createUser({
        email: "usernameduplicado4@email.com",
      });

      const activatedUser2 = await orchestrator.activateUser(createdUser2);
      const sessionObject = await orchestrator.createSession(activatedUser2.id);

      const userToBeUpdated = {
        email: "usernameduplicado3@email.com",
      };

      const responseUpdate = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser2.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(userToBeUpdated),
        },
      );

      expect(responseUpdate.status).toBe(400);

      const responseUpdateBody = await responseUpdate.json();

      expect(responseUpdateBody).toEqual({
        name: "ValidationError",
        message: "O email informado já está sendo utilizado.",
        action: "Utilize outro email para realizar esta operação.",
        status_code: 400,
      });
    });
    test("With unique username", async () => {
      const createdUser = await orchestrator.createUser({
        username: "UniqueUsername1",
      });
      const activatedUser = await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(activatedUser.id);

      const userToBeUpdated = {
        email: "uniqueusername2@email.com",
      };

      const responseUpdate = await fetch(
        "http://localhost:3000/api/v1/users/UniqueUsername1",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(userToBeUpdated),
        },
      );

      expect(responseUpdate.status).toBe(200);

      const responseUpdateBody = await responseUpdate.json();

      expect(responseUpdateBody).toEqual({
        id: responseUpdateBody.id,
        username: "UniqueUsername1",
        email: "uniqueusername2@email.com",
        features: ["create:session", "read:session", "update:user"],
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
    test("With user2 targeting user1", async () => {
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

      const responseUpdateBody = await responseUpdate.json();

      expect(responseUpdateBody).toEqual({
        "action": "Verifique se você possui a feature necessária para atualizar outro usuário.",
        "message": "Você não possui permissão para atualizar outro usuário.",
        "name": "ForbiddenError",
        "status_code": 403,
      });
    });    
    test("With unique email", async () => {
      const createdUser = await orchestrator.createUser({
        email: "uniqueuser1@email.com",
      });
      const activatedUser = await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(activatedUser.id);

      const userToBeUpdated = {
        email: "uniqueuser2@email.com",
      };

      const responseUpdate = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(userToBeUpdated),
        },
      );

      expect(responseUpdate.status).toBe(200);

      const responseUpdateBody = await responseUpdate.json();

      expect(responseUpdateBody).toEqual({
        id: responseUpdateBody.id,
        username: createdUser.username,
        email: "uniqueuser2@email.com",
        features: ["create:session", "read:session", "update:user"],
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
    test("With new password", async () => {
      const createdUser = await orchestrator.createUser({
        password: "senha123",
      });
      const activatedUser = await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(activatedUser.id);

      const userToBeUpdated = {
        password: "NewPassword",
      };

      const responseUpdate = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(userToBeUpdated),
        },
      );

      expect(responseUpdate.status).toBe(200);

      const responseUpdateBody = await responseUpdate.json();

      expect(responseUpdateBody).toEqual({
        id: responseUpdateBody.id,
        username: createdUser.username,
        email: createdUser.email,
        features: ["create:session", "read:session", "update:user"],
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

      // Coleta dos dados do usuário na base e comparação dos hashes das senhas
      const userInDatabase = await user.findOneByUsername(createdUser.username);
      const correctPasswordMatch = await password.compare(
        "NewPassword",
        userInDatabase.password,
      );

      const incorrectPasswordMatch = await password.compare(
        "senha123",
        userInDatabase.password,
      );
      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });
  });
});
