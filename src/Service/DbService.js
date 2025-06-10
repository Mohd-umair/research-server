module.exports = class DatabaseService {
  constructor(dbSchema) {
    this.model = dbSchema;
  }
 
  async save(data) {
    const savedData = await this.model.create(data);
    return savedData;
  }

  saveMany = async (data) => {
    const documents = await this.model.insertMany(data);
    return documents;
  };
  getDocument = async (query) => {

    console.log('query', query);
    const document = await this.model.findOne(query);
    return document;
  };
  getAllDocuments = async (query, options = {}) => {
    const { limit, sort, skip, populate, isDelete } = options;
    let updatedQuery;
    if (options.hasOwnProperty("isDelete")) {
      updatedQuery = { isDelete: isDelete ? isDelete : false, ...query };
    }
    updatedQuery = { ...query };

    let customQuery = this.model.find(updatedQuery);

    if (skip !== "" && limit !== "") {
      customQuery = customQuery.limit(limit).skip(skip);
    }

    if (sort) {
      customQuery = customQuery.sort({ [sort]: -1 });
    } else {
      customQuery = customQuery.sort({ createdAt: -1 });
    }

    if (populate) {
      const documents = await customQuery.populate(populate).exec();
      return documents;
    }
    const documents = await customQuery.exec();
    return documents;
  };

  updateDocument = async (
    filter,
    data,
    options = { new: true, populate: "" }
  ) => {
    const { populate, ...updateOptions } = options;

    let customQuery = this.model.findOneAndUpdate(filter, data, updateOptions);

    if (populate) {
      customQuery = customQuery.populate(populate);
    }

    const updatedDocument = await customQuery.exec();
    return updatedDocument;
  };

  getDocumentById = async (query, populateOptions = "") => {
    let customQuery = this.model.findOne(query);

    if (populateOptions) {
      customQuery = customQuery.populate(populateOptions);
    }

    const document = await customQuery.exec();
    return document;
  };
  aggregatePipeline = async (pipeline) => {
    if (!Array.isArray(pipeline)) return;
    if (Array.isArray(pipeline) && pipeline.length < 1) return;
    return await this.model.aggregate(pipeline);
  };

  deleteDocument = async (data) => {
    const deletedDocument = await this.model.deleteOne(data);
    return deletedDocument;
  };

  totalCounts = async (query) => {
    const count = await this.model.countDocuments(query);
    return count;
  };
};
