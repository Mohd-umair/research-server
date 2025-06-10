const asyncHandler = (asyncFn) => {
  return (req, res, next) => {
    return asyncFn(req, res, next).catch((err) => {
      next(err); // to catch error and pass it to global error handler
    });
  };
};

module.exports = asyncHandler;
