const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../src/models/User');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const updateUsers = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected.');

        console.log('Updating existing users...');
        const result = await User.updateMany(
            {
                $or: [
                    { subscriptionExpiry: { $exists: false } },
                    { gameLimit: { $exists: false } }
                ]
            },
            {
                $set: {
                    subscriptionExpiry: null,
                    gameLimit: 5
                }
            }
        );

        console.log(`Successfully updated ${result.modifiedCount} users.`);
        process.exit(0);
    } catch (error) {
        console.error('Error updating users:', error.message);
        process.exit(1);
    }
};

updateUsers();
