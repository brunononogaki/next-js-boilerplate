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
    test("With non existent username", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/users/usuarionaoexiste",
        {
          method: "PATCH",
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

      await orchestrator.createUser({
        username: "UsernameDuplicado2",
      });

      const userToBeUpdated = {
        username: "UsernameDuplicado1",
      };

      const responseUpdate = await fetch(
        "http://localhost:3000/api/v1/users/UsernameDuplicado2",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
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

      const userToBeUpdated = {
        email: "usernameduplicado3@email.com",
      };

      const responseUpdate = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser2.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
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

      expect(responseUpdate.status).toBe(200);

      const responseUpdateBody = await responseUpdate.json();

      expect(responseUpdateBody).toEqual({
        id: responseUpdateBody.id,
        username: "UniqueEmail1",
        email: "uniqueemail2@email.com",
        features: ["read:activation_token"],
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
    test("With unique email", async () => {
      const createdUser = await orchestrator.createUser({
        email: "uniqueuser1@email.com",
      });

      const userToBeUpdated = {
        email: "uniqueuser2@email.com",
      };

      const responseUpdate = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
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
        features: ["read:activation_token"],
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

      const userToBeUpdated = {
        password: "NewPassword",
      };

      const responseUpdate = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
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
        features: ["read:activation_token"],
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
