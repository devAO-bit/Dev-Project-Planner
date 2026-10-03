const mongoose = require('mongoose');

// Recomputes a project's stored feature/task counters and progress from the persisted
// Feature and Task documents. Used by paths that change features/tasks without going
// through the Task/Feature save hooks (feature delete, direct feature update).
//
// Project status is intentionally left untouched: updateProgress() is reused only for the
// progress rule, and the previous status is restored.
const syncProjectStats = async (projectId) => {
    const Project = mongoose.model('Project');
    const Feature = mongoose.model('Feature');
    const Task = mongoose.model('Task');

    const [totalFeatures, completedFeatures, totalTasks, completedTasks] = await Promise.all([
        Feature.countDocuments({ projectId }),
        Feature.countDocuments({ projectId, status: 'Completed' }),
        Task.countDocuments({ projectId }),
        Task.countDocuments({ projectId, status: 'Done' })
    ]);

    const project = await Project.findById(projectId);
    if (!project) return null;

    const previousStatus = project.status;

    project.stats.totalFeatures = totalFeatures;
    project.stats.completedFeatures = completedFeatures;
    project.stats.totalTasks = totalTasks;
    project.stats.completedTasks = completedTasks;
    project.updateProgress();
    project.status = previousStatus;

    await project.save();
    return project;
};

module.exports = syncProjectStats;
