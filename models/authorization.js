import { InternalServerError } from "infra/errors.js";

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

function can(user, feature, resource) {
  validateUser(user);
  validateFeature(feature);

  let authorized = false;
  if (user.features.includes(feature)) {
    authorized = true;
  }

  if (feature === "update:user" && resource) {
    authorized = false;
    if (user.id === resource.id || can(user, "update:user:others")) {
      authorized = true;
    }
  }

  return authorized;
}

function filterOutput(user, feature, output) {
  validateUser(user);
  validateFeature(feature);
  validateOutput(output);

  if (feature === "read:user" || feature === "update:user") {
    return {
      id: output.id,
      username: output.username,
      features: output.features,
      created_at: output.created_at,
      updated_at: output.updated_at,
    };
  }

  if (feature === "read:user:self") {
    if (user.id === output.id) {
      return {
        id: output.id,
        username: output.username,
        email: output.email,
        features: output.features,
        created_at: output.created_at,
        updated_at: output.updated_at,
      };
    }
  }

  if (feature === "read:session" || feature === "delete:session") {
    if (user.id === output.user_id) {
      return {
        id: output.id,
        token: output.token,
        user_id: output.user_id,
        expires_at: output.expires_at,
        created_at: output.created_at,
        updated_at: output.updated_at,
      };
    }
  }

  if (feature === "read:activation_token") {
    return {
      id: output.id,
      user_id: output.user_id,
      used_at: output.used_at,
      expires_at: output.expires_at,
      created_at: output.created_at,
      updated_at: output.updated_at,
    };
  }

  if (feature === "read:migration" || feature == "create:migration") {
    return output.map((migration) => {
      return {
        path: migration.path,
        name: migration.name,
        timestamp: migration.timestamp,
      };
    });
  }

  if (feature === "read:status") {
    const base_output = {
      updated_at: output.updated_at,
      dependencies: {
        database: {
          max_connections: output.dependencies.database.max_connections,
          opened_connections: output.dependencies.database.opened_connections,
        },
      },
    };

    if (can(user, "read:status:all")) {
      base_output.dependencies.database.version =
        output.dependencies.database.version;
    }

    return base_output;
  }
}

function validateOutput(output) {
  if (!output) {
    throw new InternalServerError({
      cause: "É necessário fornecer um output para ser filtrado no filterOuput",
    });
  }
}

function validateUser(user) {
  if (!user || !user.features) {
    throw new InternalServerError({
      cause: "É necessário fornecer user no model authorization",
    });
  }
}

function validateFeature(feature) {
  if (!feature || !availableFeatures.includes(feature)) {
    throw new InternalServerError({
      cause:
        "É necessário fornecer uma feature conhecida no model authorization",
    });
  }
}

const authorization = {
  can,
  filterOutput,
};

export default authorization;
