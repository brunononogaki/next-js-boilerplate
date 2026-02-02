import database from "infra/database.js";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST to /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    describe("Running pending migrations", () => {
      test("First run", async () => {
        const response1 = await fetch(
          "http://localhost:3000/api/v1/migrations",
          {
            method: "POST",
          },
        );
        expect(response1.status).toBe(403);

        const responseBody1 = await response1.json();
        expect(responseBody1).toEqual({
          name: "ForbiddenError",
          message: "Você não possui permissão para executar esta ação.",
          action:
            'Verifique se o seu usuário possui a feature: "create:migration"',
          status_code: 403,
        });
      });
    });
  });
  describe("Default user", () => {
    describe("Running pending migrations", () => {
      test("First run", async () => {
        const createdUser = await orchestrator.createUser();
        const activatedUser = await orchestrator.activateUser(createdUser);
        const sessionObject = await orchestrator.createSession(
          activatedUser.id,
        );

        const response1 = await fetch(
          "http://localhost:3000/api/v1/migrations",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${sessionObject.token}`,
            },
          },
        );
        expect(response1.status).toBe(403);

        const responseBody1 = await response1.json();
        expect(responseBody1).toEqual({
          name: "ForbiddenError",
          message: "Você não possui permissão para executar esta ação.",
          action:
            'Verifique se o seu usuário possui a feature: "create:migration"',
          status_code: 403,
        });
      });
    });
  });
  describe("Privileged user", () => {
    describe("Running pending migrations", () => {
      test("First run", async () => {
        const privilegedUser = await orchestrator.createUser();
        const activatedPrivilegedUser =
          await orchestrator.activateUser(privilegedUser);

        await orchestrator.addFeaturesToUser(privilegedUser, [
          "create:migration",
        ]);

        const privilegedUserSession = await orchestrator.createSession(
          activatedPrivilegedUser.id,
        );

        const response1 = await fetch(
          "http://localhost:3000/api/v1/migrations",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${privilegedUserSession.token}`,
            },
          },
        );
        expect(response1.status).toBe(200);

        const responseBody1 = await response1.json();
        console.log(responseBody1);
        expect(Array.isArray(responseBody1)).toBe(true);
        // expect(responseBody1.length).toBe(0);
        // expect(responseBody1.length).toBeGreaterThan(0);
      });
      // test("Second run", async () => {
      //   const response2 = await fetch(
      //     "http://localhost:3000/api/v1/migrations",
      //     {
      //       method: "POST",
      //     },
      //   );
      //   expect(response2.status).toBe(200);

      //   // Segundo POST
      //   const responseBody2 = await response2.json();
      //   expect(Array.isArray(responseBody2)).toBe(true);
      //   expect(responseBody2.length).toBe(0);
      // });
    });
  });
});
