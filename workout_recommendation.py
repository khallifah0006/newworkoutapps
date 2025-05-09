import argparse
import numpy as np
import pandas as pd
import tensorflow as tf
import json
import sys
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler, OneHotEncoder
from collections import Counter
import warnings
warnings.filterwarnings('ignore')

# Parse command line arguments
parser = argparse.ArgumentParser(description='Data-Driven Workout Recommendation System')
parser.add_argument('--age', type=float, required=True, help='Age in years')
parser.add_argument('--height', type=float, required=True, help='Height in cm')
parser.add_argument('--weight', type=float, required=True, help='Weight in kg')
parser.add_argument('--csv', type=str, default='data_workout_final.csv', help='Path to workout data CSV')
args = parser.parse_args()

# Assign variables from command line arguments
umur = args.age
tinggi = args.height
berat = args.weight
csv_path = args.csv

# Calculate BMI and determine category
def calculate_bmi_category(weight, height):
    # Height in meters, weight in kg
    height_m = height / 100
    bmi = weight / (height_m ** 2)
    
    if bmi < 18.5:
        return "Kurus", bmi
    elif bmi < 25:
        return "Normal", bmi
    elif bmi < 30:
        return "Overweight", bmi
    else:
        return "Obesitas", bmi

# Load and preprocess the dataset
def load_and_preprocess_data(filepath):
    try:
        df = pd.read_csv(filepath)
        
        # Calculate BMI if not already present
        if 'BMI' not in df.columns:
            df['BMI'] = df['Berat Badan (kg)'] / ((df['Tinggi Badan (cm)'] / 100) ** 2)
        
        return df
    except Exception as e:
        print(f"Error loading data: {e}")
        return None

# Extract workout patterns from the dataset based on BMI category and age category
def extract_workout_patterns(df):
    # Create a dictionary to store workout patterns by BMI and age categories
    workout_patterns = {}
    
    # Get unique combinations of BMI and age categories
    categories = df[['Kategori BMI', 'Kategori Usia']].drop_duplicates()
    
    for _, row in categories.iterrows():
        bmi_cat = row['Kategori BMI']
        age_cat = row['Kategori Usia']
        
        # Filter data for this combination
        filtered_df = df[(df['Kategori BMI'] == bmi_cat) & 
                         (df['Kategori Usia'] == age_cat)]
        
        # Get workout patterns (frequency of each workout type)
        workouts = []
        for i in range(1, 8):  # Workout 1 to Workout 7
            col = f'Workout {i}'
            if col in filtered_df.columns:
                workouts.extend(filtered_df[col].dropna().tolist())
        
        # Count frequency of each workout
        workout_count = Counter(workouts)
        total = sum(workout_count.values())
        
        # Convert to probabilities
        workout_probs = {k: v/total for k, v in workout_count.items()}
        
        # Store in patterns dictionary
        key = (bmi_cat, age_cat)
        workout_patterns[key] = {
            'counts': dict(workout_count),
            'probabilities': workout_probs,
            'avg_workouts': filtered_df['Jumlah Workout'].mean()
        }
    
    return workout_patterns

# Get age category based on age
def get_age_category(age):
    if age < 25:
        return "Muda"
    elif age < 45:
        return "Dewasa"
    else:
        return "Tua"

# Recommend workouts based on BMI category, age category, and data patterns
def recommend_workouts_from_data(bmi_category, age_category, workout_patterns, workout_db):
    # Get the pattern for this combination if available
    key = (bmi_category, age_category)
    
    if key in workout_patterns:
        pattern = workout_patterns[key]
        recommended_count = round(pattern['avg_workouts'])
        
        # Get the most common workouts from the data
        common_workouts = sorted(pattern['counts'].items(), 
                                key=lambda x: x[1], 
                                reverse=True)
        
        # Convert workout names to full workout objects from the database
        recommended_workouts = []
        for workout_name, _ in common_workouts:
            # Find workout in database
            found = False
            for category, subcats in workout_db.items():
                for subcat, workout_list in subcats.items():
                    for workout in workout_list:
                        if workout["name"] == workout_name:
                            recommended_workouts.append(workout)
                            found = True
                            break
                    if found:
                        break
                if found:
                    break
            
            # If we have enough workouts, stop
            if len(recommended_workouts) >= recommended_count:
                break
        
        # If we didn't find enough workouts in the database, 
        # use fallback recommendation logic
        if len(recommended_workouts) < recommended_count:
            fallback = recommend_workouts_fallback(bmi_category, workout_db, umur)
            
            # Add missing workouts from fallback
            missing = recommended_count - len(recommended_workouts)
            for workout in fallback["endurance_workouts"] + fallback["strength_workouts"]:
                if workout not in recommended_workouts:
                    recommended_workouts.append(workout)
                    missing -= 1
                    if missing <= 0:
                        break
        
        # Split into endurance and strength
        endurance_workouts = [w for w in recommended_workouts if w.get('jenis') == 'endurance']
        strength_workouts = [w for w in recommended_workouts if w.get('jenis') == 'strength']
        
        # Fill in if either category is empty
        if not endurance_workouts:
            fallback = recommend_workouts_fallback(bmi_category, workout_db, umur)
            endurance_workouts = fallback["endurance_workouts"]
        
        if not strength_workouts:
            fallback = recommend_workouts_fallback(bmi_category, workout_db, umur)
            strength_workouts = fallback["strength_workouts"]
        
        return {
            "endurance_workouts": endurance_workouts[:3],
            "strength_workouts": strength_workouts[:3],
            "data_driven": True
        }
    else:
        # Fallback to rule-based approach
        return recommend_workouts_fallback(bmi_category, workout_db, umur)

# Original rule-based fallback function
def recommend_workouts_fallback(bmi_category, workout_db, age):
    endurance_recs = []
    strength_recs = []
    
    # First pass: Select appropriate workouts based on BMI category
    if bmi_category == "Kurus":
        # For underweight: Focus on strength building with moderate cardio
        strength_difficulty = ["Easy", "Medium"]
        endurance_difficulty = ["Easy"]
        
        # Must include specific workouts
        target_strength = ["Push-up", "Squat", "Dips", "Pull-ups"]
        target_endurance = ["Jogging", "Berenang"]
        
    elif bmi_category == "Normal":
        # For normal BMI: Balanced approach with medium difficulty
        strength_difficulty = ["Medium", "Hard"]
        endurance_difficulty = ["Medium", "Hard"]
        
        # Must include specific workouts
        target_strength = ["Push-up", "Squat", "Dips", "Pull-ups"]
        target_endurance = ["Jogging", "Bersepeda", "Berenang"]
        
    elif bmi_category == "Overweight":
        # For overweight: Mix of strength and higher cardio
        strength_difficulty = ["Medium"]
        endurance_difficulty = ["Medium", "Hard"]
        
        # Must include specific workouts
        target_strength = ["Push-up", "Squat"]
        target_endurance = ["Jogging", "Berenang", "Bersepeda"]
        
    else:  # Obesitas
        # For obesity: Focus on manageable exercises
        strength_difficulty = ["Easy"]
        endurance_difficulty = ["Easy", "Medium"]
        
        # Must include specific workouts with assistance
        target_strength = ["Assisted", "Wall"]
        target_endurance = ["Jogging", "Berenang", "Brisk Walking"]
    
    # Age-based adjustments
    if age > 45:
        # For older adults: Lower intensity, focus on joint-friendly exercises
        strength_difficulty = ["Easy"]
        if "Hard" in endurance_difficulty:
            endurance_difficulty.remove("Hard")
        
        # Add low-impact options
        target_endurance.extend(["Brisk Walking", "Berenang"])
    
    # First, try to find the specific target workouts
    for category, workouts in workout_db.items():
        for subcat, workout_list in workouts.items():
            for workout in workout_list:
                # Check if it's a target workout
                if category == "strength":
                    # Check if any target workout name is in the workout name
                    if any(target in workout["name"] for target in target_strength) and workout["kesulitan"] in strength_difficulty:
                        strength_recs.append(workout)
                        
                elif category == "endurance":
                    if any(target in workout["name"] for target in target_endurance) and workout["kesulitan"] in endurance_difficulty:
                        endurance_recs.append(workout)
    
    # If we don't have enough recommendations, add more from the appropriate difficulty
    if len(strength_recs) < 3:
        for subcat, workout_list in workout_db["strength"].items():
            for workout in workout_list:
                if workout["kesulitan"] in strength_difficulty and workout not in strength_recs:
                    strength_recs.append(workout)
                    if len(strength_recs) >= 3:
                        break
            if len(strength_recs) >= 3:
                break
    
    if len(endurance_recs) < 3:
        for subcat, workout_list in workout_db["endurance"].items():
            for workout in workout_list:
                if workout["kesulitan"] in endurance_difficulty and workout not in endurance_recs:
                    endurance_recs.append(workout)
                    if len(endurance_recs) >= 3:
                        break
            if len(endurance_recs) >= 3:
                break
    
    return {
        "endurance_workouts": endurance_recs[:3],  
        "strength_workouts": strength_recs[:3],
        "data_driven": False
    }

# Function to import workout database
def import_workout_db(file_path):
    try:
        with open(file_path, 'r') as file:
            content = file.read()
            # Extract the dictionary part of the Python file
            start_idx = content.find('workout_db = {')
            if start_idx == -1:
                raise ValueError("Could not find workout_db in the file")
            
            # Extract the dictionary part
            content = content[start_idx + len('workout_db = '):]
            
            # Parse the dictionary
            workout_db = eval(content)
            
            return workout_db
    except Exception as e:
        # Create a basic workout db with entries that match the CSV data
        return {
            "strength": {
                "upper_body": [
                    {"name": "Push-up", "description": "Basic upper body exercise", "target": "Dada, Triceps", "kesulitan": "Medium", "jenis": "strength", "subkategori": "upper_body"},
                    {"name": "Pull-ups", "description": "Upper back and biceps builder", "target": "Punggung, Biceps", "kesulitan": "Hard", "jenis": "strength", "subkategori": "upper_body"},
                    {"name": "Dips", "description": "Triceps builder", "target": "Triceps, Dada", "kesulitan": "Hard", "jenis": "strength", "subkategori": "upper_body"},
                    {"name": "Assisted push up", "description": "Modified push-up for beginners", "target": "Dada, Triceps", "kesulitan": "Easy", "jenis": "strength", "subkategori": "upper_body"},
                ],
                "lower_body": [
                    {"name": "Squat", "description": "Basic lower body exercise", "target": "Quadriceps, Glutes", "kesulitan": "Medium", "jenis": "strength", "subkategori": "lower_body"},
                    {"name": "Assisted Squats", "description": "Supported squat for beginners", "target": "Quadriceps, Glutes", "kesulitan": "Easy", "jenis": "strength", "subkategori": "lower_body"},
                    {"name": "Burpees", "description": "Full body conditioning", "target": "Full Body", "kesulitan": "Hard", "jenis": "strength", "subkategori": "full_body"},
                    {"name": "Tuck Jumps", "description": "Explosive leg exercise", "target": "Legs, Core", "kesulitan": "Hard", "jenis": "strength", "subkategori": "lower_body"},
                    {"name": "Plank", "description": "Core stabilizer", "target": "Core", "kesulitan": "Medium", "jenis": "strength", "subkategori": "core"}
                ]
            },
            "endurance": {
                "cardio": [
                    {"name": "Jogging", "description": "Basic cardio workout", "target": "Kardiovaskular", "kesulitan": "Medium", "jenis": "endurance", "subkategori": "cardio"},
                    {"name": "Berenang", "description": "Full body cardio", "target": "Kardiovaskular, Full Body", "kesulitan": "Medium", "jenis": "endurance", "subkategori": "cardio"},
                    {"name": "Bersepeda", "description": "Lower impact cardio", "target": "Kardiovaskular, Legs", "kesulitan": "Medium", "jenis": "endurance", "subkategori": "cardio"},
                    {"name": "Brisk Walking", "description": "Low impact cardio", "target": "Kardiovaskular", "kesulitan": "Easy", "jenis": "endurance", "subkategori": "cardio"}
                ]
            }
        }

# Determine difficulty level based on BMI and age
def get_difficulty_level(bmi_category, age):
    if bmi_category == "Obesitas" or age >= 60:
        return "Easy"
    elif bmi_category == "Overweight" or age >= 45:
        return "Medium"
    elif bmi_category == "Normal":
        return "Medium to Hard"
    else:  # Kurus
        return "Easy to Medium"

# Generate summary text with more data-driven insights
def generate_summary(bmi_category, age_category, difficulty_level, workout_patterns):
    summary = f"<p>Berdasarkan BMI Anda yang termasuk kategori <strong>{bmi_category}</strong> "
    summary += f"dan kategori usia <strong>{age_category}</strong>, "
    
    # Add data-driven insights if available
    key = (bmi_category, age_category)
    if key in workout_patterns:
        avg_workouts = workout_patterns[key]['avg_workouts']
        summary += f"rata-rata orang dengan profil seperti Anda melakukan <strong>{avg_workouts:.1f}</strong> jenis latihan. "
        
        # Get top 3 most common workouts
        top_workouts = sorted(workout_patterns[key]['counts'].items(), 
                            key=lambda x: x[1], 
                            reverse=True)[:3]
        
        summary += f"Latihan paling populer untuk profil ini adalah: "
        summary += ", ".join([f"<strong>{w[0]}</strong>" for w in top_workouts]) + ". "
    
    # Add general advice based on BMI category
    if bmi_category == "Kurus":
        summary += "Anda disarankan untuk fokus pada latihan yang dapat membantu membangun massa otot "
        summary += "dan meningkatkan kekuatan tubuh. Kombinasikan dengan asupan kalori yang cukup."
    elif bmi_category == "Normal":
        summary += "Anda disarankan untuk menjaga keseimbangan antara latihan kekuatan dan kardio "
        summary += "untuk mempertahankan kondisi tubuh yang sehat."
    elif bmi_category == "Overweight":
        summary += "Anda disarankan untuk fokus pada latihan kardio dengan intensitas sedang hingga tinggi "
        summary += "dikombinasikan dengan latihan kekuatan untuk membantu menurunkan berat badan."
    else:  # Obesitas
        summary += "Anda disarankan untuk memulai dengan latihan intensitas rendah yang aman bagi sendi, "
        summary += "secara bertahap meningkatkan intensitas seiring peningkatan kebugaran Anda."
    
    summary += f"</p><p>Tingkat kesulitan yang direkomendasikan: <strong>{difficulty_level}</strong>.</p>"
    return summary

# Main function
try:
    # Calculate BMI
    bmi_category, bmi_value = calculate_bmi_category(berat, tinggi)
    
    # Get age category 
    age_category = get_age_category(umur)
    
    # Load CSV data
    df = load_and_preprocess_data(csv_path)
    
    if df is not None:
        # Extract workout patterns from the data
        workout_patterns = extract_workout_patterns(df)
        data_available = True
    else:
        workout_patterns = {}
        data_available = False
        print("Warning: Could not load CSV data. Using rule-based recommendations only.")
    
    # Import workout database
    workout_db = import_workout_db('workouts_data.py')
    
    # Get difficulty level
    difficulty_level = get_difficulty_level(bmi_category, umur)
    
    # Generate summary
    summary = generate_summary(bmi_category, age_category, difficulty_level, workout_patterns)
    
    # Get workout recommendations
    if data_available:
        workout_recommendations = recommend_workouts_from_data(bmi_category, age_category, workout_patterns, workout_db)
    else:
        workout_recommendations = recommend_workouts_fallback(bmi_category, workout_db, umur)
    
    # Prepare response
    response = {
        "bmi": bmi_value,
        "bmi_category": bmi_category,
        "age_category": age_category,
        "difficulty_level": difficulty_level,
        "summary": summary,
        "endurance_workouts": workout_recommendations["endurance_workouts"],
        "strength_workouts": workout_recommendations["strength_workouts"],
        "data_driven": workout_recommendations.get("data_driven", False)
    }
    
    # Print JSON response for server
    print(json.dumps(response))
    
except Exception as e:
    error_response = {
        "error": str(e)
    }
    print(json.dumps(error_response))
    sys.exit(1)