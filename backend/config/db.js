import mongoose from 'mongoose';

const dbConnect = () => {
    mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log("Database connection established");
    })
    .catch((error) => {
        console.log("DB Connection Failed: ", error.message);
        process.exit(1);
    })
}

export default dbConnect;