const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'Task must belong to a project']
    },
    featureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feature',
        default: null
    },
    title: {
        type: String,
        required: [true, 'Please provide a task title'],
        trim: true,
        maxlength: [200, 'Task title cannot exceed 200 characters']
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    status: {
        type: String,
        enum: ['Todo', 'In Progress', 'Review', 'Done'],
        default: 'Todo'
    },
    priority: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low'],
        default: 'Medium'
    },
    dueDate: {
        type: Date
    },
    order: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ featureId: 1, status: 1 });
taskSchema.index({ projectId: 1, dueDate: 1 });
taskSchema.index({ projectId: 1, order: 1 });

// Static method to get tasks by project
taskSchema.statics.getProjectTasks = async function (projectId, filters = {}) {
    const query = { projectId, ...filters };
    return this.find(query)
        .populate('featureId', 'name type')
        .sort({ order: 1, createdAt: 1 })
        .select('-__v');
};

// Static method to get tasks by feature
taskSchema.statics.getFeatureTasks = async function (featureId) {
    return this.find({ featureId })
        .sort({ order: 1, createdAt: 1 })
        .select('-__v');
};

// Helper function to update all related stats
async function updateRelatedStats(taskDoc) {
    const Project = mongoose.model('Project');
    const Feature = mongoose.model('Feature');
    const Task = mongoose.model('Task');

    try {
        // Update project stats
        const projectTasks = await Task.find({ projectId: taskDoc.projectId });
        const projectCompletedTasks = projectTasks.filter(t => t.status === 'Done').length;

        const project = await Project.findById(taskDoc.projectId);
        if (project) {
            project.stats.totalTasks = projectTasks.length;
            project.stats.completedTasks = projectCompletedTasks;
            project.updateProgress();
            await project.save();
            console.log(`✅ Updated project stats: ${projectCompletedTasks}/${projectTasks.length} tasks`);
        }

        // Update feature stats if task belongs to a feature
        if (taskDoc.featureId) {
            const featureTasks = await Task.find({ featureId: taskDoc.featureId });
            const featureCompletedTasks = featureTasks.filter(t => t.status === 'Done').length;

            const feature = await Feature.findById(taskDoc.featureId);
            if (feature) {
                const oldStatus = feature.status;

                feature.taskCount = featureTasks.length;
                feature.completedTaskCount = featureCompletedTasks;
                feature.updateProgress();

                // AUTO-UPDATE FEATURE STATUS based on progress
                if (featureTasks.length > 0) {
                    if (featureCompletedTasks === 0) {
                        // No tasks completed yet
                        if (feature.status === 'Completed') {
                            feature.status = 'Planned';
                        }
                    } else if (featureCompletedTasks === featureTasks.length) {
                        // ALL tasks completed - auto-complete feature
                        feature.status = 'Completed';
                        console.log(`🎉 Feature "${feature.name}" auto-completed (all tasks done)`);
                    } else {
                        // Some tasks done but not all
                        if (feature.status === 'Planned' || feature.status === 'Completed') {
                            feature.status = 'In Progress';
                            console.log(`🔄 Feature "${feature.name}" auto-changed to In Progress`);
                        }
                    }
                }

                await feature.save();
                console.log(`✅ Updated feature stats: ${featureCompletedTasks}/${featureTasks.length} tasks (${feature.status})`);

                if (oldStatus !== feature.status) {
                    console.log(`📊 Feature status changed: ${oldStatus} → ${feature.status}`);
                }
            }
        }
    } catch (error) {
        console.error('Error updating related stats:', error);
    }
}

// Post-save middleware to update project and feature stats
taskSchema.post('save', async function (doc) {
    await updateRelatedStats(doc);
});

// Post-update middleware
taskSchema.post('findOneAndUpdate', async function (doc) {
    if (doc) {
        await updateRelatedStats(doc);
    }
});

// Post-remove middleware
taskSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        const Project = mongoose.model('Project');
        const Feature = mongoose.model('Feature');
        const Task = mongoose.model('Task');

        try {
            // Update project stats after deletion
            const projectTasks = await Task.find({ projectId: doc.projectId });
            const project = await Project.findById(doc.projectId);

            if (project) {
                project.stats.totalTasks = projectTasks.length;
                project.stats.completedTasks = projectTasks.filter(t => t.status === 'Done').length;
                project.updateProgress();
                await project.save();
            }

            // Update feature stats after deletion
            if (doc.featureId) {
                const featureTasks = await Task.find({ featureId: doc.featureId });
                const feature = await Feature.findById(doc.featureId);

                if (feature) {
                    const featureCompletedTasks = featureTasks.filter(t => t.status === 'Done').length;

                    feature.taskCount = featureTasks.length;
                    feature.completedTaskCount = featureCompletedTasks;
                    feature.updateProgress();

                    // Update status after deletion
                    if (featureTasks.length === 0) {
                        // No tasks left
                        feature.status = 'Planned';
                    } else if (featureCompletedTasks === featureTasks.length) {
                        // All remaining tasks completed
                        feature.status = 'Completed';
                    } else if (featureCompletedTasks === 0) {
                        // No tasks completed
                        if (feature.status === 'Completed' || feature.status === 'In Progress') {
                            feature.status = 'Planned';
                        }
                    } else {
                        // Some tasks completed
                        if (feature.status === 'Completed' || feature.status === 'Planned') {
                            feature.status = 'In Progress';
                        }
                    }

                    await feature.save();
                    console.log(`✅ Updated feature after deletion: ${featureCompletedTasks}/${featureTasks.length} tasks (${feature.status})`);
                }
            }
        } catch (error) {
            console.error('Error updating stats after deletion:', error);
        }
    }
});

module.exports = mongoose.model('Task', taskSchema);