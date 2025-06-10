const { default: mongoose } = require("mongoose");
const DbService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const uploadFileService = require("../../Utils/uploader");
const courseEnrollmentService = require("../CourseEnrollment/courseEnrollmentService");
const Course = require("./coursesModel");
const CourseEnrollment = require("../CourseEnrollment/courseEnrollmentModel");
const CustomError = require("../../Errors/CustomError");
const model = new DbService(Course);
const { ObjectId } = mongoose.Types;

const courseService = {
  create: serviceHandler(async (data) => {
    const { files } = data;
    const { courseBanner, courseThumbnail } = files;

    const promises = [
      uploadFileService.uploadFile(courseBanner, "Images"),
      uploadFileService.uploadFile(courseThumbnail, "Images"),
    ];
    const [bannerResult, thumbnailResult] = await Promise.all(promises);

    data.courseBanner = bannerResult.Location;
    data.courseThumbnail = thumbnailResult.Location;
    return await model.save(data);
  }),

getAll: serviceHandler(async (data) => {
  const role = data.userRole;

  const query = { isDelete: false };

  if (role === "TEACHER") {
    query.createdBy = data.createdBy;
  }
  const { search } = data;
  if (search) {
    query.courseName = { $regex: search, $options: "i" }; 
  }
  const populate = [
    {
      path: "instructor", 
    },
  ];
  const options = { ...data, populate };

  const savedData = await model.getAllDocuments(query, options);
  const totalCount = await model.totalCounts({ isDelete: false });

  return { savedData, totalCount };
}),


  getById: serviceHandler(async (dataId) => {
    const { courseId, decodedUser } = dataId;

    const aggregatePipeline = [
      { $match: { _id: new ObjectId(courseId), isDelete: false } },
      {
        $lookup: {
          from: "courseenrollments",
          let: { courseId: "$_id", studentId: new ObjectId(decodedUser._id) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$courseId", "$$courseId"] },
                    { $eq: ["$studentId", "$$studentId"] },
                    { $eq: ["$isEnrolled", true] },
                  ],
                },
              },
            },
          ],
          as: "isStudentEnrolled",
        },
      },
      {
        $addFields: {
          isStudentEnrolled: {
            $cond: {
              if: { $gt: [{ $size: "$isStudentEnrolled" }, 0] },
              then: true,
              else: false,
            },
          },
        },
      },

      {
        $lookup: {
          from: "CourseEnrollment",
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$courseId", "$$courseId"] },
              },
            },
            {
              $count: "enrollmentCount",
            },
          ],
          as: "enrollmentCount",
        },
      },
      {
        $lookup: {
          from: "profiles",
          localField: "instructor",
          foreignField: "_id",
          as: "instructor",
        },
      },
      {
        $addFields: {
          instructor: { $arrayElemAt: ["$instructor", 0] },
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "_id",
          foreignField: "courseId",
          as: "videos",
          pipeline: [
            {
              $project: {
                videoTitle: 1,
              },
            },
          ],
        },
      },
    ];
    const data = await model.aggregatePipeline(aggregatePipeline);
    return data[0];
  }),
  getUserCourses: async (userId) => {
    const userCourses = await CourseEnrollment.find({
      studentId: userId,
      isEnrolled: true,
    }).populate("courseId");
    if (!userCourses || userCourses.length === 0) {
      throw new CustomError(400, "No Course exist yet");
    }
    return userCourses;
  },
  update: serviceHandler(async (updateData) => {
    const { courseId } = updateData;
    const filter = { _id: courseId };
    const updatePayload = { ...updateData };
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),
  delete: serviceHandler(async (deleteId) => {
    const { courseId } = deleteId;
    const deletedDoc = await model.updateDocument(
      { _id: courseId },
      { isDelete: true }
    );
    return deletedDoc;
  }),
};

module.exports = courseService;
