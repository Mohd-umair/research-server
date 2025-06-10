const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const EventServices = require("./eventService");
const jwt = require("jsonwebtoken");

const eventCtrl = {
  create: asyncHandler(async (req, res, next) => {
    const eventDTO = req.body;
    try {
      const savedEvent = await EventServices.create(eventDTO);
      return successResponse({
        res: res,
        data: savedEvent,
        msg: "Event Created Successfully!",
      });
    } catch (error) {
      console.error("Error saving event:", error.message);
      return res.status(500).json({ message: "Failed to create event." });
    }
  }),

  getAll: asyncHandler(async (req, res, next) => {
    try {
      const eventDTO = req.body;
      const { savedData, totalCount } = await EventServices.getAll(eventDTO);

      return successResponse({
        res: res,
        data: savedData,
        count: totalCount,
        msg: "All events fetched successfully",
      });
    } catch (error) {
      console.error("Error in getAll:", error);
      return next(new Error("Something went wrong while fetching data."));
    }
  }),

  getById: asyncHandler(async (req, res, next) => {
    try {
      const eventDTO = req.body;
      const eventById = await EventServices.getById(eventDTO);

      return successResponse({
        res: res,
        data: eventById,
        msg: "Event by Id",
      });
    } catch (error) {
      console.error("Error in getById:", error);
      return next(new Error("Something went wrong while fetching data."));
    }
  }),

  update: asyncHandler(async (req, res, next) => {
    try {
      const eventDTO = req.body;
      const updatedEvent = await EventServices.update(eventDTO);
      return successResponse({
        res,
        data: updatedEvent,
        msg: "Updated Event Successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  delete: asyncHandler(async (req, res, next) => {
    try {
      const eventDTO = req.body;
      const deleteEvent = await EventServices.delete(eventDTO);
      return successResponse({
        res,
        data: deleteEvent,
        msg: "Deleted event successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Additional method to update event status
  updateStatus: asyncHandler(async (req, res, next) => {
    try {
      const eventDTO = req.body;
      const updatedEvent = await EventServices.updateStatus(eventDTO);
      return successResponse({
        res,
        data: updatedEvent,
        msg: "Event status updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Additional method to update attendee count
  updateAttendeeCount: asyncHandler(async (req, res, next) => {
    try {
      const eventDTO = req.body;
      const updatedEvent = await EventServices.updateAttendeeCount(eventDTO);
      return successResponse({
        res,
        data: updatedEvent,
        msg: "Event attendee count updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }),
};

module.exports = eventCtrl; 