const Task = require('../models/Task');
const Project = require('../models/Project');
const Feature = require('../models/Feature');

exports.syncProjectAndFeatureStats = async ({ projectId, featureId }) => {
  try {
    // =============================
    // Update Project Stats
    // =============================
    const projectTasks = await Task.find({ projectId });

    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(
      (task) => task.status === "Done"
    ).length;

    const project = await Project.findById(projectId);

    if (project) {
      project.stats.totalTasks = totalTasks;
      project.stats.completedTasks = completedTasks;

      if (typeof project.updateProgress === "function") {
        project.updateProgress();
      }

      await project.save();
    }

    // =============================
    // Update Feature Stats
    // =============================
    if (featureId) {
      const featureTasks = await Task.find({ featureId });

      const featureTotal = featureTasks.length;
      const featureCompleted = featureTasks.filter(
        (task) => task.status === "Done"
      ).length;

      const feature = await Feature.findById(featureId);

      if (feature) {
        feature.taskCount = featureTotal;
        feature.completedTaskCount = featureCompleted;

        if (typeof feature.updateProgress === "function") {
          feature.updateProgress();
        }

        // Optional auto status logic
        if (featureTotal === 0) {
          feature.status = "Planned";
        } else if (featureCompleted === featureTotal) {
          feature.status = "Completed";
        } else if (featureCompleted > 0) {
          feature.status = "In Progress";
        }

        await feature.save();
      }
    }

  } catch (error) {
    console.error("Stats sync error:", error);
  }
};