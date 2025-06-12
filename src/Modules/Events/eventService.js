const EventModel = require("./eventModel");
const DbService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const CustomError = require("../../Errors/CustomError");
const model = new DbService(EventModel);

const eventService = {
  create: serviceHandler(async (data) => {
    return await model.save(data);
  }),

  getAll: serviceHandler(async (data) => {
    const { userRole, createdBy } = data;
    const query = { isDelete: false };
    
    // Filter by current user for all roles - each user should only see their own events
    if (createdBy) {
      query.createdBy = createdBy;
    }
    
    const { search, status, type } = data;
    
    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { organizerName: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } }
      ];
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by type if provided
    if (type) {
      query.type = type;
    }

    const savedData = await model.getAllDocuments(query);
    const totalCount = await model.totalCounts(query);
    
    return { savedData, totalCount };
  }),

  getById: serviceHandler(async (data) => {
    const { _id: eventId } = data;
    const query = { _id: eventId, isDelete: false };
    const savedDataById = await model.getDocumentById(query);
    return savedDataById;
  }),

  update: serviceHandler(async (data) => {
    const { _id: eventId } = data;
    const filter = { _id: eventId };
    const updatePayload = { ...data };
    delete updatePayload._id; // Remove _id from update payload
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),

  delete: serviceHandler(async (data) => {
    const { _id: eventId } = data;
    const query = { _id: eventId };
    const deletedDocDetails = await model.getDocumentById(query);
    // Soft delete by setting isDelete to true
    const deletedDoc = await model.updateDocument(query, { isDelete: true });
    return deletedDocDetails;
  }),

  // Additional method to update event status
  updateStatus: serviceHandler(async (data) => {
    const { _id: eventId, status } = data;
    const filter = { _id: eventId };
    const updatePayload = { status };
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),

  // Additional method to update attendee count
  updateAttendeeCount: serviceHandler(async (data) => {
    const { _id: eventId, attendees } = data;
    const filter = { _id: eventId };
    const updatePayload = { attendees };
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),
};

const EventService = eventService;
module.exports = EventService; 