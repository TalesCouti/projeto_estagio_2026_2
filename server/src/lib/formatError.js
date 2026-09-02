function formatError(error) {
  if (!error) {
    return "Erro desconhecido.";
  }

  if (error.message) {
    return error.message;
  }

  if (error.code) {
    return error.code;
  }

  if (Array.isArray(error.errors)) {
    return error.errors.map((item) => item.message || item.code || String(item)).join("; ");
  }

  return String(error);
}

module.exports = formatError;
