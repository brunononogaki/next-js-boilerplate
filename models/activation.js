import email from "infra/email.js";
import database from "infra/database.js";
import webserver from "infra/webserver";
import user from "models/user";
import authorization from "models/authorization.js";
import { ForbiddenError, NotFoundError } from "infra/errors";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000; // 15 minutes

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const newToken = await runInsertQuery(userId, expiresAt);
  return newToken;

  async function runInsertQuery(userId, expiresAt) {
    const results = await database.query({
      text: `
        INSERT INTO
          user_activation_tokens (user_id, expires_at)
        VALUES
          ($1, $2)
        RETURNING *
      ;`,
      values: [userId, expiresAt],
    });
    return results.rows[0];
  }
}

async function sendEmailToUser(user, activationToken) {
  await email.send({
    from: "Contato <contato@meubonsai.app>",
    to: user.email,
    subject: "Ative seu cadastro no MeuBonsai.App",
    text: `${user.username}, clique no link abaixo para ativar seu cadastro no MeuBonsai.App

${webserver.getOrigin()}/cadastro/ativar/${activationToken.id}

Atenciosamente,

Equipe MeuBonsai.App  
    `,
  });
}

async function findOneValidById(activationToken) {
  const tokenFound = await runSelectQuery(activationToken);
  return tokenFound;

  async function runSelectQuery(activationToken) {
    const results = await database.query({
      text: `
        SELECT 
          *
        FROM
          user_activation_tokens
        WHERE
          id = $1
          AND expires_at > NOW()
          AND used_at is NULL
        LIMIT 1
      `,
      values: [activationToken],
    });
    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "Token de ativação não encontrado.",
        action:
          "Verifique se este token de ativação não está expirado ou não foi utilizado.",
      });
    } else {
      return results.rows[0];
    }
  }
}

async function markTokenAsUsed(activationTokenId) {
  const updatedToken = await runUpdateQuery(activationTokenId);
  return updatedToken;

  async function runUpdateQuery(activationTokenId) {
    const results = await database.query({
      text: `
        UPDATE 
          user_activation_tokens
        SET
          used_at = timezone('utc', now()), 
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING *
      `,
      values: [activationTokenId],
    });
    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "Token de ativação não encontrado.",
        action:
          "Verifique se este token de ativação não está expirado ou não foi utilizado.",
      });
    } else {
      return results.rows[0];
    }
  }
}

async function activateUserByUserId(userId) {
  const userToActivate = await user.findOneById(userId);

  // Verifica se o usuário que está sendo ativado possui e feature read:activation_token
  if (!authorization.can(userToActivate, "read:activation_token")) {
    throw new ForbiddenError({
      message: "Você não pode mais utilizar tokens de ativação",
      action: "Entre em contato com o suporte.",
    });
  }

  const activatedUser = await user.setFeatures(userId, [
    "create:session",
    "read:session",
  ]);
  return activatedUser;
}

const activation = {
  sendEmailToUser,
  create,
  findOneValidById,
  markTokenAsUsed,
  activateUserByUserId,
  EXPIRATION_IN_MILLISECONDS,
};

export default activation;
