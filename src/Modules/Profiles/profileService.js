const Profile = require("./profileModel");
const DbService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const CustomError = require("../../Errors/CustomError");
const {
  hashPassword,
  comparePasswords,
  generateToken,
  generateAdminToken,
} = require("../../Utils/utils");
const model = new DbService(Profile);

const profileService = {
  create: serviceHandler(async (data) => {
    const { password, ...userData } = data;
    const hashedPassword = await hashPassword(password);

    const savedData = await model.save({
      ...userData,
      password: hashedPassword,
    });

    return savedData;
  }),

  getAll: serviceHandler(async (data) => {
    const query = { isDelete: false };
    const savedData = await model.getAllDocuments(query, data);
    const totalCount = await model.totalCounts({ isDelete: false });

    return { savedData, totalCount };
  }),
  getById: serviceHandler(async (dataId) => {
    const { profileId } = dataId;
    const query = {  _id: profileId };
    const savedDataById = await model.getDocumentById(query);
    return savedDataById;
  }),
  update: serviceHandler(async (updateData) => {
    const { profileId } = updateData;
    const filter = { _id: profileId };
    const updatePayload = { ...updateData };
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),
  delete: serviceHandler(async (deleteId) => {
    const { profileId } = deleteId;
    const deletedDoc = await model.updateDocument(
      { _id: profileId },
      { isDelete: true }
    );
    return deletedDoc;
  }),
  signIn: serviceHandler(async (data) => {
    const { email, password } = data;
    const filter = { email };
    const profile = await model.getDocument(filter);

    if (!profile) {
      throw new CustomError(404, "Profile not found");
    }
    const isPasswordMatch = await comparePasswords(password, profile.password);

    if (!isPasswordMatch) {
      throw new CustomError(401, "Incorrect password");
    }
    const token = generateAdminToken(profile);
    return { token, profile };
  }),
};
const ProfileService = profileService;
module.exports = ProfileService;
