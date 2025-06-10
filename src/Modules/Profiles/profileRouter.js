const profileCtrl = require('./profileCtrl')

const router = require('express').Router();

router.post("/create" , profileCtrl.create)
router.post("/getAll" , profileCtrl.getAll)
router.post("/getUser" , profileCtrl.getById)
router.post("/delete" , profileCtrl.delete)
router.post("/update" , profileCtrl.update)
router.post("/signIn" , profileCtrl.signIn)

const profileRouter = router

module.exports= {profileRouter}