const { verifyToken, checkAccess } = require('../../Utils/utils');
const subjectCtrl = require('./subjectCtrl')

const router = require('express').Router();

router.post("/create" , subjectCtrl.create)
router.post("/getAll" ,verifyToken ,  subjectCtrl.getAll)
router.post("/getById" , subjectCtrl.getById)
router.post("/delete" , subjectCtrl.delete)
router.post("/update" , subjectCtrl.update)

const subjectRouter = router

module.exports= {subjectRouter}
