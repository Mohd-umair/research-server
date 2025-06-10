const serviceHandler = (asyncFn) => {
  return (req, res, next) => {
    return asyncFn(req, res, next).catch((err) => {
      throw err; // to stop execution of code in service layer
    });
  };
};

module.exports = serviceHandler;
