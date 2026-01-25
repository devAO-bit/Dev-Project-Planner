const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a project name'],
        trim: true,
        maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please provide a project description'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
        type: String,
        required: [true, 'Please select a category'],
        enum: ['Web App', 'Mobile', 'API', 'Tool', 'Library', 'Other'],
        default: 'Web App'
    },
    status: {
        type: String,
        enum: ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'],
        default: 'Planning'
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Medium'
    },
    targetTimeline: {
        type: Number, // in weeks
        required: [true, 'Please provide target timeline'],
        min: [1, 'Timeline must be at least 1 week']
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Project must belong to a user']
    },
    // Progress tracking
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    // Statistics
    stats: {
        totalFeatures: { type: Number, default: 0 },
        completedFeatures: { type: Number, default: 0 },
        totalTasks: { type: Number, default: 0 },
        completedTasks: { type: Number, default: 0 }
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

// Indexes for better query performance
projectSchema.index({ userId: 1, status: 1 });
projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ name: 'text', description: 'text' });

// Virtual for features
projectSchema.virtual('features', {
    ref: 'Feature',
    localField: '_id',
    foreignField: 'projectId'
});

// Virtual for tasks
projectSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'projectId'
});

// Calculate end date based on start date and timeline
projectSchema.pre('save', function (next) {
    if (this.isModified('startDate') || this.isModified('targetTimeline')) {
        const startDate = new Date(this.startDate);
        this.endDate = new Date(startDate.setDate(startDate.getDate() + (this.targetTimeline * 7)));
    }
    next();
});

// Method to update progress
projectSchema.methods.updateProgress = function () {
    if (this.stats.totalTasks > 0) {
        this.progress = Math.round(
            (this.stats.completedTasks / this.stats.totalTasks) * 100
        );
    } else {
        this.progress = 0;
    }

    // ✅ AUTO-UPDATE STATUS
    if (this.progress === 100 && this.stats.totalTasks > 0) {
        this.status = 'Completed';
    } else if (this.progress > 0) {
        this.status = 'In Progress';
    } else {
        this.status = 'Planning';
    }
};


// Static method to get user's projects with stats
projectSchema.statics.getUserProjects = async function (userId, filters = {}) {
    const query = { userId, ...filters };
    return this.find(query)
        .sort({ updatedAt: -1 })
        .select('-__v');
};

module.exports = mongoose.model('Project', projectSchema);