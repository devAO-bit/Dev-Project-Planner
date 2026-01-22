const Project = require('../models/Project');
const Feature = require('../models/Feature');
const Task = require('../models/Task');



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

        res.status(200).json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
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
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Make sure user owns the project
        if (project.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this project'
            });
        }

        res.status(200).json({
            success: true,
            data: project
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res, next) => {
    try {
        // Add user to req.body
        req.body.userId = req.user.id;

        const project = await Project.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: project
        });
    } catch (error) {
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
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Make sure user owns the project
        if (project.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this project'
            });
        }

        project = await Project.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            data: project
        });
    } catch (error) {
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
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Make sure user owns the project
        if (project.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this project'
            });
        }

        // Delete all features and tasks associated with this project
        await Feature.deleteMany({ projectId: req.params.id });
        await Task.deleteMany({ projectId: req.params.id });

        await Project.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Project deleted successfully',
            data: {}
        });
    } catch (error) {
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
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Make sure user owns the project
        if (project.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this project'
            });
        }

        // Get detailed stats
        const features = await Feature.find({ projectId: req.params.id });
        const tasks = await Task.find({ projectId: req.params.id });

        const stats = {
            project: {
                name: project.name,
                status: project.status,
                progress: project.progress,
                startDate: project.startDate,
                endDate: project.endDate,
                daysRemaining: Math.ceil((project.endDate - Date.now()) / (1000 * 60 * 60 * 24))
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

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};