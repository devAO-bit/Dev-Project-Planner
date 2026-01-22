const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const {
    getTasks,
    getTasksByFeature,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks
} = require('../controllers/task.controller');

const router = express.Router();

// Validation rules
const taskValidation = [
    body('projectId')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID'),
    body('featureId')
        .optional()
        .isMongoId().withMessage('Invalid feature ID'),
    body('title')
        .trim()
        .notEmpty().withMessage('Task title is required')
        .isLength({ max: 200 }).withMessage('Task title cannot exceed 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
    body('status')
        .optional()
        .isIn(['Todo', 'In Progress', 'Review', 'Done']).withMessage('Invalid status'),
    body('priority')
        .optional()
        .isIn(['Critical', 'High', 'Medium', 'Low']).withMessage('Invalid priority'),
    body('dueDate')
        .optional()
        .isISO8601().withMessage('Invalid due date format')
];

const updateTaskValidation = [
    body('featureId')
        .optional()
        .isMongoId().withMessage('Invalid feature ID'),
    body('title')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Task title cannot exceed 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
    body('status')
        .optional()
        .isIn(['Todo', 'In Progress', 'Review', 'Done']).withMessage('Invalid status'),
    body('priority')
        .optional()
        .isIn(['Critical', 'High', 'Medium', 'Low']).withMessage('Invalid priority'),
    body('dueDate')
        .optional()
        .isISO8601().withMessage('Invalid due date format')
];

const reorderValidation = [
    body('tasks')
        .isArray({ min: 1 }).withMessage('Tasks must be an array with at least one item'),
    body('tasks.*.id')
        .isMongoId().withMessage('Invalid task ID'),
    body('tasks.*.order')
        .isInt({ min: 0 }).withMessage('Order must be a non-negative integer')
];

// All routes require authentication
router.use(protect);

// Routes
router.post('/', validate(taskValidation), createTask);
router.put('/reorder', validate(reorderValidation), reorderTasks);
router.get('/project/:projectId', getTasks);
router.get('/feature/:featureId', getTasksByFeature);

router.route('/:id')
    .get(getTask)
    .put(validate(updateTaskValidation), updateTask)
    .delete(deleteTask);

module.exports = router;