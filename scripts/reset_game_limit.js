const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../src/models/User');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const resetGameLimit = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected.');

        console.log('Setting gameLimit to 0 for all users...');
        const result = await User.updateMany({}, { $set: { gameLimit: 0 } });

        console.log(`Successfully updated ${result.modifiedCount} users.`);
        process.exit(0);
    } catch (error) {
        console.error('Error resetting game limits:', error.message);
        process.exit(1);
    }
};

resetGameLimit();
