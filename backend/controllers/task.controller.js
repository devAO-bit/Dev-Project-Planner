const Task = require('../models/Task');
const Project = require('../models/Project');
const Feature = require('../models/Feature');

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

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
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
            return res.status(404).json({
                success: false,
                message: 'Feature not found'
            });
        }

        // Verify project ownership
        if (feature.projectId.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access these tasks'
            });
        }

        const tasks = await Task.find({ featureId })
            .sort({ order: 1, createdAt: 1 });

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
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
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Verify project ownership
        if (task.projectId.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this task'
            });
        }

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
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
            return res.status(verification.status).json({
                success: false,
                message: verification.error
            });
        }

        // If featureId is provided, verify it belongs to the project
        if (featureId) {
            const feature = await Feature.findOne({ _id: featureId, projectId });
            if (!feature) {
                return res.status(400).json({
                    success: false,
                    message: 'Feature does not belong to this project'
                });
            }
        }

        // Get the highest order number
        const lastTask = await Task.findOne({ projectId })
            .sort({ order: -1 });

        req.body.order = lastTask ? lastTask.order + 1 : 0;

        const task = await Task.create(req.body);

        // Populate before sending response
        await task.populate('featureId', 'name type');

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: task
        });
    } catch (error) {
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
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Verify project ownership
        if (task.projectId.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this task'
            });
        }

        // If updating featureId, verify it belongs to the same project
        if (req.body.featureId) {
            const feature = await Feature.findOne({
                _id: req.body.featureId,
                projectId: task.projectId._id
            });
            if (!feature) {
                return res.status(400).json({
                    success: false,
                    message: 'Feature does not belong to this project'
                });
            }
        }

        task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        ).populate('featureId', 'name type');

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: task
        });
    } catch (error) {
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
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Verify project ownership
        if (task.projectId.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this task'
            });
        }

        await Task.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Task deleted successfully',
            data: {}
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reorder tasks
// @route   PUT /api/tasks/reorder
// @access  Private
exports.reorderTasks = async (req, res, next) => {
    try {
        const { tasks } = req.body; // Array of { id, order }

        if (!Array.isArray(tasks) || tasks.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide tasks array'
            });
        }

        // Verify all tasks belong to user's project
        const taskIds = tasks.map(t => t.id);
        const existingTasks = await Task.find({ _id: { $in: taskIds } })
            .populate('projectId', 'userId');

        for (const task of existingTasks) {
            if (task.projectId.userId.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to reorder these tasks'
                });
            }
        }

        // Update order for each task
        const updatePromises = tasks.map(({ id, order }) =>
            Task.findByIdAndUpdate(id, { order }, { new: true })
        );

        await Promise.all(updatePromises);

        res.status(200).json({
            success: true,
            message: 'Tasks reordered successfully'
        });
    } catch (error) {
        next(error);
    }
};
