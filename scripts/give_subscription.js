const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../src/models/User');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const giveSubscription = async () => {
    const email = 'elxan.kerimov0055@gmail.com';
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected.');

        console.log(`Searching for user: ${email}...`);
        const user = await User.findOne({ email });

        if (!user) {
            console.error(`User not found: ${email}`);
            process.exit(1);
        }

        // Set subscription expiry to 15 minutes from now
        const expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + 15);

        user.subscriptionExpiry = expiryDate;
        await user.save();

        console.log(`Successfully updated subscription for ${email}.`);
        console.log(`New Expiry Date: ${expiryDate.toISOString()}`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

giveSubscription();
