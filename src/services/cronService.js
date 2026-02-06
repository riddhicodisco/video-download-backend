const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Initialize cron jobs
const initCronJobs = () => {
  console.log('⏳ Initializing cron jobs...');

  // Schedule a job to run every Sunday at midnight (0 0 * * 0)
  // Pattern: Minute Hour DayOfMonth Month DayOfWeek
  cron.schedule('0 0 * * 0', () => {
    console.log('🧹 Running weekly cleanup job for *-player-script.js files...');
    cleanupPlayerScripts();
  });

  console.log('✅ Cron jobs scheduled: Weekly cleanup (Sundays at 00:00)');
};

// Function to cleanup player scripts
const cleanupPlayerScripts = () => {
  const rootDir = path.join(__dirname, '../../'); // Assuming src/services structure
  const files = fs.readdirSync(rootDir);

  let deletedCount = 0;

  files.forEach((file) => {
    // Check if file matches the pattern *-player-script.js
    if (file.match(/.*-player-script\.js$/)) {
      const filePath = path.join(rootDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${file}`);
        deletedCount++;
      } catch (err) {
        console.error(`Error deleting ${file}:`, err.message);
      }
    }
  });

  if (deletedCount > 0) {
    console.log(`✨ Cleanup complete. Deleted ${deletedCount} files.`);
  } else {
    console.log('✨ Cleanup complete. No files matched the pattern.');
  }
};

module.exports = {
  initCronJobs,
  cleanupPlayerScripts // Exported for manual testing if needed
};
