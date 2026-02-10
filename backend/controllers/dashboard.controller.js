const Project = require('../models/Project');
const Feature = require('../models/Feature');
const Task = require('../models/Task');
const logger = require('../config/logger');

// @desc    Get dashboard statistics for logged in user
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // 1️⃣ Get all user projects
        const projects = await Project.find({ userId }).select('_id');

        const projectIds = projects.map(p => p._id);

        // Early return (no projects)
        if (projectIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    totalProjects: 0,
                    totalFeatures: 0,
                    completedFeatures: 0,
                    totalTasks: 0,
                    completedTasks: 0
                }
            });
        }

        // 2️⃣ Fetch features & tasks in parallel
        const [features, tasks] = await Promise.all([
            Feature.find({ projectId: { $in: projectIds } }),
            Task.find({ projectId: { $in: projectIds } })
        ]);

        // 3️⃣ Aggregate stats
        const stats = {
            totalProjects: projects.length,

            totalFeatures: features.length,
            completedFeatures: features.filter(
                f => f.status === 'Completed'
            ).length,

            totalTasks: tasks.length,
            completedTasks: tasks.filter(
                t => t.status === 'Done'
            ).length
        };

        logger.info(`[${req.id}] Dashboard statistics retrieved`, {
            userId,
            projectCount: stats.totalProjects,
            featureCount: stats.totalFeatures,
            taskCount: stats.totalTasks
        });

        return res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error(`[${req.id}] Error fetching dashboard stats`, error);
        next(error);
    }
};
