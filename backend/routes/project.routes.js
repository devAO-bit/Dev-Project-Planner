const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    getProjectStats
} = require('../controllers/project.controller');

const router = express.Router();

// Validation rules
const projectValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Project name is required')
        .isLength({ max: 100 }).withMessage('Project name cannot exceed 100 characters'),
    body('description')
        .trim()
        .notEmpty().withMessage('Project description is required')
        .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
    body('category')
        .notEmpty().withMessage('Category is required')
        .isIn(['Web App', 'Mobile', 'API', 'Tool', 'Library', 'Other'])
        .withMessage('Invalid category'),
    body('targetTimeline')
        .isInt({ min: 1 }).withMessage('Target timeline must be at least 1 week'),
    body('difficulty')
        .optional()
        .isIn(['Easy', 'Medium', 'Hard']).withMessage('Invalid difficulty level'),
    body('status')
        .optional()
        .isIn(['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'])
        .withMessage('Invalid status')
];

const updateProjectValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Project name cannot exceed 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
    body('category')
        .optional()
        .isIn(['Web App', 'Mobile', 'API', 'Tool', 'Library', 'Other'])
        .withMessage('Invalid category'),
    body('targetTimeline')
        .optional()
        .isInt({ min: 1 }).withMessage('Target timeline must be at least 1 week'),
    body('difficulty')
        .optional()
        .isIn(['Easy', 'Medium', 'Hard']).withMessage('Invalid difficulty level'),
    body('status')
        .optional()
        .isIn(['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'])
        .withMessage('Invalid status')
];

// All routes require authentication
router.use(protect);

// Routes
router.route('/')
    .get(getProjects)
    .post(validate(projectValidation), createProject);

router.route('/:id')
    .get(getProject)
    .put(validate(updateProjectValidation), updateProject)
    .delete(deleteProject);

router.get('/:id/stats', getProjectStats);

module.exports = router;