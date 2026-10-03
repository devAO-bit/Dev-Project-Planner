const Project = require('../models/Project');
const Feature = require('../models/Feature');
const Task = require('../models/Task');
const logger = require('../config/logger');
const pickFields = require('../utils/pickFields');

// Client-editable project fields. Ownership (userId), progress, stats and
// timestamps are server-controlled and must never be taken from a request body.
const PROJECT_CREATE_FIELDS = ['name', 'description', 'category', 'targetTimeline', 'difficulty', 'status'];
// endDate is derived from startDate + targetTimeline (see Project.calculateEndDate), so it is
// not client-editable.
const PROJECT_UPDATE_FIELDS = PROJECT_CREATE_FIELDS;

// @desc    Get all projects for logged in user
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res, next) => {
    try {
        const { status, category, search } = req.query;

        const filters = { userId: req.user.id };

        if (status) filters.status = status;
        if (category) filters.category = category;

        let query = Project.find(filters);

        // Text search
        if (search) {
            query = query.or([
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]);
        }

        const projects = await query.sort({ updatedAt: -1 });

        logger.info(`[${req.id}] Retrieved projects`, {
            userId: req.user.id,
            count: projects.length,
            filters: { status, category, search }
        });

        return res.status(200).json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
        logger.error(`[${req.id}] Error fetching projects`, error);
        next(error);
    }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            logger.warn(`[${req.id}] Project not found`, {
                projectId: req.params.id
            });

            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Authorization check
        if (project.userId.toString() !== req.user.id) {
            logger.warn(`[${req.id}] Unauthorized project access attempt`, {
                projectId: project._id,
                userId: req.user.id
            });

            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this project'
            });
        }

        logger.info(`[${req.id}] Retrieved project`, {
            projectId: project._id,
            userId: req.user.id
        });

        return res.status(200).json({
            success: true,
            data: project
        });
    } catch (error) {
        logger.error(`[${req.id}] Error fetching project`, error);
        next(error);
    }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res, next) => {
    try {
        const project = await Project.create({
            ...pickFields(req.body, PROJECT_CREATE_FIELDS),
            userId: req.user.id
        });

        logger.info(`[${req.id}] Project created`, {
            projectId: project._id,
            userId: req.user.id
        });

        return res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: project
        });
    } catch (error) {
        logger.error(`[${req.id}] Error creating project`, error);
        next(error);
    }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res, next) => {
    try {
        let project = await Project.findById(req.params.id);

        if (!project) {
            logger.warn(`[${req.id}] Project not found for update`, {
                projectId: req.params.id
            });

            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Authorization check
        if (project.userId.toString() !== req.user.id) {
            logger.warn(`[${req.id}] Unauthorized project update attempt`, {
                projectId: project._id,
                userId: req.user.id
            });

            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this project'
            });
        }

        // Ownership cannot be transferred through the update endpoint
        if (
            req.body.userId !== undefined &&
            String(req.body.userId) !== project.userId.toString()
        ) {
            logger.warn(`[${req.id}] Attempt to change project owner`, {
                projectId: project._id,
                userId: req.user.id
            });

            return res.status(400).json({
                success: false,
                message: 'Project ownership cannot be changed'
            });
        }

        const updates = pickFields(req.body, PROJECT_UPDATE_FIELDS);

        // findByIdAndUpdate bypasses the Project pre('save') date rule, so apply it here
        if (updates.targetTimeline !== undefined && project.startDate) {
            updates.endDate = Project.calculateEndDate(project.startDate, updates.targetTimeline);
        }

        project = await Project.findByIdAndUpdate(
            req.params.id,
            updates,
            {
                new: true,
                runValidators: true
            }
        );

        logger.info(`[${req.id}] Project updated`, {
            projectId: project._id,
            userId: req.user.id,
            updatedFields: Object.keys(updates)
        });

        return res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            data: project
        });
    } catch (error) {
        logger.error(`[${req.id}] Error updating project`, error);
        next(error);
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            logger.warn(`[${req.id}] Project not found for deletion`, {
                projectId: req.params.id
            });

            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Authorization check
        if (project.userId.toString() !== req.user.id) {
            logger.warn(`[${req.id}] Unauthorized project deletion attempt`, {
                projectId: project._id,
                userId: req.user.id
            });

            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this project'
            });
        }

        // Cascade deletes
        const [featuresResult, tasksResult] = await Promise.all([
            Feature.deleteMany({ projectId: project._id }),
            Task.deleteMany({ projectId: project._id })
        ]);

        await Project.findByIdAndDelete(project._id);

        logger.info(`[${req.id}] Project deleted`, {
            projectId: project._id,
            userId: req.user.id,
            deletedFeatures: featuresResult.deletedCount,
            deletedTasks: tasksResult.deletedCount
        });

        return res.status(200).json({
            success: true,
            message: 'Project deleted successfully',
            data: {}
        });
    } catch (error) {
        logger.error(`[${req.id}] Error deleting project`, error);
        next(error);
    }
};

// @desc    Get project statistics
// @route   GET /api/projects/:id/stats
// @access  Private
exports.getProjectStats = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            logger.warn(`[${req.id}] Project not found for stats`, {
                projectId: req.params.id
            });

            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Authorization check
        if (project.userId.toString() !== req.user.id) {
            logger.warn(`[${req.id}] Unauthorized project stats access`, {
                projectId: project._id,
                userId: req.user.id
            });

            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this project'
            });
        }

        const [features, tasks] = await Promise.all([
            Feature.find({ projectId: project._id }),
            Task.find({ projectId: project._id })
        ]);

        const stats = {
            project: {
                name: project.name,
                status: project.status,
                progress: project.progress,
                startDate: project.startDate,
                endDate: project.endDate,
                daysRemaining: project.endDate
                    ? Math.ceil((project.endDate - Date.now()) / (1000 * 60 * 60 * 24))
                    : null
            },
            features: {
                total: features.length,
                byType: {
                    core: features.filter(f => f.type === 'core').length,
                    niceToHave: features.filter(f => f.type === 'nice-to-have').length,
                    stretch: features.filter(f => f.type === 'stretch').length
                },
                byStatus: {
                    planned: features.filter(f => f.status === 'Planned').length,
                    inProgress: features.filter(f => f.status === 'In Progress').length,
                    testing: features.filter(f => f.status === 'Testing').length,
                    completed: features.filter(f => f.status === 'Completed').length,
                    blocked: features.filter(f => f.status === 'Blocked').length
                }
            },
            tasks: {
                total: tasks.length,
                byStatus: {
                    todo: tasks.filter(t => t.status === 'Todo').length,
                    inProgress: tasks.filter(t => t.status === 'In Progress').length,
                    review: tasks.filter(t => t.status === 'Review').length,
                    done: tasks.filter(t => t.status === 'Done').length
                },
                byPriority: {
                    critical: tasks.filter(t => t.priority === 'Critical').length,
                    high: tasks.filter(t => t.priority === 'High').length,
                    medium: tasks.filter(t => t.priority === 'Medium').length,
                    low: tasks.filter(t => t.priority === 'Low').length
                }
            }
        };

        logger.info(`[${req.id}] Project statistics retrieved`, {
            projectId: project._id,
            userId: req.user.id,
            featureCount: features.length,
            taskCount: tasks.length
        });

        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error(`[${req.id}] Error fetching project stats`, error);
        next(error);
    }
};
