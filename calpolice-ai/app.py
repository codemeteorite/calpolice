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

FALLBACK_JOKES = [
    "Why did the coffee file a complaint? It was feeling brewed up.",
    "I told my fitness tracker I was tired. It said, 'That's a step in the right direction.'",
    "My scale and I had a disagreement. It said I was too heavy, I said I was just well-rounded.",
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "I tried to eat healthy at the gym. It was a bit of a protein mismatch.",
    "The smoothie and I broke up. It said I was too much to blend with.",
    "My water bottle told me to stay hydrated. I said, 'I’m trying, it’s a lot of pressure.'",
    "I signed up for a marathon of naps. I think I’m in the recovery phase.",
    "My fridge said I need more greens. I told it, 'I’m trying, but the snacks keep filing a report.'",
]


def clean_json(content):
    if content is None:
        return ""
    content = str(content).strip()
    content = re.sub(r"^```(?:json)?\s*", "", content, flags=re.IGNORECASE)
    content = re.sub(r"\s*```$", "", content, flags=re.IGNORECASE)
    if content.startswith("json"):
        content = content[4:].lstrip()

    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1 and end > start:
        content = content[start:end + 1]
    return content.strip()


def fallback_food_suggestions(goal, is_veg):
    goal_key = goal.lower()
    if is_veg:
        suggestions = [
            {"name": "Greek Yogurt Berry Bowl", "calories": 280, "protein": 22, "carbs": 28, "fat": 7, "isVeg": True, "reason": "High-protein and fiber-rich for satiety and steady energy.", "portionSize": "1 bowl"},
            {"name": "Lentil Quinoa Salad", "calories": 350, "protein": 18, "carbs": 38, "fat": 10, "isVeg": True, "reason": "Plant protein plus complex carbs help support a balanced calorie target.", "portionSize": "1 large bowl"},
            {"name": "Tofu Veggie Stir-Fry", "calories": 420, "protein": 25, "carbs": 32, "fat": 16, "isVeg": True, "reason": "Lean protein and vegetables support fullness without excess heaviness.", "portionSize": "1 plate"},
            {"name": "Chickpea Oatmeal Bowl", "calories": 310, "protein": 16, "carbs": 36, "fat": 8, "isVeg": True, "reason": "Good fiber and carb balance for steady energy and recovery.", "portionSize": "1 bowl"},
            {"name": "Avocado Egg Toast", "calories": 340, "protein": 20, "carbs": 24, "fat": 14, "isVeg": True, "reason": "A satisfying option with healthy fats and a solid protein base.", "portionSize": "2 slices"},
            {"name": "Cottage Cheese Fruit Plate", "calories": 260, "protein": 24, "carbs": 20, "fat": 6, "isVeg": True, "reason": "Portable, high-protein, and easy to fit into a calorie-controlled day.", "portionSize": "1 serving"},
        ]
    else:
        suggestions = [
            {"name": "Chicken Rice Bowl", "calories": 420, "protein": 35, "carbs": 40, "fat": 10, "isVeg": False, "reason": "Lean protein and slow-digesting carbs make it ideal for appetite control.", "portionSize": "1 bowl"},
            {"name": "Salmon Quinoa Plate", "calories": 480, "protein": 33, "carbs": 30, "fat": 22, "isVeg": False, "reason": "Balanced macros with healthy fats helps support satiety and recovery.", "portionSize": "1 plate"},
            {"name": "Turkey Veggie Wrap", "calories": 370, "protein": 28, "carbs": 30, "fat": 11, "isVeg": False, "reason": "High protein and easy portion control for a busy day.", "portionSize": "1 wrap"},
            {"name": "Lean Beef Stir-Fry", "calories": 460, "protein": 32, "carbs": 28, "fat": 18, "isVeg": False, "reason": "Protein-dense and filling while still being nutrient balanced.", "portionSize": "1 serving"},
            {"name": "Egg and Oatmeal Combo", "calories": 340, "protein": 22, "carbs": 32, "fat": 12, "isVeg": False, "reason": "Simple, steady energy with a strong protein base.", "portionSize": "1 meal"},
            {"name": "Greek Yogurt Protein Snack", "calories": 260, "protein": 24, "carbs": 18, "fat": 6, "isVeg": False, "reason": "Low-effort, high-protein option that supports muscle recovery.", "portionSize": "1 serving"},
        ]

    if "lose" in goal_key:
        for item in suggestions:
            item["reason"] = "Supports a calorie deficit while keeping protein high and meals satisfying."
    elif "gain" in goal_key:
        for item in suggestions:
            item["reason"] = "Higher-calorie but still balanced for lean muscle and energy support."
    else:
        for item in suggestions:
            item["reason"] = "A balanced choice for steady energy and consistent nutrition."

    return {
        "suggestions": suggestions,
        "wellnessAdvice": "Keep water intake steady and aim for a balanced plate with protein, fiber, and a colorful vegetable source."
    }


def fallback_exercise_suggestions(goal, category):
    goal_key = goal.lower()
    base = [
        {"name": "Brisk Walking", "category": "cardio", "description": "A simple low-impact cardio session that improves heart health and burns calories.", "duration": "20", "caloriesBurnedPerHour": 280, "suggestedSets": 1, "suggestedReps": "20-30 min", "restBetweenSets": "0s", "difficulty": "beginner", "context": "Great for sustainable energy and stress reduction.", "youtubeVideoId": "dQw4w9WgXcQ"},
        {"name": "Bodyweight Squats", "category": "strength", "description": "Strengthens legs and glutes while building practical lower-body power.", "duration": "15", "caloriesBurnedPerHour": 320, "suggestedSets": 3, "suggestedReps": "12-15", "restBetweenSets": "45s", "difficulty": "beginner", "context": "Solid option for improving strength without high strain.", "youtubeVideoId": "vwALXgok6YI"},
        {"name": "Yoga Flow", "category": "flexibility", "description": "Helps improve mobility, balance, and recovery after other exercise sessions.", "duration": "15", "caloriesBurnedPerHour": 180, "suggestedSets": 1, "suggestedReps": "15 min", "restBetweenSets": "0s", "difficulty": "beginner", "context": "Useful if stress is elevated and you need recovery-focused movement.", "youtubeVideoId": "v7AYKMP6rOE"},
        {"name": "Dumbbell Press", "category": "strength", "description": "Builds upper-body strength and muscle control for overall fitness.", "duration": "15", "caloriesBurnedPerHour": 350, "suggestedSets": 3, "suggestedReps": "8-12", "restBetweenSets": "60s", "difficulty": "intermediate", "context": "Good for increasing strength while staying within a manageable workload.", "youtubeVideoId": "XnP71QhJw6s"},
    ]

    if category and category != 'all':
        for item in base:
            item['category'] = category

    if "lose" in goal_key:
        for item in base:
            item['context'] = "Supports calorie burn and consistency without overloading the body."
    elif "gain" in goal_key:
        for item in base:
            item['context'] = "Helps drive training quality and progressive strength while supporting muscle gain."
    else:
        for item in base:
            item['context'] = "Keeps the plan balanced across cardio, strength, and recovery."

    return {"suggestions": base[:4]}


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
    import uuid

    topics = ["programming", "food", "animals", "space", "history", "everyday life", "technology", "sports", "music", "math", "science", "coffee", "cats", "dogs"]
    tones = ["clean and punchy", "sarcastic", "playful", "quick one-liner", "absurd but clever"]
    topic = random.choice(topics)
    tone = random.choice(tones)
    unique_seed = uuid.uuid4().hex[:8]

    prompt = (
        f"Create one fresh, original, short joke about {topic}. "
        f"Make it {tone}, highly readable, and different from common internet jokes. "
        f"Use unique seed {unique_seed} to ensure it feels new. Return only the joke text."
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=1.1,
            max_tokens=80,
        )
        joke = response.choices[0].message.content.strip()
        joke = re.sub(r"^\s*(Here(?:'s| is)|Sure|Absolutely)\s*[:\-]?\s*", "", joke, flags=re.IGNORECASE)
        if len(joke) < 12:
            raise ValueError("Joke too short")
    except Exception:
        joke = random.choice(FALLBACK_JOKES)

    return jsonify({
        "status": "success",
        "message": "CalPolice AI service is up and running! 🚀",
        "generatedjoke": joke,
        "topic": topic,
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
        if not content:
            raise ValueError("Empty AI response")
        result = json.loads(content)
        return jsonify(result)

    except Exception as e:
        print("[AI ANALYZE ERROR]", str(e), "RAW:", content if 'content' in locals() else "<none>")
        return jsonify({
            "estimatedCalories": 0,
            "error": "Could not parse meal",
            "feedback": "A fallback estimate was used because the AI response was malformed.",
            "suggestions": ["Try a simpler meal description like '2 eggs, toast, and a banana'."]
        }), 422


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
        cleaned = clean_json(content)
        if not cleaned:
            raise ValueError("Empty suggestion response")

        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            cleaned = re.sub(r"^[^\{]*", "", cleaned)
            cleaned = re.sub(r"[^\}\]]+$", "", cleaned)
            result = json.loads(cleaned)

        if "suggestions" not in result or not isinstance(result.get("suggestions"), list):
            raise ValueError("Response missing suggestions list")

        return jsonify(result)

    except Exception as e:
        print("[AI SUGGEST FOOD ERROR]", str(e), "RAW:", content if 'content' in locals() else "<none>")
        return jsonify(fallback_food_suggestions(goal, is_veg)), 200


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
        cleaned = clean_json(content)
        if not cleaned:
            raise ValueError("Empty exercise response")

        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            cleaned = re.sub(r"^[^\{]*", "", cleaned)
            cleaned = re.sub(r"[^\}\]]+$", "", cleaned)
            result = json.loads(cleaned)

        if "suggestions" not in result or not isinstance(result.get("suggestions"), list):
            raise ValueError("Response missing suggestions list")

        for ex in result["suggestions"]:
            ex["youtubeVideoId"] = get_real_youtube_id(ex.get("name", "workout"))

        return jsonify(result)

    except Exception as e:
        print("[AI SUGGEST EXERCISES ERROR]", str(e), "RAW:", content if 'content' in locals() else "<none>")
        return jsonify(fallback_exercise_suggestions(goal, category)), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("FLASK_PORT", 5001)))
    is_debug = os.getenv("FLASK_ENV", "development") != "production"
    print(f"[CalPolice AI] Starting on port {port} (debug={is_debug})")
    app.run(host="0.0.0.0", port=port, debug=is_debug)
