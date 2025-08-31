const { body } = require('express-validator');

const userRequestValidationRules = () => {
  return [
    // Common validation rules
    body('type')
      .isIn(['Lab', 'Document', 'Data'])
      .withMessage('Request type must be one of: Lab, Document, Data'),
    
    // Conditional validations based on request type
    body('labNature')
      .if(body('type').equals('Lab'))
      .notEmpty()
      .withMessage('Lab nature is required for lab requests'),
    
    body('labNeeds')
      .if(body('type').equals('Lab'))
      .notEmpty()
      .withMessage('Lab needs description is required for lab requests'),
    
    // Document validations - either DOI or other details required
    body('documentDoi')
      .if(body('type').equals('Document'))
      .custom((value, { req }) => {
        // If DOI is not provided, other document fields should be provided
        if (!value && !req.body.documentTitle && !req.body.documentType) {
          throw new Error('Either DOI or document details (title, type) are required');
        }
        return true;
      }),
    
    body('documentTitle')
      .if(body('type').equals('Document'))
      .custom((value, { req }) => {
        // If no DOI, title is required
        if (!req.body.documentDoi && !value) {
          throw new Error('Document title is required when DOI is not provided');
        }
        return true;
      }),
    
    body('documentType')
      .if(body('type').equals('Document'))
      .custom((value, { req }) => {
        // If no DOI, type is required
        if (!req.body.documentDoi && !value) {
          throw new Error('Document type is required when DOI is not provided');
        }
        return true;
      }),
    
    // Data validations
    body('dataType')
      .if(body('type').equals('Data'))
      .notEmpty()
      .withMessage('Data type is required for data requests'),
    
    body('dataTitle')
      .if(body('type').equals('Data'))
      .notEmpty()
      .withMessage('Data title is required for data requests'),
    
    body('dataDescription')
      .if(body('type').equals('Data'))
      .notEmpty()
      .withMessage('Data description is required for data requests'),
    
    // Title and description - required for Lab, optional for others
    body('title')
      .if(body('type').equals('Lab'))
      .notEmpty()
      .withMessage('Title is required for lab requests')
      .if(body('type').not().equals('Lab'))
      .optional(),
    
    body('description')
      .if(body('type').equals('Lab'))
      .notEmpty()
      .withMessage('Description is required for lab requests')
      .if(body('type').not().equals('Lab'))
      .optional(),
    
    body('priority')
      .if(body('type').equals('Lab'))
      .isIn(['Low', 'Medium', 'High'])
      .withMessage('Priority must be one of: Low, Medium, High')
      .if(body('type').not().equals('Lab'))
      .optional(),
    
    // Additional field validations
    body('labAdditionalInfo')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Additional info must not exceed 500 characters'),
    
    body('documentPublisher')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Publisher name must not exceed 100 characters'),
    
    body('documentAuthor')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Author name must not exceed 100 characters'),
    
    body('documentPublishedDate')
      .optional()
      .isISO8601()
      .withMessage('Published date must be a valid date'),
  ];
};

module.exports = userRequestValidationRules; 