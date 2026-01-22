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

// Post-save middleware to update project and feature stats
taskSchema.post('save', async function () {
    const Project = mongoose.model('Project');
    const Feature = mongoose.model('Feature');

    // Update project stats
    const projectTasks = await mongoose.model('Task').find({ projectId: this.projectId });
    await Project.findByIdAndUpdate(this.projectId, {
        'stats.totalTasks': projectTasks.length,
        'stats.completedTasks': projectTasks.filter(t => t.status === 'Done').length
    });

    // Update feature stats if task belongs to a feature
    if (this.featureId) {
        const featureTasks = await mongoose.model('Task').find({ featureId: this.featureId });
        const feature = await Feature.findById(this.featureId);

        if (feature) {
            feature.taskCount = featureTasks.length;
            feature.completedTaskCount = featureTasks.filter(t => t.status === 'Done').length;
            feature.updateProgress();
            await feature.save();
        }
    }

    // Update project progress
    const project = await Project.findById(this.projectId);
    if (project) {
        project.updateProgress();
        await project.save();
    }
});

// Post-remove middleware
taskSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        const Project = mongoose.model('Project');
        const Feature = mongoose.model('Feature');

        // Update project stats
        const projectTasks = await mongoose.model('Task').find({ projectId: doc.projectId });
        await Project.findByIdAndUpdate(doc.projectId, {
            'stats.totalTasks': projectTasks.length,
            'stats.completedTasks': projectTasks.filter(t => t.status === 'Done').length
        });

        // Update feature stats
        if (doc.featureId) {
            const featureTasks = await mongoose.model('Task').find({ featureId: doc.featureId });
            const feature = await Feature.findById(doc.featureId);

            if (feature) {
                feature.taskCount = featureTasks.length;
                feature.completedTaskCount = featureTasks.filter(t => t.status === 'Done').length;
                feature.updateProgress();
                await feature.save();
            }
        }

        // Update project progress
        const project = await Project.findById(doc.projectId);
        if (project) {
            project.updateProgress();
            await project.save();
        }
    }
});

module.exports = mongoose.model('Task', taskSchema);