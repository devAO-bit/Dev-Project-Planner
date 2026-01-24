const Task = require('../models/Task');
const Project = require('../models/Project');
const Feature = require('../models/Feature');
const logger = require('../config/logger');

// Helper function to verify project ownership
const verifyProjectOwnership = async (projectId, userId) => {
    const project = await Project.findById(projectId);
    if (!project) {
        return { error: 'Project not found', status: 404 };
    }
    if (project.userId.toString() !== userId) {
        return { error: 'Not authorized to access this project', status: 403 };
    }
    return { project };
};


// @desc    Get all tasks for a project
// @route   GET /api/tasks/project/:projectId
// @access  Private
exports.getTasks = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { status, priority, featureId } = req.query;

        // Verify project ownership
        const verification = await verifyProjectOwnership(projectId, req.user.id);
        if (verification.error) {
            logger.warn(`[${req.id}] Unauthorized task list access`, {
                projectId,
                userId: req.user.id
            });

            return res.status(verification.status).json({
                success: false,
                message: verification.error
            });
        }

        const filters = { projectId };
        if (status) filters.status = status;
        if (priority) filters.priority = priority;
        if (featureId) filters.featureId = featureId;

        const tasks = await Task.find(filters)
            .populate('featureId', 'name type')
            .sort({ order: 1, createdAt: 1 });

        logger.info(`[${req.id}] Tasks fetched for project`, {
            projectId,
            count: tasks.length,
            userId: req.user.id
        });

        return res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        logger.error(`[${req.id}] Error fetching tasks for project`, error);
        next(error);
    }
};

// @desc    Get tasks by feature
// @route   GET /api/tasks/feature/:featureId
// @access  Private
exports.getTasksByFeature = async (req, res, next) => {
    try {
        const { featureId } = req.params;

        const feature = await Feature.findById(featureId)
            .populate('projectId', 'userId');

        if (!feature) {
            logger.warn(`[${req.id}] Feature not found while fetching tasks`, {
                featureId
            });

            return res.status(404).json({
                success: false,
                message: 'Feature not found'
            });
        }

        // Verify project ownership
        if (feature.projectId.userId.toString() !== req.user.id) {
            logger.warn(`[${req.id}] Unauthorized access to feature tasks`, {
                featureId,
                projectId: feature.projectId._id,
                userId: req.user.id
            });

            return res.status(403).json({
                success: false,
                message: 'Not authorized to access these tasks'
            });
        }

        const tasks = await Task.find({ featureId })
            .sort({ order: 1, createdAt: 1 });

        logger.info(`[${req.id}] Tasks fetched for feature`, {
            featureId,
            count: tasks.length,
            userId: req.user.id
        });

        return res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        logger.error(`[${req.id}] Error fetching tasks by feature`, error);
        next(error);
    }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('projectId', 'name userId')
            .populate('featureId', 'name type');

        if (!task) {
            logger.warn(`[${req.id}] Task not found`, {
                taskId: req.params.id
            });

            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Verify project ownership
        if (task.projectId.userId.toString() !== req.user.id) {
            logger.warn(`[${req.id}] Unauthorized task access`, {
                taskId: task._id,
                projectId: task.projectId._id,
                userId: req.user.id
            });

            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this task'
            });
        }

        logger.info(`[${req.id}] Task fetched`, {
            taskId: task._id,
            userId: req.user.id
        });

        return res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        logger.error(`[${req.id}] Error fetching task`, error);
        next(error);
    }
};


// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res, next) => {
    try {
        const { projectId, featureId } = req.body;

        // Verify project ownership
        const verification = await verifyProjectOwnership(projectId, req.user.id);
        if (verification.error) {
            logger.warn(`[${req.id}] Unauthorized task creation attempt`, {
                projectId,
                userId: req.user.id
            });

            return res.status(verification.status).json({
                success: false,
                message: verification.error
            });
        }

        // Verify feature belongs to project
        if (featureId) {
            const feature = await Feature.findOne({ _id: featureId, projectId });
            if (!feature) {
                logger.warn(`[${req.id}] Feature-project mismatch while creating task`, {
                    featureId,
                    projectId
                });

                return res.status(400).json({
                    success: false,
                    message: 'Feature does not belong to this project'
                });
            }
        }

        const lastTask = await Task.findOne({ projectId }).sort({ order: -1 });
        req.body.order = lastTask ? lastTask.order + 1 : 0;

        const task = await Task.create(req.body);
        await task.populate('featureId', 'name type');

        logger.info(`[${req.id}] Task created`, {
            taskId: task._id,
            projectId,
            featureId: featureId || null,
            userId: req.user.id
        });

        return res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: task
        });
    } catch (error) {
        logger.error(`[${req.id}] Error creating task`, error);
        next(error);
    }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res, next) => {
    try {
        let task = await Task.findById(req.params.id)
            .populate('projectId', 'userId');

        if (!task) {
            logger.warn(`[${req.id}] Task not found for update`, {
                taskId: req.params.id
            });

            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (task.projectId.userId.toString() !== req.user.id) {
            logger.warn(`[${req.id}] Unauthorized task update attempt`, {
                taskId: task._id,
                userId: req.user.id
            });

            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this task'
            });
        }

        // Verify updated feature belongs to same project
        if (req.body.featureId) {
            const feature = await Feature.findOne({
                _id: req.body.featureId,
                projectId: task.projectId._id
            });

            if (!feature) {
                logger.warn(`[${req.id}] Invalid feature assignment during task update`, {
                    taskId: task._id,
                    featureId: req.body.featureId
                });

                return res.status(400).json({
                    success: false,
                    message: 'Feature does not belong to this project'
                });
            }
        }

        task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('featureId', 'name type');

        logger.info(`[${req.id}] Task updated`, {
            taskId: task._id,
            userId: req.user.id
        });

        return res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: task
        });
    } catch (error) {
        logger.error(`[${req.id}] Error updating task`, error);
        next(error);
    }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('projectId', 'userId');

        if (!task) {
            logger.warn(`[${req.id}] Task not found for deletion`, {
                taskId: req.params.id
            });

            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (task.projectId.userId.toString() !== req.user.id) {
            logger.warn(`[${req.id}] Unauthorized task deletion attempt`, {
                taskId: task._id,
                userId: req.user.id
            });

            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this task'
            });
        }

        await Task.findByIdAndDelete(req.params.id);

        logger.info(`[${req.id}] Task deleted`, {
            taskId: task._id,
            userId: req.user.id
        });

        return res.status(200).json({
            success: true,
            message: 'Task deleted successfully',
            data: {}
        });
    } catch (error) {
        logger.error(`[${req.id}] Error deleting task`, error);
        next(error);
    }
};

// @desc    Reorder tasks
// @route   PUT /api/tasks/reorder
// @access  Private
exports.reorderTasks = async (req, res, next) => {
    try {
        const { tasks } = req.body;

        if (!Array.isArray(tasks) || tasks.length === 0) {
            logger.warn(`[${req.id}] Invalid reorder tasks payload`);

            return res.status(400).json({
                success: false,
                message: 'Please provide tasks array'
            });
        }

        const taskIds = tasks.map(t => t.id);
        const existingTasks = await Task.find({ _id: { $in: taskIds } })
            .populate('projectId', 'userId');

        for (const task of existingTasks) {
            if (task.projectId.userId.toString() !== req.user.id) {
                logger.warn(`[${req.id}] Unauthorized task reorder attempt`, {
                    taskId: task._id,
                    userId: req.user.id
                });

                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to reorder these tasks'
                });
            }
        }

        await Promise.all(
            tasks.map(({ id, order }) =>
                Task.findByIdAndUpdate(id, { order })
            )
        );

        logger.info(`[${req.id}] Tasks reordered`, {
            count: tasks.length,
            userId: req.user.id
        });

        return res.status(200).json({
            success: true,
            message: 'Tasks reordered successfully'
        });
    } catch (error) {
        logger.error(`[${req.id}] Error reordering tasks`, error);
        next(error);
    }
};

