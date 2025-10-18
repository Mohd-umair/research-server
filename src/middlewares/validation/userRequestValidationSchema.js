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
    
    // Document validations - all optional
    body('documentDoi')
      .optional(),
    
    body('documentTitle')
      .optional(),
    
    body('documentType')
      .optional(),
    
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
      .optional(),
    
    body('documentAuthor')
      .optional(),
    
    body('documentPublishedDate')
      .optional()
      .isISO8601()
      .withMessage('Published date must be a valid date'),
  ];
};

module.exports = userRequestValidationRules; 