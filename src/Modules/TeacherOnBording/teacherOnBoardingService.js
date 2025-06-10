const TeacherOnbording = require("./teacherOnBordingModel.js");
const DbService = require("../../Service/DbService.js");
const serviceHandler = require("../../Utils/serviceHandler.js");
const CustomError = require("../../Errors/CustomError.js");
const { generatePassword, hashPassword } = require("../../Utils/utils.js");
const PROFILE = require("../Profiles/profileModel.js");
const model = new DbService(TeacherOnbording);
const profileModel = new DbService(PROFILE);
const { sendCustomEmail } = require("../../Utils/mailer.js");
const callRazorpayApi = require("../../Utils/razorpayHelper.js");
const { v4: uuidv4 } = require('uuid')
const paymentGatewayInstance = require("../../Utils/paymentGatewayUtil.js");


const teacherOnBordingService = {

  
  submitRequest: serviceHandler(async (data) => {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      onboardingStatus = 'pending', 
      isActive = false, 
      password,
    } = data;

    const isTeacher = await model.getDocument({ email });
    const hashedPassword = await hashPassword(password, 10);
    if (isTeacher) {
      throw new CustomError(400, "Teacher with this email already exists");
    }

    const payload = {
      firstName,
      lastName,
      email,
      phoneNumber,
      onboardingStatus, 
      isActive, 
      password: hashedPassword
    
    };
    return await model.save(payload);
  }),

  getPendingRequests: serviceHandler(async (data) => {
    const query = { onboardingStatus: "pending" };

    const { search } = data;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }
    const result = await model.getAllDocuments(query, data);
    const pendingCount = await model.totalCounts(query);

    return { result, pendingCount };
  }),

  approveOnboarding: serviceHandler(async (data) => {
    const { onboardId } = data;

    const isOnboardTeacher = await model.getDocumentById({ _id: onboardId });
    if (!isOnboardTeacher) {
      throw new CustomError(404, "Teacher onboarding request not found");
    } else if (isOnboardTeacher.onboardingStatus !== "pending") {
      throw new CustomError(
        400,
        "Teacher onboarding request is already approved or rejected"
      );
    }

    const generatedPwd = generatePassword(12);
    const hashedPassword = await hashPassword(generatedPwd, 10);

    const newTeacherPayload = {
      name: `${isOnboardTeacher.firstName} ${isOnboardTeacher.lastName}`,
      qualification: isOnboardTeacher.qualification,
      profileImage: isOnboardTeacher.profileImage || "",
      experience: isOnboardTeacher.experience,
      username: isOnboardTeacher.firstName + isOnboardTeacher.email,
      phoneNumber: isOnboardTeacher.phoneNumber,
      email: isOnboardTeacher.email,
      password: hashedPassword,
      role: "TEACHER",
      accountNumber: isOnboardTeacher.accountNumber,
      IFSC_Code: isOnboardTeacher.IFSC_Code,
      address: isOnboardTeacher.address,
      skills: isOnboardTeacher.skills,
      degree: isOnboardTeacher.degree,
      language: isOnboardTeacher.language,
      specialisation: isOnboardTeacher.specialisation,
      institute: isOnboardTeacher.institute,
    };

    const payload = {
      email: newTeacherPayload.email,
      phone: newTeacherPayload.phoneNumber,
      type: "route",
      reference_id: uuidv4().substring(0,18),
      legal_business_name: newTeacherPayload.name,
      business_type: "partnership",
      contact_name: newTeacherPayload.name,
      profile: {
        category: "education",
        subcategory: "university",
        // addresses: {
        //   registered: {
        //     street1: newTeacherPayload.address.city,
        //     street2: newTeacherPayload.address.street,
        //     city: newTeacherPayload.address.city,
        //     state: newTeacherPayload.address.state,
        //     postal_code: newTeacherPayload.address.postalCode,
        //     country: newTeacherPayload.address.country,
        //   },
        // },
      },
    };



    // try {
    //   const contactPayload = {
    //     name: newTeacherPayload.name,
    //     email: newTeacherPayload.email,
    //     contact: newTeacherPayload.phoneNumber
    //   };
    //   console.log("INIT: Creating Contact Account", contactPayload)
    //   const {id} = await paymentGatewayInstance.createContact(contactPayload)

    //   const fundAccountPayload = {
    //     contact_id: id,
    //     ifsc: newTeacherPayload.IFSC_Code,
    //     account_number: newTeacherPayload.accountNumber,
    //     name: isOnboardTeacher.bankName,
    //   };

    //   const fundAcccountRes =await paymentGatewayInstance.createFundAccount(fundAccountPayload);
    //   // const response = await callRazorpayApi("/v2/accounts", "POST", payload);

    //   console.log("Razorpay contact and fund account created:", fundAcccountRes);

    //   // Only save teacher after successful Razorpay account creation
    //   newTeacherPayload.contactId = id;
    //   newTeacherPayload.fundId = fundAcccountRes.id;
    //   const newTeacher = await profileModel.save(newTeacherPayload);

    //   await model.updateDocument(
    //     { _id: onboardId },
    //     { onboardingStatus: "approved" }
    //   );


    //   const dashboardPath =
    //     process.env.FRONTEND_URL ?? `https://admin.researchdecode.com/`;
    //   const emailPayload = {
    //     name: newTeacher.name,
    //     email: isOnboardTeacher.email,
    //     password: generatedPwd,
    //     loginUrl: dashboardPath,
    //   };

    //   await sendCustomEmail(
    //     newTeacher.email,
    //     "onboarding-approval",
    //     "Congrats For Approval Of Supervisor At ResearchDecode",
    //     emailPayload
    //   );

    //   delete newTeacher.password;
    //   return newTeacher;
    // } catch (error) {
    //   console.error("Error creating Razorpay account:", error);
    //   throw new CustomError(
    //     500,
    //     "Error creating Razorpay account. Please try again."
    //   );
    // }
  }),

  activateBank: serviceHandler(async (data) => {
    const { teacherId } = data;

    if (!teacherId) {
      throw new CustomError(400, "Teacher ID is required");
    }

    const query = { _id: teacherId };

    const teacher = await profileModel.getDocumentById(query);

    if (!teacher) {
      throw new CustomError(404, "Teacher not found");
    }

    const updateData = { isBankActive: !teacher.isBankActive };
    const options = { new: true };

    const teacherUpdate = await profileModel.updateDocument(
      query,
      updateData,
      options
    );

    return {
      message: teacherUpdate.isBankActive
        ? "Bank account activated successfully"
        : "Bank account deactivated successfully",
      teacher: teacherUpdate,
    };
  }),

  rejectOnboarding: serviceHandler(async (data) => {
    const { onboardId } = data;
    const isOnboardTeacher = await model.getDocumentById({ _id: onboardId });
    if (!isOnboardTeacher) {
      throw new CustomError(404, "Teacher onboarding request not found");
    } else if (isOnboardTeacher.onboardingStatus !== "pending") {
      throw new CustomError(
        400,
        "Teacher onboarding request is already approved or rejected"
      );
    }


    await model.updateDocument(
      { _id: onboardId },
      { onboardingStatus: "rejected" }
    );


    return "Teacher Rejected Successfully";




  }),
};

const TeacherServiceOnboardingService = teacherOnBordingService;
module.exports = TeacherServiceOnboardingService;
