import user from "models/user.js";
import { NotFoundError, UnauthorizedError } from "infra/errors.js";
import password from "models/password";

async function getAuthenticatedUser(providedEmail, providedPassword) {
  try {
    const userFound = await findUserByEmail(providedEmail);
    await validatePassword(providedPassword, userFound.password);
    return userFound;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw new UnauthorizedError({
        message: "Dados de autenticação não conferem.",
        action: "Verifique se os dados enviados estão corretos.",
      });
    }
    throw error;
  }

  async function findUserByEmail(providedEmail) {
    let userFound;
    try {
      userFound = await user.findOneByEmail(providedEmail);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new UnauthorizedError({
          message: "Dados de autenticação não conferem.",
          action: "Verifique se os dados enviados estão corretos.",
        });
      }
      throw error;
    }
    return userFound;
  }

  async function validatePassword(providedPassword, storedPassword) {
    try {
      const correctPasswordMatch = await password.compare(
        providedPassword,
        storedPassword,
      );

      if (!correctPasswordMatch) {
        throw new UnauthorizedError({
          message: "Senha incorreta.",
          action: "Verifique se os dados enviados estão corretos.",
        });
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw new UnauthorizedError({
          message: "Dados de autenticação não conferem.",
          action: "Verifique se os dados enviados estão corretos.",
        });
      }
      throw error;
    }
  }
}

const authentication = {
  getAuthenticatedUser,
};

export default authentication;
