import email from "infra/email.js";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.deleteAllEmails();
  await orchestrator.waitForAllServices();
});

describe("Test infra/email.js", () => {
  test("send()", async () => {
    await email.send({
      from: "MeuBonsai <contato@meubonsai.app>",
      to: "contato@brunononogaki.com",
      subject: "Teste de email",
      text: "Text de corpo",
      // html:
    });

    await email.send({
      from: "MeuBonsai <contato@meubonsai.app>",
      to: "contato@brunononogaki.com",
      subject: "Último email enviado",
      text: "Text de corpo",
    });

    const lastEmail = await orchestrator.getLastEmail();
    expect(lastEmail.sender).toBe("<contato@meubonsai.app>");
    expect(lastEmail.recipients[0]).toBe("<contato@brunononogaki.com>");
    expect(lastEmail.subject).toBe("Último email enviado");
    expect(lastEmail.text).toBe("Text de corpo\n");
  });
});
