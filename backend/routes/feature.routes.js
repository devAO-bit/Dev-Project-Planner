const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const {
    getFeatures,
    getFeature,
    createFeature,
    updateFeature,
    deleteFeature,
    reorderFeatures
} = require('../controllers/feature.controller');

const router = express.Router();

// Validation rules
const featureValidation = [
    body('projectId')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID'),
    body('name')
        .trim()
        .notEmpty().withMessage('Feature name is required')
        .isLength({ max: 200 }).withMessage('Feature name cannot exceed 200 characters'),
    body('description')
        .trim()
        .notEmpty().withMessage('Feature description is required')
        .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
    body('type')
        .notEmpty().withMessage('Feature type is required')
        .isIn(['core', 'nice-to-have', 'stretch']).withMessage('Invalid feature type'),
    body('priority')
        .optional()
        .isIn(['Critical', 'High', 'Medium', 'Low']).withMessage('Invalid priority'),
    body('status')
        .optional()
        .isIn(['Planned', 'In Progress', 'Testing', 'Completed', 'Blocked'])
        .withMessage('Invalid status')
];

const updateFeatureValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Feature name cannot exceed 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
    body('type')
        .optional()
        .isIn(['core', 'nice-to-have', 'stretch']).withMessage('Invalid feature type'),
    body('priority')
        .optional()
        .isIn(['Critical', 'High', 'Medium', 'Low']).withMessage('Invalid priority'),
    body('status')
        .optional()
        .isIn(['Planned', 'In Progress', 'Testing', 'Completed', 'Blocked'])
        .withMessage('Invalid status')
];

const reorderValidation = [
    body('features')
        .isArray({ min: 1 }).withMessage('Features must be an array with at least one item'),
    body('features.*.id')
        .isMongoId().withMessage('Invalid feature ID'),
    body('features.*.order')
        .isInt({ min: 0 }).withMessage('Order must be a non-negative integer')
];

// All routes require authentication
router.use(protect);

// Routes
router.post('/', validate(featureValidation), createFeature);
router.put('/reorder', validate(reorderValidation), reorderFeatures);
router.get('/project/:projectId', getFeatures);

router.route('/:id')
    .get(getFeature)
    .put(validate(updateFeatureValidation), updateFeature)
    .delete(deleteFeature);

module.exports = router;