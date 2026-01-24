const Feature = require('../models/Feature');
const Project = require('../models/Project');
const Task = require('../models/Task');
const logger = require("../config/logger");

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

// @desc    Get all features for a project
// @route   GET /api/features/project/:projectId
// @access  Private
exports.getFeatures = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { type, status } = req.query;

        // Verify project ownership
        const verification = await verifyProjectOwnership(projectId, req.user.id);
        if (verification.error) {
            logger.warn(`[${req.id}] Unauthorized feature list access`, {
                projectId,
                userId: req.user.id
            });

            return res.status(verification.status).json({
                success: false,
                message: verification.error
            });
        }

        const filters = { projectId };
        if (type) filters.type = type;
        if (status) filters.status = status;

        const features = await Feature.find(filters)
            .sort({ order: 1, createdAt: 1 });

        logger.info(`[${req.id}] Features retrieved`, {
            projectId,
            userId: req.user.id,
            count: features.length,
            filters: { type, status }
        });

        return res.status(200).json({
            success: true,
            count: features.length,
            data: features
        });
    } catch (error) {
        logger.error(`[${req.id}] Error fetching features`, error);
        next(error);
    }
};

// @desc    Get single feature
// @route   GET /api/features/:id
// @access  Private
exports.getFeature = async (req, res, next) => {
    try {
        const feature = await Feature.findById(req.params.id)
            .populate('projectId', 'name userId');

        if (!feature) {
            logger.warn(`[${req.id}] Feature not found`, {
                featureId: req.params.id
            });

            return res.status(404).json({
                success: false,
                message: 'Feature not found'
            });
        }

        // Verify project ownership
        if (feature.projectId.userId.toString() !== req.user.id) {
            logger.warn(`[${req.id}] Unauthorized feature access`, {
                featureId: feature._id,
                projectId: feature.projectId._id,
                userId: req.user.id
            });

            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this feature'
            });
        }

        logger.info(`[${req.id}] Feature retrieved`, {
            featureId: feature._id,
            projectId: feature.projectId._id,
            userId: req.user.id
        });

        return res.status(200).json({
            success: true,
            data: feature
        });
    } catch (error) {
        logger.error(`[${req.id}] Error fetching feature`, error);
        next(error);
    }
};

// @desc    Create new feature
// @route   POST /api/features
// @access  Private
exports.createFeature = async (req, res, next) => {
    try {
        const { projectId } = req.body;

        // Verify project ownership
        const verification = await verifyProjectOwnership(projectId, req.user.id);
        if (verification.error) {
            logger.warn(`[${req.id}] Unauthorized feature creation attempt`, {
                projectId,
                userId: req.user.id
            });

            return res.status(verification.status).json({
                success: false,
                message: verification.error
            });
        }

        // Determine order
        const lastFeature = await Feature.findOne({ projectId })
            .sort({ order: -1 });

        req.body.order = lastFeature ? lastFeature.order + 1 : 0;

        const feature = await Feature.create(req.body);

        logger.info(`[${req.id}] Feature created`, {
            featureId: feature._id,
            projectId,
            userId: req.user.id,
            order: feature.order
        });

        return res.status(201).json({
            success: true,
            message: 'Feature created successfully',
            data: feature
        });
    } catch (error) {
        logger.error(`[${req.id}] Error creating feature`, error);
        next(error);
    }
};

// @desc    Update feature
// @route   PUT /api/features/:id
// @access  Private
exports.updateFeature = async (req, res, next) => {
    try {
        let feature = await Feature.findById(req.params.id)
            .populate('projectId', 'userId');

        if (!feature) {
            logger.warn(`[${req.id}] Feature not found for update`, {
                featureId: req.params.id
            });

            return res.status(404).json({
                success: false,
                message: 'Feature not found'
            });
        }

        // Verify project ownership
        if (feature.projectId.userId.toString() !== req.user.id) {
            logger.warn(`[${req.id}] Unauthorized feature update attempt`, {
                featureId: feature._id,
                projectId: feature.projectId._id,
                userId: req.user.id
            });

            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this feature'
            });
        }

        feature = await Feature.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        logger.info(`[${req.id}] Feature updated`, {
            featureId: feature._id,
            projectId: feature.projectId,
            userId: req.user.id
        });

        return res.status(200).json({
            success: true,
            message: 'Feature updated successfully',
            data: feature
        });
    } catch (error) {
        logger.error(`[${req.id}] Error updating feature`, error);
        next(error);
    }
};

// @desc    Delete feature
// @route   DELETE /api/features/:id
// @access  Private
exports.deleteFeature = async (req, res, next) => {
    try {
        const feature = await Feature.findById(req.params.id)
            .populate('projectId', 'userId');

        if (!feature) {
            logger.warn(`[${req.id}] Feature not found for deletion`, {
                featureId: req.params.id
            });

            return res.status(404).json({
                success: false,
                message: 'Feature not found'
            });
        }

        // Verify project ownership
        if (feature.projectId.userId.toString() !== req.user.id) {
            logger.warn(`[${req.id}] Unauthorized feature deletion attempt`, {
                featureId: feature._id,
                projectId: feature.projectId._id,
                userId: req.user.id
            });

            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this feature'
            });
        }

        // Delete all tasks associated with this feature
        await Task.deleteMany({ featureId: req.params.id });
        await Feature.findByIdAndDelete(req.params.id);

        logger.info(`[${req.id}] Feature deleted`, {
            featureId: feature._id,
            projectId: feature.projectId._id,
            userId: req.user.id
        });

        return res.status(200).json({
            success: true,
            message: 'Feature deleted successfully',
            data: {}
        });
    } catch (error) {
        logger.error(`[${req.id}] Error deleting feature`, error);
        next(error);
    }
};

// @desc    Reorder features
// @route   PUT /api/features/reorder
// @access  Private
exports.reorderFeatures = async (req, res, next) => {
    try {
        const { features } = req.body; // [{ id, order }]

        if (!Array.isArray(features) || features.length === 0) {
            logger.warn(`[${req.id}] Invalid feature reorder payload`, {
                userId: req.user.id
            });

            return res.status(400).json({
                success: false,
                message: 'Please provide features array'
            });
        }

        const featureIds = features.map(f => f.id);

        const existingFeatures = await Feature.find({
            _id: { $in: featureIds }
        }).populate('projectId', 'userId');

        for (const feature of existingFeatures) {
            if (feature.projectId.userId.toString() !== req.user.id) {
                logger.warn(`[${req.id}] Unauthorized feature reorder attempt`, {
                    featureId: feature._id,
                    projectId: feature.projectId._id,
                    userId: req.user.id
                });

                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to reorder these features'
                });
            }
        }

        // Update order
        await Promise.all(
            features.map(({ id, order }) =>
                Feature.findByIdAndUpdate(id, { order })
            )
        );

        logger.info(`[${req.id}] Features reordered`, {
            userId: req.user.id,
            featureCount: features.length
        });

        return res.status(200).json({
            success: true,
            message: 'Features reordered successfully'
        });
    } catch (error) {
        logger.error(`[${req.id}] Error reordering features`, error);
        next(error);
    }
};
