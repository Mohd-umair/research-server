const mongoose = require('mongoose');
const TeacherProfile = require('./src/Modules/TeacherProfile/teacherProfileModel');
require('dotenv').config();

async function fixProfileStatuses() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all profiles
    const profiles = await TeacherProfile.find({ isDeleted: false });
    console.log(`Found ${profiles.length} profiles to check`);

    let fixedCount = 0;

    for (const profile of profiles) {
      const oldStatus = profile.profileStatus;
      const oldCompletion = profile.completionPercentage;
      
      // Calculate completion percentage
      profile.completionPercentage = profile.calculateCompletionPercentage();
      profile.isProfileComplete = profile.completionPercentage === 100;
      
      // Update status based on completion
      if (profile.completionPercentage === 100 && profile.profileStatus === 'incomplete') {
        profile.profileStatus = 'pending';
        profile.submittedAt = new Date();
        console.log(`Fixed profile ${profile._id}: ${oldStatus} (${oldCompletion}%) -> ${profile.profileStatus} (${profile.completionPercentage}%)`);
        fixedCount++;
      } else if (profile.completionPercentage < 100 && profile.profileStatus === 'pending') {
        profile.profileStatus = 'incomplete';
        profile.submittedAt = undefined;
        console.log(`Fixed profile ${profile._id}: ${oldStatus} (${oldCompletion}%) -> ${profile.profileStatus} (${profile.completionPercentage}%)`);
        fixedCount++;
      }
      
      // Save if status changed
      if (profile.profileStatus !== oldStatus || profile.completionPercentage !== oldCompletion) {
        await profile.save();
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} profiles with incorrect status`);
    console.log('Profile status fix completed successfully!');

  } catch (error) {
    console.error('Error fixing profile statuses:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixProfileStatuses();
