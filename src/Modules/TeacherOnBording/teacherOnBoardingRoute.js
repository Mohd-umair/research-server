const { verifyToken } = require('../../Utils/utils');
const  teacheronboardingCtrl= require('./teacherOnBoardingCtrl')

const router = require('express').Router();

router.post("/submitRequest", teacheronboardingCtrl.submitRequest);
router.post("/getPendingOnboardingRequests", teacheronboardingCtrl.getPendingOnboardingRequests)
router.post("/approveOnboarding", teacheronboardingCtrl.approveOnboardingRequest);
router.post("/activeBankOrDeactive", teacheronboardingCtrl.activeBank);
router.post("/rejectOnboarding", teacheronboardingCtrl.rejectOnboardingRequest);


const teacherOnBoardingRouter = router

module.exports= {teacherOnBoardingRouter}