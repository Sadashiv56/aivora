export const success = (res, data = null, message = "OK", statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data, message });
};

export const error = (res, err) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message = err.message || "Something went wrong";
  if (statusCode >= 500) {
    console.error("[error]", err);
  }
  return res.status(statusCode).json({ success: false, message, code, errors: err.errors || [] });
};