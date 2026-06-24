const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const FoodItem = require('./models/FoodItem');
const Exercise = require('./models/Exercise');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const foods = [
    // Grains - Veg
    { name: 'Brown Rice', calories: 216, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, isVeg: true, category: 'grain', portionSize: '1 cup cooked', tags: ['complex-carbs', 'fiber-rich'], suitableFor: ['maintain', 'gain_weight', 'lose_weight'] },
    { name: 'Quinoa', calories: 222, protein: 8, carbs: 39, fat: 3.5, fiber: 5, isVeg: true, category: 'grain', portionSize: '1 cup cooked', tags: ['complete-protein', 'gluten-free'], suitableFor: ['lose_weight', 'maintain', 'gain_weight'] },
    { name: 'Oats', calories: 150, protein: 5, carbs: 27, fat: 2.5, fiber: 4, isVeg: true, category: 'grain', portionSize: '1/2 cup dry', tags: ['fiber-rich', 'heart-healthy'], suitableFor: ['lose_weight', 'maintain'] },
    { name: 'Whole Wheat Chapati', calories: 120, protein: 4, carbs: 20, fat: 2, fiber: 2, isVeg: true, category: 'grain', portionSize: '1 chapati', tags: ['fiber-rich'], suitableFor: ['maintain', 'lose_weight'] },
    { name: 'Sweet Potato', calories: 103, protein: 2.3, carbs: 24, fat: 0.1, fiber: 4, isVeg: true, category: 'grain', portionSize: '1 medium', tags: ['complex-carbs', 'vitamin-a'], suitableFor: ['gain_weight', 'maintain'] },

    // Vegetables - Veg
    { name: 'Spinach', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, isVeg: true, category: 'vegetable', portionSize: '1 cup', tags: ['iron-rich', 'low-calorie'], suitableFor: ['lose_weight', 'maintain', 'gain_weight'] },
    { name: 'Broccoli', calories: 55, protein: 3.7, carbs: 11, fat: 0.6, fiber: 5.1, isVeg: true, category: 'vegetable', portionSize: '1 cup', tags: ['fiber-rich', 'vitamin-c'], suitableFor: ['lose_weight', 'maintain'] },
    { name: 'Paneer (Cottage Cheese)', calories: 265, protein: 18, carbs: 3, fat: 20, fiber: 0, isVeg: true, category: 'protein', portionSize: '100g', tags: ['high-protein', 'calcium-rich'], suitableFor: ['gain_weight', 'maintain'] },
    { name: 'Chickpeas (Chole)', calories: 269, protein: 15, carbs: 45, fat: 4.2, fiber: 12, isVeg: true, category: 'legume', portionSize: '1 cup cooked', tags: ['high-protein', 'fiber-rich'], suitableFor: ['lose_weight', 'gain_weight', 'maintain'] },
    { name: 'Dal (Lentils)', calories: 230, protein: 18, carbs: 40, fat: 0.8, fiber: 16, isVeg: true, category: 'legume', portionSize: '1 cup cooked', tags: ['high-protein', 'iron-rich'], suitableFor: ['lose_weight', 'maintain', 'gain_weight'] },
    { name: 'Tofu', calories: 144, protein: 17, carbs: 3, fat: 9, fiber: 0.3, isVeg: true, category: 'protein', portionSize: '150g', tags: ['high-protein', 'vegan'], suitableFor: ['lose_weight', 'maintain', 'gain_weight'] },

    // Fruits - Veg
    { name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, isVeg: true, category: 'fruit', portionSize: '1 medium', tags: ['potassium-rich', 'energy'], suitableFor: ['gain_weight', 'maintain'] },
    { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, isVeg: true, category: 'fruit', portionSize: '1 medium', tags: ['fiber-rich', 'low-calorie'], suitableFor: ['lose_weight', 'maintain'] },
    { name: 'Avocado', calories: 234, protein: 2.9, carbs: 12, fat: 21, fiber: 9.8, isVeg: true, category: 'fruit', portionSize: '1 medium', tags: ['healthy-fats', 'heart-healthy'], suitableFor: ['gain_weight', 'maintain'] },
    { name: 'Orange', calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, isVeg: true, category: 'fruit', portionSize: '1 medium', tags: ['vitamin-c', 'immunity'], suitableFor: ['lose_weight', 'maintain'] },

    // Dairy - Veg
    { name: 'Greek Yogurt', calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0, isVeg: true, category: 'dairy', portionSize: '170g', tags: ['high-protein', 'probiotic'], suitableFor: ['lose_weight', 'gain_weight', 'maintain'] },
    { name: 'Milk (Low Fat)', calories: 102, protein: 8, carbs: 12, fat: 2.4, fiber: 0, isVeg: true, category: 'dairy', portionSize: '1 cup', tags: ['calcium-rich', 'vitamin-d'], suitableFor: ['maintain', 'gain_weight'] },
    { name: 'Almonds', calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, isVeg: true, category: 'nuts', portionSize: '1 oz (28g)', tags: ['healthy-fats', 'vitamin-e'], suitableFor: ['gain_weight', 'maintain'] },

    // Non-Veg
    { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, isVeg: false, category: 'protein', portionSize: '100g', tags: ['high-protein', 'lean'], suitableFor: ['lose_weight', 'gain_weight', 'maintain'] },
    { name: 'Eggs', calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, isVeg: false, category: 'protein', portionSize: '2 large eggs', tags: ['complete-protein', 'vitamin-d'], suitableFor: ['lose_weight', 'gain_weight', 'maintain'] },
    { name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, isVeg: false, category: 'protein', portionSize: '100g', tags: ['omega-3', 'heart-healthy'], suitableFor: ['lose_weight', 'maintain', 'gain_weight'] },
    { name: 'Tuna (Canned)', calories: 109, protein: 25, carbs: 0, fat: 0.5, fiber: 0, isVeg: false, category: 'protein', portionSize: '100g', tags: ['high-protein', 'lean'], suitableFor: ['lose_weight', 'gain_weight', 'maintain'] },
    { name: 'Turkey Breast', calories: 135, protein: 30, carbs: 0, fat: 1, fiber: 0, isVeg: false, category: 'protein', portionSize: '100g', tags: ['lean', 'high-protein'], suitableFor: ['lose_weight', 'maintain'] },
    { name: 'Mutton (Goat)', calories: 294, protein: 25, carbs: 0, fat: 21, fiber: 0, isVeg: false, category: 'protein', portionSize: '100g', tags: ['iron-rich', 'high-protein'], suitableFor: ['gain_weight', 'maintain'] },
    { name: 'Prawn/Shrimp', calories: 99, protein: 24, carbs: 0.9, fat: 0.3, fiber: 0, isVeg: false, category: 'protein', portionSize: '100g', tags: ['lean', 'iodine-rich'], suitableFor: ['lose_weight', 'maintain'] },
];

const exercises = [
    // Cardio - Lose Weight
    { name: 'Jump Rope HIIT', category: 'hiit', caloriesBurnedPerHour: 700, difficulty: 'intermediate', youtubeVideoId: 'EvFjNz_ai8g', description: 'High-intensity jump rope workout to torch calories fast.', duration: '20 minutes', targetGoals: ['lose_weight', 'maintain'], muscleGroups: ['full body', 'calves', 'core'], suggestedSets: 5, suggestedReps: '1 min', restBetweenSets: '30s' },
    { name: 'Running (Moderate Pace)', category: 'cardio', caloriesBurnedPerHour: 600, difficulty: 'beginner', youtubeVideoId: 'kVnyY17VS9Y', description: 'Steady-state running for fat burn and cardiovascular health.', duration: '30 minutes', targetGoals: ['lose_weight', 'maintain'], muscleGroups: ['legs', 'core', 'glutes'], suggestedSets: 1, suggestedReps: '30 mins', restBetweenSets: 'N/A' },
    { name: 'Cycling', category: 'cardio', caloriesBurnedPerHour: 500, difficulty: 'beginner', youtubeVideoId: '2TikSCNBoSo', description: 'Low-impact cycling workout for endurance and fat loss.', duration: '45 minutes', targetGoals: ['lose_weight', 'maintain'], muscleGroups: ['legs', 'glutes', 'core'], suggestedSets: 1, suggestedReps: '45 mins', restBetweenSets: 'N/A' },
    { name: 'HIIT Cardio Blast', category: 'hiit', caloriesBurnedPerHour: 800, difficulty: 'advanced', youtubeVideoId: 'ml6cT4AZdqI', description: 'Maximum calorie burn with alternating high/low intensity bursts.', duration: '20 minutes', targetGoals: ['lose_weight'], muscleGroups: ['full body'], suggestedSets: 4, suggestedReps: '45s/15s rest', restBetweenSets: '60s' },
    { name: 'Swimming', category: 'cardio', caloriesBurnedPerHour: 550, difficulty: 'intermediate', youtubeVideoId: 'pKr4QGw3Q9Y', description: 'Full body low-impact cardio for fat loss and toning.', duration: '40 minutes', targetGoals: ['lose_weight', 'maintain'], muscleGroups: ['full body'], suggestedSets: 1, suggestedReps: '40 mins', restBetweenSets: 'N/A' },
    { name: 'Brisk Walking', category: 'cardio', caloriesBurnedPerHour: 300, difficulty: 'beginner', youtubeVideoId: 'njeZ29umqVE', description: 'Easy daily cardio excellent for beginners and heart health.', duration: '45 minutes', targetGoals: ['lose_weight', 'maintain'], muscleGroups: ['legs', 'core'], suggestedSets: 1, suggestedReps: '45 mins', restBetweenSets: 'N/A' },

    // Strength - Gain Weight / Muscle
    { name: 'Push-Ups (Progressive)', category: 'strength', caloriesBurnedPerHour: 300, difficulty: 'beginner', youtubeVideoId: '0pkjOk0EiAk', description: 'Classic upper body strength builder for chest, shoulders and triceps.', duration: '20 minutes', targetGoals: ['gain_weight', 'maintain'], muscleGroups: ['chest', 'shoulders', 'triceps'], suggestedSets: 4, suggestedReps: '10-15', restBetweenSets: '60s' },
    { name: 'Pull-Ups & Chin-Ups', category: 'strength', caloriesBurnedPerHour: 350, difficulty: 'intermediate', youtubeVideoId: 'eGo4IYlbE5g', description: 'Build a wide back and strong biceps with bodyweight pulling.', duration: '20 minutes', targetGoals: ['gain_weight', 'maintain'], muscleGroups: ['back', 'biceps', 'core'], suggestedSets: 3, suggestedReps: '8-12', restBetweenSets: '90s' },
    { name: 'Dumbbell Workout (Full Body)', category: 'strength', caloriesBurnedPerHour: 400, difficulty: 'intermediate', youtubeVideoId: 'ixkQvs4MEiQ', description: 'Complete dumbbell routine for muscle gain and strength.', duration: '45 minutes', targetGoals: ['gain_weight', 'maintain'], muscleGroups: ['full body'], suggestedSets: 4, suggestedReps: '10-12', restBetweenSets: '60s' },
    { name: 'Squats & Lunges', category: 'strength', caloriesBurnedPerHour: 380, difficulty: 'beginner', youtubeVideoId: 'm0M44KqDqEk', description: 'Lower body power moves for strong glutes, quads and hamstrings.', duration: '30 minutes', targetGoals: ['gain_weight', 'maintain', 'lose_weight'], muscleGroups: ['legs', 'glutes'], suggestedSets: 4, suggestedReps: '12-15', restBetweenSets: '60s' },
    { name: 'Deadlift Tutorial', category: 'strength', caloriesBurnedPerHour: 420, difficulty: 'intermediate', youtubeVideoId: 'op9kVnSso6Q', description: 'The king of all lifts - master the deadlift for total body strength.', duration: '30 minutes', targetGoals: ['gain_weight'], muscleGroups: ['back', 'hamstrings', 'glutes', 'core'], suggestedSets: 3, suggestedReps: '5-8', restBetweenSets: '120s' },

    // Yoga - Maintain/Flexibility
    { name: 'Morning Yoga Flow', category: 'yoga', caloriesBurnedPerHour: 180, difficulty: 'beginner', youtubeVideoId: 'v7AYKMP6rOE', description: 'Energizing morning yoga to improve flexibility and mental clarity.', duration: '20 minutes', targetGoals: ['maintain', 'lose_weight'], muscleGroups: ['full body', 'core'], suggestedSets: 1, suggestedReps: 'Flow', restBetweenSets: 'None' },
    { name: 'Power Yoga for Weight Loss', category: 'yoga', caloriesBurnedPerHour: 300, difficulty: 'intermediate', youtubeVideoId: 'yS8AKMiEqHo', description: 'Intense yoga flow that burns calories while improving strength.', duration: '30 minutes', targetGoals: ['lose_weight', 'maintain'], muscleGroups: ['core', 'full body'], suggestedSets: 1, suggestedReps: 'Flow', restBetweenSets: 'None' },
    { name: 'Yoga for Muscle Gain', category: 'yoga', caloriesBurnedPerHour: 240, difficulty: 'intermediate', youtubeVideoId: 'oBu-pQG6sTY', description: 'Build muscle naturally with this strength-focused yoga session.', duration: '40 minutes', targetGoals: ['gain_weight', 'maintain'], muscleGroups: ['core', 'arms', 'back'], suggestedSets: 1, suggestedReps: 'Hold', restBetweenSets: '30s' },

    // Core
    { name: 'Core Crusher Abs Workout', category: 'strength', caloriesBurnedPerHour: 340, difficulty: 'intermediate', youtubeVideoId: 'AnYl6Nk9GOA', description: 'Intense core training to build six-pack abs and stronger posture.', duration: '15 minutes', targetGoals: ['lose_weight', 'maintain', 'gain_weight'], muscleGroups: ['abs', 'obliques', 'lower back'], suggestedSets: 3, suggestedReps: '15-20', restBetweenSets: '45s' },
    { name: 'Pilates for Beginners', category: 'flexibility', caloriesBurnedPerHour: 220, difficulty: 'beginner', youtubeVideoId: 'RqcOCBb4arc', description: 'Core-centric low-impact workout to tone and align the body.', duration: '30 minutes', targetGoals: ['maintain', 'lose_weight'], muscleGroups: ['core', 'glutes', 'back'], suggestedSets: 1, suggestedReps: 'Flow', restBetweenSets: 'None' },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        await FoodItem.deleteMany({});
        await Exercise.deleteMany({});
        await User.deleteMany({});

        await FoodItem.insertMany(foods);
        console.log(`✅ Seeded ${foods.length} food items`);

        await Exercise.insertMany(exercises);
        console.log(`✅ Seeded ${exercises.length} exercises`);

        const hashedPassword = await bcrypt.hash('password123', 10);
        const demoUser = new User({
            name: 'Demo User',
            email: 'demo@calpolice.com',
            password: hashedPassword,
            age: 25,
            height: 175,
            weight: 70,
            gender: 'male',
            goal: 'maintain',
            activityLevel: 'moderate',
            dietPreference: 'both'
        });
        await demoUser.save();
        console.log('✅ Seeded demo user: demo@calpolice.com / password123');

        console.log('\n🎉 Database seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err.message);
        process.exit(1);
    }
}

seed();
