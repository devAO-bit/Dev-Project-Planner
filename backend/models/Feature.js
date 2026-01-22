const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'Feature must belong to a project']
    },
    name: {
        type: String,
        required: [true, 'Please provide a feature name'],
        trim: true,
        maxlength: [200, 'Feature name cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Please provide a feature description'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    type: {
        type: String,
        enum: ['core', 'nice-to-have', 'stretch'],
        default: 'core',
        required: true
    },
    status: {
        type: String,
        enum: ['Planned', 'In Progress', 'Testing', 'Completed', 'Blocked'],
        default: 'Planned'
    },
    priority: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low'],
        default: 'Medium'
    },
    // Statistics
    taskCount: {
        type: Number,
        default: 0
    },
    completedTaskCount: {
        type: Number,
        default: 0
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
featureSchema.index({ projectId: 1, status: 1 });
featureSchema.index({ projectId: 1, type: 1 });
featureSchema.index({ projectId: 1, order: 1 });

// Virtual for tasks
featureSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'featureId'
});

// Update feature progress based on tasks
featureSchema.methods.updateProgress = function () {
    if (this.taskCount > 0) {
        this.progress = Math.round((this.completedTaskCount / this.taskCount) * 100);
    } else {
        this.progress = 0;
    }
};

// Static method to get features by project
featureSchema.statics.getProjectFeatures = async function (projectId, filters = {}) {
    const query = { projectId, ...filters };
    return this.find(query)
        .sort({ order: 1, createdAt: 1 })
        .select('-__v');
};

// Post-save middleware to update project stats
featureSchema.post('save', async function () {
    const Project = mongoose.model('Project');
    const features = await mongoose.model('Feature').find({ projectId: this.projectId });

    const stats = {
        totalFeatures: features.length,
        completedFeatures: features.filter(f => f.status === 'Completed').length
    };

    await Project.findByIdAndUpdate(this.projectId, {
        'stats.totalFeatures': stats.totalFeatures,
        'stats.completedFeatures': stats.completedFeatures
    });
});

// Post-remove middleware to update project stats
featureSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        const Project = mongoose.model('Project');
        const features = await mongoose.model('Feature').find({ projectId: doc.projectId });

        const stats = {
            totalFeatures: features.length,
            completedFeatures: features.filter(f => f.status === 'Completed').length
        };

        await Project.findByIdAndUpdate(doc.projectId, {
            'stats.totalFeatures': stats.totalFeatures,
            'stats.completedFeatures': stats.completedFeatures
        });
    }
});

module.exports = mongoose.model('Feature', featureSchema);