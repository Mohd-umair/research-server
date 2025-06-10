const dbService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const webinarEnrollmentModel = require("./webinarEnrollmentModel");
const webinar= require("../Webinars/webinarModel");
const model = new dbService(webinarEnrollmentModel)
const webinarModel=new dbService(webinar)
const webinarEnrollmentService = {
    create: serviceHandler(async (data) => {
        const { _id: webinarId, decodedUser: { _id: studentId } } = data;
        data = {
            webinarId,
            studentId
        }
        
        return await model.save(data);
    }),

   allEnrolledWebinars: serviceHandler(async (data) => {
    const { _id: studentId } = data.decodedUser;
    const { search } = data;

    const enrollmentQuery = { studentId };
    const savedDataById = await model.getAllDocuments(enrollmentQuery);

    if (!savedDataById.length) {
        return []; 
    }

    const webinarIds = savedDataById.map((enrollment) => enrollment.webinarId);

    const webinarQuery = { _id: { $in: webinarIds } };

    if (search) {
        webinarQuery.webinarTitle = { $regex: search, $options: "i" };
    }
    const webinarDetails = await webinarModel.getAllDocuments(webinarQuery);

    return webinarDetails;
}),


   isEnrolled: serviceHandler(async (data) => {
    const { 
        webinarId, 
        decodedUser: { _id: studentId } 
    } = data;
    
    const query = {
        webinarId,
        studentId
    };

    const findEnrollment = await model.getDocument(query);

    return !!findEnrollment;
}),

    delete: serviceHandler(async (data) => {
        const { webinarId, decodedUser:{_id: studentId} } = data;
        const query = { webinarId, studentId };
        const deletedDocDetails = await model.getDocumentById(query);
        const deletedDoc = await model.deleteDocument({ studentId, webinarId });
        return deletedDocDetails
    })
}

const WebinarEnrollmentService = webinarEnrollmentService;
module.exports = WebinarEnrollmentService;