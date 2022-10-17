const AppError = require("../utils/appError");


const roleMiddleware = roles => {

  let selectedRoles;
  return (req, res, next) => {
    if (typeof roles === "string") {
      selectedRoles = [roles];
    } else {
      selectedRoles = roles;
      console.log(selectedRoles)
     
    }

    if (!selectedRoles.includes(req.user.userRole)) {
      next(new AppError("Forbidden", 403));
    } else {
      next();
    }
  };
};

module.exports = roleMiddleware;
