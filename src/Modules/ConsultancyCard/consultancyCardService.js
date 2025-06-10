const DatabaseService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const ConsultancyCard = require("./consultancyCardModel");

const model = new DatabaseService(ConsultancyCard);

const consultancyCardService = {
  create: serviceHandler(async (data) => {
    console.log(data)
    const payload = { ...data, teacherId : data.createdBy}
    return await model.save(payload);
  }),

  getAll: serviceHandler(async (data) => {
    const { search = "", userRole, createdBy, skip = 0, limit = 10 } = data;

    const query = { isDelete: false };
    
    // Apply search filter
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Set up pagination options
    const options = {
      populate: [{ path: "teacherId" }],
      skip: parseInt(skip),
      limit: parseInt(limit),
      sort: { createdAt: -1 } // Sort by newest first
    };

    // Get total count for pagination
    const totalCount = await ConsultancyCard.countDocuments(query);
    
    // Get paginated results
    const results = await model.getAllDocuments(query, options);

    // Filter by user role if needed
    const filteredData = userRole === "TEACHER"
      ? results.filter((item) => item.teacherId?._id.toString() === createdBy.toString())
      : results;

    return {
      data: filteredData,
      totalCount: userRole === "TEACHER" 
        ? filteredData.length 
        : totalCount,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil((userRole === "TEACHER" ? filteredData.length : totalCount) / limit),
      hasNextPage: skip + limit < (userRole === "TEACHER" ? filteredData.length : totalCount),
      hasPrevPage: skip > 0
    };
  }),

  getById: serviceHandler(async (data) => {
    const { consultancyCardId } = data;
    const query = { _id: consultancyCardId };
    const populateOptions = [{ path: "teacherId" }];
    return await model.getDocumentById(query, populateOptions);
  }),

  getUserConsultancyCard: serviceHandler(async (teacherId) => {
    const query = { teacherId: teacherId, isDelete: false }; // Assuming userId is a field in the model
    return await model.getAllDocuments(query);
  }),

  update: serviceHandler(async (data) => {
    const { consultancyCardId, ...updateData } = data; // Extract ID and other fields
    const query = { _id: consultancyCardId };
    return await model.updateDocument(query, updateData);
  }),

  delete: serviceHandler(async (data) => {
    const { consultancyCardId } = data;
    const query = { _id: consultancyCardId };
    return await model.deleteDocument(query);
  }),
};

module.exports = consultancyCardService;
