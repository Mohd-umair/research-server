const researchPaperRouter = require("express").Router();

const { researchPaperCtrl } = require("./researchPaperCtrl");

researchPaperRouter.post("/create", researchPaperCtrl.create);
researchPaperRouter.post("/getAll", researchPaperCtrl.getAll);
researchPaperRouter.post("/getById", researchPaperCtrl.getById);
researchPaperRouter.post("/update", researchPaperCtrl.update);
researchPaperRouter.post("/delete", researchPaperCtrl.delete);
researchPaperRouter.post("/getByDoiNumber", researchPaperCtrl.getByDoiNumber);

module.exports = { researchPaperRouter };
