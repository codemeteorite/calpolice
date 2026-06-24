import os
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import urllib.request
import urllib.parse
import re

load_dotenv()

app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL = "llama-3.3-70b-versatile"


def clean_json(content):
    content = content.strip()
    if content.startswith("```"):
        parts = content.split("```")
        if len(parts) >= 3:
            content = parts[1]
            if content.startswith("json"):
                content = content[4:]
    return content.strip()

def get_real_youtube_id(exercise_name):
    query = urllib.parse.quote(exercise_name + " exercise tutorial")
    url = f"https://www.youtube.com/results?search_query={query}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req, timeout=3).read().decode('utf-8')
        match = re.search(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
        if match:
            return match.group(1)
    except Exception as e:
        print(f"YouTube search failed for {exercise_name}: {e}")
    return "vwALXgok6YI" # fallback


@app.route("/", methods=["GET"])
def index():
    import random
    topics = ["programming", "food", "animals", "space", "history", "everyday life", "technology", "sports", "music", "math", "science", "coffee", "cats", "dogs"]
    topic = random.choice(topics)
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": f"Tell me a brand new, unique, short, and funny joke about {topic}."}],
            temperature=0.9,
            max_tokens=60,
        )
        joke = response.choices[0].message.content.strip()
    except Exception as e:
        joke = "Why did the AI cross the road? To optimize the other side!"
        
    return jsonify({
        "status": "success", 
        "message": "CalPolice AI service is up and running! 🚀",
        "generatedjoke": joke
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "CalPolice AI service running 🧠"})


@app.route("/analyze", methods=["POST"])
def analyze_meal():
    """
    Accepts a natural language meal description and user profile,
    returns a structured calorie + macro breakdown with suggestions.
    """
    data = request.json or {}
    meal_description = data.get("mealDescription", "")
    user_profile = data.get("userProfile", {})

    goal = user_profile.get("goal", "maintain")
    daily_target = user_profile.get("dailyCalorieTarget", 2000)

    prompt = f"""
You are a professional nutritionist AI. Analyze the following meal description and return ONLY valid JSON.

Meal: "{meal_description}"
User Goal: {goal}
Daily Calorie Target: {daily_target} kcal

Return JSON with these exact fields:
{{
  "estimatedCalories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "fiber": <number in grams>,
  "items": [
    {{"name": "<food item>", "calories": <number>, "protein": <g>, "carbs": <g>, "fat": <g>}}
  ],
  "healthScore": <1-10>,
  "feedback": "<brief nutritional feedback>",
  "suggestions": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "isBalanced": <true/false>
}}

If you cannot identify a food item, make a reasonable estimate. Return ONLY the JSON, no extra text.
"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=800,
        )

        content = response.choices[0].message.content
        content = clean_json(content)
        result = json.loads(content)
        return jsonify(result)

    except json.JSONDecodeError:
        return jsonify({
            "estimatedCalories": 0,
            "error": "Could not parse meal",
            "rawResponse": content
        }), 422
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/suggest-foods", methods=["POST"])
def suggest_foods():
    """
    Returns AI-generated food suggestions based on goal, diet preference, and wellness context.
    """
    data = request.json or {}
    goal = data.get("goal", "maintain")
    is_veg = data.get("isVeg", True)
    recent_meals = data.get("recentMeals", [])
    wellness = data.get("wellness", {}) # { totalWaterMl: 250, stressLevel: 8 }
    
    water_intake = wellness.get("totalWaterMl", 0)
    stress_level = wellness.get("stressLevel", 0)

    diet_type = "strictly VEGETARIAN (absolutely no meat, poultry, or fish)" if is_veg else "strictly NON-VEGETARIAN (must contain meat, poultry, or fish)"
    if is_veg:
        goal_map = {
            "lose_weight": "calorie deficit, high fiber, plant-based protein (tofu, lentils, beans, no meat)",
            "gain_weight": "calorie surplus, high plant-based protein (no meat), complex carbs",
            "maintain": "balanced macros, varied vegetarian nutrients (no meat)"
        }
    else:
        goal_map = {
            "lose_weight": "calorie deficit, high fiber, lean protein (chicken, turkey, fish)",
            "gain_weight": "calorie surplus, high protein (beef, chicken, eggs), complex carbs",
            "maintain": "balanced macros, varied nutrients"
        }
    goal_desc = goal_map.get(goal, "balanced diet")

    # Add hydration context
    hydration_context = ""
    if water_intake < 1500:
        hydration_context = "The user is currently DEHYDRATED. Prioritize water-rich foods (e.g., cucumber, watermelon, soups) and include a hydration tip in the feedback."

    recent_str = ", ".join(recent_meals) if recent_meals else "None"

    prompt = f"""
You are a nutritionist AI. Suggest 6 specific foods for someone with the following profile:
- Diet: {diet_type}  
- Goal: {goal_desc}
- DO NOT SUGGEST THESE FOODS: {recent_str}
- Wellness: Today's water intake: {water_intake}ml, Stress level: {stress_level}/10.
{hydration_context}

Return ONLY valid JSON:
{{
  "suggestions": [
    {{
      "name": "<food name>",
      "calories": <per serving>,
      "protein": <grams>,
      "carbs": <grams>,
      "fat": <grams>,
      "isVeg": <true/false>,
      "reason": "<1 sentence why this is good for their goal/wellness>",
      "portionSize": "<e.g. 1 cup, 100g>"
    }}
  ],
  "wellnessAdvice": "<short 1-sentence tip based on hydration/stress>"
}}

Include a mix of breakfast, lunch, dinner and snack options. Return ONLY the JSON.
"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=900,
        )

        content = response.choices[0].message.content
        content = clean_json(content)
        result = json.loads(content)
        return jsonify(result)

    except Exception as e:
        return jsonify({"suggestions": [], "error": str(e)}), 500


@app.route("/suggest-exercises", methods=["POST"])
def suggest_exercises():
    """
    Returns AI-generated exercise suggestions based on goal and wellness context.
    """
    data = request.json or {}
    goal = data.get("goal", "maintain")
    category = data.get("category", "")
    wellness = data.get("wellness", {})
    
    stress_level = wellness.get("stressLevel", 0)
    
    goal_map = {
        "lose_weight": "high intensity interval training (HIIT) and cardio to maximize calorie burn",
        "gain_weight": "hypertrophy and strength training to build muscle mass",
        "maintain": "a balanced mix of cardio and resistance training for overall fitness"
    }
    goal_desc = goal_map.get(goal, "balanced fitness")
    
    # Add stress context
    stress_context = ""
    if stress_level >= 7:
        stress_context = f"The user has HIGH STRESS ({stress_level}/10). REGARDLESS of the category requested, suggest at least 2 low-intensity, recovery-focused movements like mobility, yoga, or deep breathing."
    
    category_instruction = f" focusing heavily on {category} exercises " if category else " providing a diverse mix across different domains (e.g. 1 cardio, 1 strength, 1 flexibility, and 1 dumbbell exercise) "
    
    recent_exercises = data.get("recentExercises", [])
    recent_str = ", ".join(recent_exercises) if recent_exercises else "None"

    prompt = f"""
You are an expert personal trainer AI. Suggest 4 specific exercises{category_instruction}for someone whose goal is to {goal_desc}.
Current Stress Level: {stress_level}/10.
- DO NOT SUGGEST THESE EXERCISES: {recent_str}
{stress_context}

Return ONLY valid JSON in this exact format:
{{
  "suggestions": [
    {{
      "name": "<Exercise Name>",
      "category": "<cardio/strength/flexibility>",
      "description": "<1 short sentence describing the exercise>",
      "duration": "<e.g. 15, 30> (must be a number string representing minutes)",
      "caloriesBurnedPerHour": <number, e.g. 400>,
      "suggestedSets": <e.g. 3>,
      "suggestedReps": "<e.g. 10-12>",
      "restBetweenSets": "<e.g. 60s>",
      "difficulty": "<beginner/intermediate/advanced>",
      "youtubeVideoId": "<a REAL youtube video ID related to this exercise, e.g. 'vwALXgok6YI' for pushups>",
      "context": "<briefly explain why this is good given their stress/energy level>"
    }}
  ]
}}

Make sure the suggestions are realistic and tailored to the goal. Use real YouTube IDs of popular fitness videos if possible. Return ONLY the JSON.
"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=900,
        )

        content = response.choices[0].message.content
        content = clean_json(content)
        result = json.loads(content)
        
        # Inject real YouTube IDs
        if "suggestions" in result:
            for ex in result["suggestions"]:
                # Fetch a real ID based on the exercise name
                ex["youtubeVideoId"] = get_real_youtube_id(ex.get("name", "workout"))

        return jsonify(result)

    except Exception as e:
        return jsonify({"suggestions": [], "error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("FLASK_PORT", 5001)))
    is_debug = os.getenv("FLASK_ENV", "development") != "production"
    print(f"[CalPolice AI] Starting on port {port} (debug={is_debug})")
    app.run(host="0.0.0.0", port=port, debug=is_debug)
