const consultancyCardCtrl = require("./consultancyCardCtrl");
const { verifyToken } = require("../../Utils/utils");
const consultancyCardRouter = require("express").Router();

consultancyCardRouter.post("/create",verifyToken,  consultancyCardCtrl.create);
consultancyCardRouter.post("/getById", consultancyCardCtrl.getById);
consultancyCardRouter.post("/getAll",  consultancyCardCtrl.getAll);
consultancyCardRouter.post("/getUserConsultancyCard",verifyToken,consultancyCardCtrl.getUserConsultancyCard);
consultancyCardRouter.post("/update", verifyToken, consultancyCardCtrl.update);
consultancyCardRouter.post("/delete", verifyToken, consultancyCardCtrl.delete);
module.exports = consultancyCardRouter;
