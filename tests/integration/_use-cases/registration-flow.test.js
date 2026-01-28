import orchestrator from "tests/orchestrator.js";
import activation from "models/activation";
import webserver from "infra/webserver";
import user from "models/user";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use case: Registration Flow (all successful)", () => {
  let createUserResponseBody;
  let activationTokenObject;
  let createSessionsResponseBody;

  test("Create user account", async () => {
    const createUserResponse = await fetch(
      "http://localhost:3000/api/v1/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "RegistrationFlow",
          email: "registration.flow@email.com",
          password: "senha123",
        }),
      },
    );
    expect(createUserResponse.status).toBe(201);

    createUserResponseBody = await createUserResponse.json();

    expect(createUserResponseBody).toEqual({
      id: createUserResponseBody.id,
      username: "RegistrationFlow",
      email: "registration.flow@email.com",
      features: ["read:activation_token"],
      password: createUserResponseBody.password,
      created_at: createUserResponseBody.created_at,
      updated_at: createUserResponseBody.updated_at,
    });
  });

  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();
    expect(lastEmail.sender).toBe("<contato@meubonsai.app>");
    expect(lastEmail.recipients[0]).toBe("<registration.flow@email.com>");
    expect(lastEmail.subject).toBe("Ative seu cadastro no MeuBonsai.App");
    expect(lastEmail.text).toContain("RegistrationFlow");

    const activationTokenId = orchestrator.extractUUID(lastEmail.text);
    expect(lastEmail.text).toContain(
      `${webserver.getOrigin()}/cadastro/ativar/${activationTokenId}`,
    );

    activationTokenObject =
      await activation.findOneValidById(activationTokenId);
    expect(activationTokenObject.user_id).toBe(createUserResponseBody.id);
    expect(activationTokenObject.used_at).toBe(null);
  });

  test("Activation account", async () => {
    const activationResponse = await fetch(
      `http://localhost:3000/api/v1/activations/${activationTokenObject.id}`,
      {
        method: "PATCH",
      },
    );
    expect(activationResponse.status).toBe(200);

    const activationResposeBody = await activationResponse.json();
    expect(Date.parse(activationResposeBody.used_at)).not.toBeNull();

    const activatedUser = await user.findOneByUsername("RegistrationFlow");
    expect(activatedUser.features).toEqual(["create:session", "read:session"]);
  });

  test("Login", async () => {
    const createSessionResponse = await fetch(
      "http://localhost:3000/api/v1/sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: createUserResponseBody.email,
          password: "senha123",
        }),
      },
    );

    expect(createSessionResponse.status).toBe(201);
    createSessionsResponseBody = await createSessionResponse.json();
    expect(createSessionsResponseBody).toEqual({
      id: createSessionsResponseBody.id,
      token: createSessionsResponseBody.token,
      user_id: createUserResponseBody.id,
      created_at: createSessionsResponseBody.created_at,
      updated_at: createSessionsResponseBody.updated_at,
      expires_at: createSessionsResponseBody.expires_at,
    });
  });
  test("Get user information", async () => {
    const responseUserInformation = await fetch(
      "http://localhost:3000/api/v1/user",
      {
        headers: {
          Cookie: `session_id=${createSessionsResponseBody.token}`,
        },
      },
    );
    expect(responseUserInformation.status).toBe(200);
    const responseUserInformationBody = await responseUserInformation.json();
    expect(responseUserInformationBody).toEqual({
      id: createUserResponseBody.id,
      username: "RegistrationFlow",
      email: createUserResponseBody.email,
      features: ["create:session", "read:session"],
      password: createUserResponseBody.password,
      created_at: createUserResponseBody.created_at,
      updated_at: responseUserInformationBody.updated_at,
    });
    expect(uuidVersion(responseUserInformationBody.id)).toBe(4);
    expect(Date.parse(responseUserInformationBody.created_at)).not.toBeNaN();
    expect(Date.parse(responseUserInformationBody.created_at)).not.toBeNaN();
  });
});
