const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const { chatService } = require("./ChatService");

const chatCtrl = {
  createChat: asyncHandler(async (req, res, next) => {
    const chatDTO = req.body;
    const savedChat = await chatService.createChats(chatDTO);
    return successResponse({ data: savedChat, msg: "Message sent", res: res });
  }),
  getAll: asyncHandler(async (req, res, next) => {
    const courseDto = req.body;
    const { savedData, totalCount } = await chatService.getAll(courseDto);
    return successResponse({
      res,
      data: savedData,
      count: totalCount,
      msg: "All Courses",
    });
  }),

  getById: asyncHandler(async (req, res, next) => {
    const courseId = req.body;
    const courseById = await courseService.getById(courseId);
    return successResponse({ res, data: courseById, msg: "Course By Id" });
  }),
  inbox: asyncHandler(async (req, res, next) => {
    const inbox = await chatService.getInbox(req.body);
    return successResponse({ data: inbox, res, msg: "Teacher Inbox" });
  }),

  update: asyncHandler(async (req, res, next) => {
    const courseDto = req.body;
    const updatedCourse = await courseService.update(courseDto);
    return successResponse({
      res,
      data: updatedCourse,
      msg: "Updated Course successfully",
    });
  }),

  getChatsBetweenUsers: asyncHandler(async (req, res, next) => {
    const chatDTO = req.body;
    const oldChats = await chatService.getChatOfTwoUsers(chatDTO);
    return successResponse({
      res,
      data: oldChats,
      msg: "Old Chats Fetched",
    });
  }),

  delete: asyncHandler(async (req, res, next) => {
    const courseId = req.body;
    const deletedDoc = await courseService.delete(courseId);
    return successResponse({
      res,
      data: deletedDoc,
      msg: "Course Deleted Successfully",
    });
  }),
};
module.exports = { chatCtrl };
